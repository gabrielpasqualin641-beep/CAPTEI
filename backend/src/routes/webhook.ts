/**
 * webhook.ts — Receptor de Eventos da Evolution API
 * ─────────────────────────────────────────────────────────────────────────────
 * Responsabilidades:
 *  1. Registrar mensagens recebidas (interações)
 *  2. Atualizar status do lead no CRM (→ Respondeu)
 *  3. Cancelar envios agendados na tabela `envios` (CampanhaQueue)
 *  4. [NOVO] Pausar execuções ativas do WorkflowEngine via Redis + BullMQ
 */

import { Router } from 'express';
import { prisma, bypassTenantIsolation } from '../lib/prisma';
import { workflowQueue } from '../queues/workflow.queue';
import { connection as redis } from '../lib/queue';
import { LEAD_ACTIVE_JOBS_KEY } from '../types/workflow.types';
import { systemBypassMiddleware } from '../middleware/auth';

const router = Router();

// ─── Normaliza número de telefone para busca no banco ────────────────────────

function normalizePhoneForLookup(remoteJid: string): string {
  // Evolution API envia formato: 5511999998888@s.whatsapp.net
  const phone = remoteJid.split('@')[0];
  // Remove o dígito 9 extra para busca parcial (DDI + DDD + 8 dígitos)
  return phone.replace(/^55(\d{2})9(\d{8})$/, '55$1$2') || phone;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /webhook/evolution/:instancia
// ─────────────────────────────────────────────────────────────────────────────
router.post('/evolution/:instancia', systemBypassMiddleware, async (req, res) => {
  // Garante bypass explícito de tenant isolation (operando como serviço de sistema/webhook)
  return bypassTenantIsolation(async () => {
    try {
    const { instancia } = req.params;
    const body = req.body;

    console.log(`[Webhook] 📩 Evento recebido da instância "${instancia}": ${body.event}`);

    // ── Filtra apenas eventos de mensagens recebidas ───────────────────────
    if (body.event !== 'messages.upsert') {
      return res.json({ ok: true });
    }

    const message = body.data?.message;
    if (!message || message.fromMe) {
      return res.json({ ok: true }); // Ignora mensagens enviadas pelo bot
    }

    const remoteJid: string = body.data?.key?.remoteJid ?? '';
    const senderPhone = remoteJid.split('@')[0];
    const text: string =
      message.conversation ||
      message.extendedTextMessage?.text ||
      '[Mídia/Áudio]';

    if (!senderPhone) return res.json({ ok: true });

    // ── Localiza o lead pelo telefone ─────────────────────────────────────
    const normalizedPhone = normalizePhoneForLookup(remoteJid);

    const lead = await prisma.lead.findFirst({
      where: {
        OR: [
          { telefone: { contains: senderPhone.substring(2) } }, // sem DDI
          { telefone: { contains: normalizedPhone } },          // com DDI
        ],
      },
      select: { id: true, nome: true, status: true },
    });

    if (!lead) {
      console.log(`[Webhook] Lead não encontrado para o número ${senderPhone}. Ignorando.`);
      return res.json({ ok: true });
    }

    console.log(`[Webhook] 📞 Lead identificado: "${lead.nome}" (${lead.id})`);

    // ── Normaliza texto para verificação de Opt-out ───────────────────────
    const cleanText = text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

    const optOutTriggers = ['sair', 'pare', 'nao', 'stop', 'unsubscribe'];
    const isOptOut = optOutTriggers.includes(cleanText);

    if (isOptOut) {
      console.log(`[Webhook] 🚫 Detectado trigger de Opt-out do lead "${lead.nome}": "${text}"`);
      
      // Atualiza Lead: optOut = true, status = Perdido, insere tag 'Opt-out'
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          optOut: true,
          status: 'Perdido',
          tags: {
            push: 'Opt-out'
          }
        }
      });

      // Registra a interação recebida
      await prisma.interacao.create({
        data: {
          lead_id: lead.id,
          tipo: 'recebido',
          conteudo: text,
        },
      });

      // Cancela todos os envios de campanha agendados
      const canceledEnvios = await prisma.envio.updateMany({
        where: { lead_id: lead.id, status: 'Agendado' },
        data: {
          status: 'Cancelado',
          erro: 'Cancelado automaticamente: Lead solicitou Opt-out.',
        },
      });

      if (canceledEnvios.count > 0) {
        console.log(`[Webhook] ⏹  ${canceledEnvios.count} envio(s) cancelado(s) devido a Opt-out.`);
      }

      // Pausa e cancela execuções de workflow ativas
      await pauseWorkflowExecutions(lead.id, lead.nome);

      return res.json({ ok: true });
    }

    // ── Atualiza status do Lead → "Respondeu" (fluxo normal) ──────────────
    if (lead.status !== 'Respondeu' && lead.status !== 'Fechado') {
      await prisma.lead.update({
        where: { id: lead.id },
        data: { status: 'Respondeu' },
      });
      console.log(`[Webhook] 🔄 Status do lead "${lead.nome}" → Respondeu`);
    }

    // ── Registra a interação recebida ─────────────────────────────────────
    await prisma.interacao.create({
      data: {
        lead_id: lead.id,
        tipo: 'recebido',
        conteudo: text,
      },
    });

    // ── [1] Cancela envios agendados na CampanhaQueue (tabela `envios`) ────
    const canceledEnvios = await prisma.envio.updateMany({
      where: { lead_id: lead.id, status: 'Agendado' },
      data: {
        status: 'Cancelado',
        erro: 'Cancelado automaticamente: Lead respondeu.',
      },
    });

    if (canceledEnvios.count > 0) {
      console.log(
        `[Webhook] ⏹  ${canceledEnvios.count} envio(s) agendado(s) cancelados para "${lead.nome}"`
      );
    }

    // ── [2] Pausa execuções ativas do WorkflowEngine ──────────────────────
    await pauseWorkflowExecutions(lead.id, lead.nome);

    return res.json({ ok: true });
  } catch (error) {
    console.error('[Webhook] Erro ao processar evento:', error);
    return res.status(500).json({ error: 'Erro processando webhook' });
  }
  });
});

