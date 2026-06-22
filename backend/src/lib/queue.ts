import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import dotenv from 'dotenv';
import { prisma, tenantStorage, bypassTenantIsolation } from './prisma';
import { evolutionApi } from './evolution';
import { parseSpintax } from './spintax';

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// Conexões Redis compartilhadas
export const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });
export const redisPublisher = new IORedis(redisUrl, { maxRetriesPerRequest: null });
export const redisSubscriber = new IORedis(redisUrl, { maxRetriesPerRequest: null });

// Registros globais de filas e workers por tenant (userId)
export const queues = new Map<string, Queue>();
export const workers = new Map<string, Worker>();

// Fila padrão para compatibilidade de tipos e fallback
export const campanhaQueue = getCampaignQueue('default');

/**
 * Obtém ou cria a fila BullMQ específica de um tenant.
 */
export function getCampaignQueue(tenantId: string): Queue {
  let queue = queues.get(tenantId);
  if (!queue) {
    const queueName = `CampanhaQueue-${tenantId}`;
    queue = new Queue(queueName, { connection });
    queues.set(tenantId, queue);
  }
  return queue;
}

// ── Helpers ──────────────────────────────────────────────────

function renderTemplate(template: string, lead: any): string {
  // Resolve Spintax antes de injetar as variáveis
  const templateWithSpintax = parseSpintax(template);
  
  return templateWithSpintax
    .replace(/\{\{nome\}\}/g, lead.nome || '')
    .replace(/\{\{cidade\}\}/g, lead.cidade || '')
    .replace(/\{\{nicho\}\}/g, lead.nicho || '')
    .replace(/\{\{site\}\}/g, lead.site || '')
    .replace(/\{\{instagram\}\}/g, lead.instagram || '')
    .replace(/\{\{telefone\}\}/g, lead.telefone || '')
    .replace(/\{\{email\}\}/g, lead.email || '');
}

function isWithinWindow(janelaInicio: string, janelaFim: string, diasSemana: number[]): boolean {
  const now = new Date();
  const currentDay = now.getDay();

  if (!diasSemana.includes(currentDay)) return false;

  const [startH, startM] = janelaInicio.split(':').map(Number);
  const [endH, endM] = janelaFim.split(':').map(Number);

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
}

