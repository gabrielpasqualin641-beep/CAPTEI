/**
 * nationalQueue.ts
 *
 * Fila BullMQ dedicada à varredura nacional de leads.
 * Cada job processa uma combinação [nicho + capital] e salva os
 * resultados diretamente no banco, sem bloquear o request do usuário.
 */
import { Queue, Worker } from 'bullmq';
import { connection } from './queue'; // reutiliza conexão Redis existente
import { prisma } from './prisma';
import { runOsmSearch } from '../routes/places';
import { runEcommerceScrape } from '../routes/scrape';

// ── Lista estática das principais capitais/metrópoles do Brasil ──────────────
export const CAPITAIS_BRASIL = [
  'São Paulo',
  'Rio de Janeiro',
  'Brasília',
  'Salvador',
  'Fortaleza',
  'Belo Horizonte',
  'Manaus',
  'Curitiba',
  'Recife',
  'Porto Alegre',
  'Belém',
  'Goiânia',
  'Florianópolis',
  'São Luís',
  'Maceió',
  'Natal',
  'Teresina',
  'Campo Grande',
  'João Pessoa',
  'Aracaju',
  'Porto Velho',
  'Cuiabá',
  'Macapá',
  'Rio Branco',
  'Palmas',
  'Boa Vista',
  'Vitória',
];

export interface NationalJobData {
  jobGroupId: string;
  nicho: string;
  cidade: string;
  modo: 'osm' | 'ecommerce';
  /** Filtros opcionais herdados do request original (modo OSM) */
  filters?: {
    apenasComTelefone?: boolean;
    ocultarInstituicoes?: boolean;
    palavrasExcluir?: string;
    palavrasObrigatorias?: string;
  };
}

export const nationalScrapeQueue = new Queue('NationalScrapeQueue', {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'fixed', delay: 10000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

import { tenantStorage, bypassTenantIsolation } from './prisma';

// ── Helper: salva leads em lote, retorna quantos foram adicionados ─────────
async function saveBatch(
  leads: any[],
  nicho: string,
  cidade: string,
  modo: 'osm' | 'ecommerce',
  userId: string,
): Promise<number> {
  let adicionados = 0;
  const tag = `${modo === 'ecommerce' ? 'Online' : 'Físico'} - ${nicho} - ${cidade} [Nacional]`;

  for (const lead of leads) {
    const telParaSalvar = lead.telefone || `SEM_FONE_${lead.id_google || lead.id || Math.random()}`;
    const existe = await prisma.lead.findUnique({ where: { telefone: telParaSalvar } });
    if (existe) continue;

    await prisma.lead.create({
      data: {
        userId,
        nome: lead.nome,
        telefone: telParaSalvar,
        endereco: lead.endereco ?? cidade,
        cidade: lead.cidade ?? cidade,
        nicho: nicho,
        site: lead.site ?? null,
        email: lead.email ?? null,
        instagram: lead.instagram ?? null,
        plataforma: lead.plataforma ?? null,
        status_extracao: lead.status_extracao ?? null,
        avaliacao: lead.avaliacao ?? null,
        total_reviews: lead.total_reviews ?? null,
        tags: [tag],
      },
    });
    adicionados++;
  }
  return adicionados;
}

// ── Worker ────────────────────────────────────────────────────────────────────
export const nationalScrapeWorker = new Worker<NationalJobData>(
  'NationalScrapeQueue',
  async (job) => {
    const { jobGroupId, nicho, cidade, modo, filters } = job.data;
    console.log(`[NacionalWorker] ▶ Processando: ${nicho} em ${cidade} (${modo}) [grupo: ${jobGroupId}]`);

    // Busca o job de varredura sob o bypass de tenant para descobrir quem o iniciou (userId)
    const varredura = await bypassTenantIsolation(() =>
      prisma.varreduraJob.findUnique({ where: { jobGroupId } })
    );

    if (!varredura || varredura.status === 'cancelado') {
      console.log(`[NacionalWorker] ⏹ Grupo ${jobGroupId} cancelado. Pulando ${cidade}.`);
      return;
    }

    const { userId } = varredura;

    // Roda todo o processamento de salvar no banco e atualizar o status dentro do contexto do tenant
    return tenantStorage.run({ userId, isSystem: false }, async () => {
      let leadsCapturados = 0;
      let sucesso = true;

      try {
        if (modo === 'ecommerce') {
          const results = await runEcommerceScrape(nicho, cidade);
          leadsCapturados = await saveBatch(results, nicho, cidade, modo, userId);
        } else {
          const results = await runOsmSearch(nicho, cidade, filters ?? {});
          leadsCapturados = await saveBatch(results, nicho, cidade, modo, userId);
        }
        console.log(`[NacionalWorker] ✅ ${cidade}: ${leadsCapturados} leads salvos`);
      } catch (err: any) {
        console.error(`[NacionalWorker] ❌ Erro em ${cidade}:`, err?.message);
        sucesso = false;
      }

      // Atualiza status no banco de forma atômica
      await prisma.varreduraJob.update({
        where: { jobGroupId },
        data: {
          concluidas: { increment: sucesso ? 1 : 0 },
          falhas: { increment: sucesso ? 0 : 1 },
          leadsCapturados: { increment: leadsCapturados },
        },
      });

      // Verifica se todas as cidades foram concluídas
      const updated = await prisma.varreduraJob.findUnique({ where: { jobGroupId } });
      if (updated && (updated.concluidas + updated.falhas) >= updated.totalCidades) {
        await prisma.varreduraJob.update({
          where: { jobGroupId },
          data: { status: 'concluido' },
        });
        console.log(`[NacionalWorker] 🏁 Varredura ${jobGroupId} concluída! ${updated.leadsCapturados + leadsCapturados} leads no total.`);
      }
    });
  },
  {
    connection,
    concurrency: 1,          // processa 1 cidade por vez para não sobrecarregar a Overpass API
    limiter: {
      max: 1,
      duration: 5000,        // máximo 1 job a cada 5 segundos
    },
  },
);

nationalScrapeWorker.on('completed', (job) => {
  console.log(`[NacionalWorker] Job ${job.id} (${job.data.cidade}) finalizado`);
});

nationalScrapeWorker.on('failed', (job, err) => {
  console.error(`[NacionalWorker] Job ${job?.id} (${job?.data?.cidade}) falhou:`, err?.message);
});