// ─── Função de pausa do motor de workflow ─────────────────────────────────────

/**
 * Pausa todas as execuções de workflow ativas de um lead:
 *
 * 1. Busca todos os job IDs BullMQ rastreados no Redis para este lead
 * 2. Tenta remover cada job da fila (se ainda estiver no estado 'delayed' ou 'waiting')
 * 3. Marca todas as WorkflowExecucao como 'pausado' no banco
 *
 * Esta função é idempotente — pode ser chamada múltiplas vezes com segurança.
 */
async function pauseWorkflowExecutions(
  leadId: string,
  leadNome: string
): Promise<void> {
  // ── Busca job IDs ativos no Redis ──────────────────────────────────────
  const redisKey = LEAD_ACTIVE_JOBS_KEY(leadId);
  const activeJobIds = await redis.smembers(redisKey);

  if (activeJobIds.length === 0) {
    console.log(`[Webhook] Nenhum job de workflow ativo para "${leadNome}".`);
  } else {
    console.log(
      `[Webhook] 🔴 Cancelando ${activeJobIds.length} job(s) de workflow para "${leadNome}":`,
      activeJobIds
    );

    // ── Remove cada job da fila BullMQ ────────────────────────────────────
    const cancelResults = await Promise.allSettled(
      activeJobIds.map(async (jobId) => {
        try {
          const job = await workflowQueue.getJob(jobId);

          if (!job) {
            console.log(`[Webhook]   Job ${jobId} não encontrado na fila (já executado?).`);
            return;
          }

          const jobState = await job.getState();
          console.log(`[Webhook]   Job ${jobId} → estado atual: "${jobState}"`);

          if (jobState === 'delayed' || jobState === 'waiting') {
            await job.remove();
            console.log(`[Webhook]   ✅ Job ${jobId} removido da fila.`);
          } else if (jobState === 'active') {
            // Job em execução — não podemos parar abruptamente.
            // A verificação de status no worker (execucao.status === 'pausado')
            // garantirá que ele pare antes de enfileirar o próximo step.
            console.log(
              `[Webhook]   ⚠️  Job ${jobId} está em execução. Será interrompido pelo worker no próximo checkpoint.`
            );
          }
        } catch (err) {
          console.error(`[Webhook]   Erro ao cancelar job ${jobId}:`, err);
        }
      })
    );

    const successCount = cancelResults.filter((r) => r.status === 'fulfilled').length;
    console.log(`[Webhook] Cancelamento: ${successCount}/${activeJobIds.length} jobs processados.`);

    // ── Limpa o Set Redis ──────────────────────────────────────────────────
    await redis.del(redisKey);
  }

  // ── Marca WorkflowExecucao como 'pausado' no banco ────────────────────────
  const { count } = await prisma.workflowExecucao.updateMany({
    where: {
      lead_id: leadId,
      status: { in: ['pendente', 'executando'] },
    },
    data: {
      status: 'pausado',
      bullmq_job_id: null,
    },
  });

  if (count > 0) {
    console.log(
      `[Webhook] ✅ ${count} execução(ões) de workflow pausadas para "${leadNome}" — robô interrompido para atendimento humano.`
    );
  }
}

export const webhookRoutes = router;