function normalizePhoneForWhatsApp(phone: string): string {
  let digits = phone.replace(/\D/g, '');

  if (digits.startsWith('55') && digits.length >= 12) {
    return digits;
  }

  if (digits.length === 10 || digits.length === 11) {
    return '55' + digits;
  }

  return digits;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function randomDelay(minSec: number, maxSec: number): number {
  return (Math.floor(Math.random() * (maxSec - minSec + 1)) + minSec) * 1000;
}

// ── Worker Factory (Tenant Isolation & Fairness) ─────────────

/**
 * Cria ou retorna o Worker do BullMQ para o tenant correspondente.
 * Cada agência (tenant) tem seu próprio fluxo isolado de concorrência.
 */
export function getOrCreateCampaignWorker(tenantId: string): Worker {
  let worker = workers.get(tenantId);
  if (!worker) {
    const queueName = `CampanhaQueue-${tenantId}`;
    console.log(`[QueueManager] 🛠  Instanciando worker para fila: ${queueName}`);

    worker = new Worker(queueName, async (job) => {
      const { campanhaId } = job.data;
      console.log(`[Worker-${tenantId}] ▶ Iniciando campanha ${campanhaId}`);

      return tenantStorage.run({ userId: tenantId, isSystem: false }, async () => {
        const campanha = await prisma.campanha.findUnique({
          where: { id: campanhaId },
          include: {
            template: true,
            instancia: true,
            envios: {
              where: { status: 'Agendado' },
              include: { lead: true },
              orderBy: { criado_em: 'asc' }
            }
          }
        });

      if (!campanha) {
        console.error(`[Worker-${tenantId}] Campanha ${campanhaId} não encontrada.`);
        return;
      }

      if (campanha.status !== 'Ativa') {
        console.log(`[Worker-${tenantId}] Campanha "${campanha.nome}" não ativa (${campanha.status}). Ignorando.`);
        return;
      }

      const { instancia, template, envios } = campanha;
      console.log(`[Worker-${tenantId}] Campanha "${campanha.nome}" — ${envios.length} envios pendentes via "${instancia.nome}"`);

      if (envios.length === 0) {
        console.log(`[Worker-${tenantId}] Nenhum envio pendente. Marcando campanha como concluída.`);
        await prisma.campanha.update({
          where: { id: campanhaId },
          data: { status: 'Concluida' }
        });
        await checkAndTeardownTenant(tenantId, campanhaId);
        return;
      }

      let enviados = 0;
      let falhas = 0;

      for (const envio of envios) {
        const statusAtual = await prisma.campanha.findUnique({
          where: { id: campanhaId },
          select: { status: true }
        });

        if (!statusAtual || statusAtual.status !== 'Ativa') {
          console.log(`[Worker-${tenantId}] ⏸ Campanha pausada/cancelada durante execução. Parando.`);
          break;
        }

        if (!isWithinWindow(campanha.janela_inicio, campanha.janela_fim, campanha.dias_semana)) {
          console.log(`[Worker-${tenantId}] ⏰ Fora da janela (${campanha.janela_inicio}–${campanha.janela_fim}). Re-agendando em 5 min.`);
          const tenantQueue = getCampaignQueue(tenantId);
          await tenantQueue.add('iniciar_campanha', { campanhaId }, { delay: 5 * 60 * 1000 });
          return;
        }

        const { lead } = envio;

        // ── Pula leads que optaram por sair (Opt-out) ──
        if (lead.optOut) {
          console.log(`[Worker-${tenantId}] 🚫 Pulando lead ${lead.nome} devido a status de Opt-out.`);
          await prisma.envio.update({
            where: { id: envio.id },
            data: { status: 'Falha', erro: 'Lead configurou Opt-out (não deseja receber mensagens).' }
          });
          falhas++;
          continue;
        }

        if (!lead.telefone || lead.telefone.startsWith('SEM_FONE')) {
          await prisma.envio.update({
            where: { id: envio.id },
            data: { status: 'Falha', erro: 'Lead sem telefone válido.' }
          });
          falhas++;
          continue;
        }

        const mensagem = renderTemplate(template.conteudo, lead);
        const whatsappNumber = normalizePhoneForWhatsApp(lead.telefone);

        try {
          console.log(`[Worker-${tenantId}] 📤 Enviando para ${lead.nome} (${whatsappNumber})...`);

          await evolutionApi.sendText(instancia.nome, whatsappNumber, mensagem);

          await prisma.envio.update({
            where: { id: envio.id },
            data: {
              status: 'Enviado',
              conteudo_renderizado: mensagem,
              enviado_em: new Date()
            }
          });

          await prisma.interacao.create({
            data: {
              lead_id: lead.id,
              tipo: 'enviado',
              conteudo: mensagem
            }
          });

          if (lead.status === 'Novo') {
            await prisma.lead.update({
              where: { id: lead.id },
              data: { status: 'Contatado' }
            });
          }

          // Incrementa disparos_mes para controle de plano do usuário associado
          if (campanha.userId) {
            await prisma.usuario.update({
              where: { id: campanha.userId },
              data: { disparos_mes: { increment: 1 } }
            }).catch(() => {});
          } else {
            await prisma.usuario.updateMany({
              data: { disparos_mes: { increment: 1 } }
            }).catch(() => {});
          }

          enviados++;
          console.log(`[Worker-${tenantId}] ✅ Enviado com sucesso para ${lead.nome}`);
          
          const waitMs = randomDelay(campanha.delay_min, campanha.delay_max);
          console.log(`[Worker-${tenantId}] ⏳ Aguardando ${Math.round(waitMs / 1000)}s antes do próximo envio...`);
          await sleep(waitMs);

        } catch (error: any) {
          console.error(`[Worker-${tenantId}] ❌ Falha ao enviar para ${lead.nome}:`, error?.message);

          await prisma.envio.update({
            where: { id: envio.id },
            data: {
              status: 'Falha',
              conteudo_renderizado: mensagem,
              erro: error?.message || 'Erro desconhecido ao enviar mensagem'
            }
          });
          falhas++;
          
          const errorWaitMs = randomDelay(1, 5);
          await sleep(errorWaitMs);
        }
      }

      // ── Verifica se a campanha foi concluída ──
      const remaining = await prisma.envio.count({
        where: { campanha_id: campanhaId, status: 'Agendado' }
      });

      if (remaining === 0) {
        await prisma.campanha.update({
          where: { id: campanhaId },
          data: { status: 'Concluida' }
        });
        console.log(`[Worker-${tenantId}] 🏁 Campanha "${campanha.nome}" concluída! ✅ ${enviados} enviados, ❌ ${falhas} falhas`);
      } else {
        console.log(`[Worker-${tenantId}] Campanha "${campanha.nome}" — ${remaining} envios restantes.`);
      }

      await checkAndTeardownTenant(tenantId, campanhaId);
      });
    }, { connection, concurrency: 1 });

    workers.set(tenantId, worker);

    worker.on('completed', (job) => {
      console.log(`[Worker-${tenantId}] Job ${job.id} finalizado`);
    });

    worker.on('failed', (job, err) => {
      console.error(`[Worker-${tenantId}] Job ${job?.id} falhou:`, err);
    });
  }

  return worker;
}

/**
 * Verifica se a fila do tenant está vazia e se não há outras campanhas ativas.
 * Caso positivo, executa o teardown para evitar vazamento de memória no Redis.
 */
async function checkAndTeardownTenant(tenantId: string, currentCampanhaId: string): Promise<void> {
  // Conta campanhas ativas remanescentes para o tenant
  const activeCampaignsCount = await prisma.campanha.count({
    where: {
      userId: tenantId,
      status: 'Ativa',
      ativo: true,
      id: { not: currentCampanhaId }
    }
  });

  if (activeCampaignsCount === 0) {
    console.log(`[QueueManager] 🧹 Iniciando teardown do tenant "${tenantId}". Nenhuma campanha ativa restante.`);
    
    // Agendamos o encerramento do worker após um pequeno delay para garantir que o job atual finalize corretamente
    setTimeout(async () => {
      try {
        const worker = workers.get(tenantId);
        if (worker) {
          await worker.close();
          workers.delete(tenantId);
          console.log(`[QueueManager] ✅ Worker para o tenant "${tenantId}" fechado.`);
        }

        const queue = queues.get(tenantId);
        if (queue) {
          // Limpa todos os metadados e jobs da fila no Redis para liberar memória
          await queue.obliterate({ force: true });
          queues.delete(tenantId);
          console.log(`[QueueManager] ✅ Fila "CampanhaQueue-${tenantId}" obliterada com sucesso do Redis.`);
        }
      } catch (err) {
        console.error(`[QueueManager] ❌ Erro ao executar teardown do tenant "${tenantId}":`, err);
      }
    }, 5000);
  }
}

// ── Inicialização de Workers e Subscriptions (Redis Pub/Sub) ─────────────

/**
 * Inicializa os workers de campanhas ativas cadastradas no banco no startup.
 */
export async function initCampaignWorkers(): Promise<void> {
  console.log('[QueueManager] 🌀 Inicializando workers de campanhas ativas...');
  try {
    const activeCampaigns = await bypassTenantIsolation(() =>
      prisma.campanha.findMany({
        where: { status: 'Ativa', ativo: true },
        select: { userId: true }
      })
    );

    const uniqueTenants = new Set(
      activeCampaigns.map(c => c.userId || 'default')
    );

    for (const tenantId of uniqueTenants) {
      getOrCreateCampaignWorker(tenantId);
    }
  } catch (error) {
    console.error('[QueueManager] Erro ao carregar campanhas ativas do banco:', error);
  }

  // Se inscreve no canal Redis para escutar a criação de novos workers sob demanda
  redisSubscriber.subscribe('campaign-workers:new', (err) => {
    if (err) {
      console.error('[QueueManager] Erro ao se inscrever no canal Pub/Sub:', err);
    } else {
      console.log('[QueueManager] 📡 Inscrito no canal Redis Pub/Sub: "campaign-workers:new"');
    }
  });

  redisSubscriber.on('message', (channel, tenantId) => {
    if (channel === 'campaign-workers:new') {
      console.log(`[QueueManager] 📢 Nova mensagem Pub/Sub! Ativando worker para o tenant: "${tenantId}"`);
      getOrCreateCampaignWorker(tenantId);
    }
  });
}

/**
 * Encerra graciosamente todos os workers ativos.
 */
export async function closeAllWorkers(): Promise<void> {
  for (const [tenantId, worker] of workers.entries()) {
    try {
      await worker.close();
      console.log(`[QueueManager] Worker do tenant "${tenantId}" encerrado.`);
    } catch (err) {
      console.error(`[QueueManager] Erro ao encerrar worker "${tenantId}":`, err);
    }
  }
  workers.clear();
  queues.clear();
}

// Inicializa no import se estiver rodando no server principal
if (process.env.NODE_ENV !== 'test') {
  initCampaignWorkers().catch(console.error);
}
export const campanhaWorker = { close: closeAllWorkers };
