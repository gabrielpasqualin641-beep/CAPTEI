"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nationalScrapeWorker = exports.nationalScrapeQueue = exports.CAPITAIS_BRASIL = void 0;
/**
 * nationalQueue.ts
 *
 * Fila BullMQ dedicada à varredura nacional de leads.
 * Cada job processa uma combinação [nicho + capital] e salva os
 * resultados diretamente no banco, sem bloquear o request do usuário.
 */
const bullmq_1 = require("bullmq");
const queue_1 = require("./queue"); // reutiliza conexão Redis existente
const prisma_1 = require("./prisma");
const places_1 = require("../routes/places");
const scrape_1 = require("../routes/scrape");
// ── Lista estática das principais capitais/metrópoles do Brasil ──────────────
exports.CAPITAIS_BRASIL = [
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
exports.nationalScrapeQueue = new bullmq_1.Queue('NationalScrapeQueue', {
    connection: queue_1.connection,
    defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'fixed', delay: 10000 },
        removeOnComplete: 100,
        removeOnFail: 50,
    },
});
const prisma_2 = require("./prisma");
// ── Helper: salva leads em lote, retorna quantos foram adicionados ─────────
async function saveBatch(leads, nicho, cidade, modo, userId) {
    let adicionados = 0;
    const tag = `${modo === 'ecommerce' ? 'Online' : 'Físico'} - ${nicho} - ${cidade} [Nacional]`;
    for (const lead of leads) {
        const telParaSalvar = lead.telefone || `SEM_FONE_${lead.id_google || lead.id || Math.random()}`;
        const existe = await prisma_1.prisma.lead.findUnique({ where: { telefone: telParaSalvar } });
        if (existe)
            continue;
        await prisma_1.prisma.lead.create({
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
exports.nationalScrapeWorker = new bullmq_1.Worker('NationalScrapeQueue', async (job) => {
    const { jobGroupId, nicho, cidade, modo, filters } = job.data;
    console.log(`[NacionalWorker] ▶ Processando: ${nicho} em ${cidade} (${modo}) [grupo: ${jobGroupId}]`);
    // Busca o job de varredura sob o bypass de tenant para descobrir quem o iniciou (userId)
    const varredura = await (0, prisma_2.bypassTenantIsolation)(() => prisma_1.prisma.varreduraJob.findUnique({ where: { jobGroupId } }));
    if (!varredura || varredura.status === 'cancelado') {
        console.log(`[NacionalWorker] ⏹ Grupo ${jobGroupId} cancelado. Pulando ${cidade}.`);
        return;
    }
    const { userId } = varredura;
    // Roda todo o processamento de salvar no banco e atualizar o status dentro do contexto do tenant
    return prisma_2.tenantStorage.run({ userId, isSystem: false }, async () => {
        let leadsCapturados = 0;
        let sucesso = true;
        try {
            if (modo === 'ecommerce') {
                const results = await (0, scrape_1.runEcommerceScrape)(nicho, cidade);
                leadsCapturados = await saveBatch(results, nicho, cidade, modo, userId);
            }
            else {
                const results = await (0, places_1.runOsmSearch)(nicho, cidade, filters ?? {});
                leadsCapturados = await saveBatch(results, nicho, cidade, modo, userId);
            }
            console.log(`[NacionalWorker] ✅ ${cidade}: ${leadsCapturados} leads salvos`);
        }
        catch (err) {
            console.error(`[NacionalWorker] ❌ Erro em ${cidade}:`, err?.message);
            sucesso = false;
        }
        // Atualiza status no banco de forma atômica
        await prisma_1.prisma.varreduraJob.update({
            where: { jobGroupId },
            data: {
                concluidas: { increment: sucesso ? 1 : 0 },
                falhas: { increment: sucesso ? 0 : 1 },
                leadsCapturados: { increment: leadsCapturados },
            },
        });
        // Verifica se todas as cidades foram concluídas
        const updated = await prisma_1.prisma.varreduraJob.findUnique({ where: { jobGroupId } });
        if (updated && (updated.concluidas + updated.falhas) >= updated.totalCidades) {
            await prisma_1.prisma.varreduraJob.update({
                where: { jobGroupId },
                data: { status: 'concluido' },
            });
            console.log(`[NacionalWorker] 🏁 Varredura ${jobGroupId} concluída! ${updated.leadsCapturados + leadsCapturados} leads no total.`);
        }
    });
}, {
    connection: queue_1.connection,
    concurrency: 1, // processa 1 cidade por vez para não sobrecarregar a Overpass API
    limiter: {
        max: 1,
        duration: 5000, // máximo 1 job a cada 5 segundos
    },
});
exports.nationalScrapeWorker.on('completed', (job) => {
    console.log(`[NacionalWorker] Job ${job.id} (${job.data.cidade}) finalizado`);
});
exports.nationalScrapeWorker.on('failed', (job, err) => {
    console.error(`[NacionalWorker] Job ${job?.id} (${job?.data?.cidade}) falhou:`, err?.message);
});
//# sourceMappingURL=nationalQueue.js.map