"use strict";
/**
 * workflowQueue.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Fila BullMQ isolada para execução assíncrona dos fluxos de automação visual.
 * Reutiliza a mesma conexão IORedis do queue.ts existente para economizar
 * conexões com o Redis.
 *
 * Separada da CampanhaQueue por design:
 *  - Permite limites de concorrência e tentativas independentes
 *  - Facilita monitoramento no Bull Board por tipo de fila
 *  - Evita que jobs de campanha simples compitam com steps de workflow complexos
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.workflowQueueEvents = exports.workflowQueue = exports.WORKFLOW_QUEUE_NAME = void 0;
exports.enqueueNextStep = enqueueNextStep;
exports.randomJitter = randomJitter;
const bullmq_1 = require("bullmq");
const queue_1 = require("../lib/queue"); // reutiliza a conexão IORedis singleton
// ─── Nome da fila (constante para evitar typos) ───────────────────────────────
exports.WORKFLOW_QUEUE_NAME = 'WorkflowStepQueue';
// ─── Fila principal ───────────────────────────────────────────────────────────
exports.workflowQueue = new bullmq_1.Queue(exports.WORKFLOW_QUEUE_NAME, {
    connection: queue_1.connection,
    defaultJobOptions: {
        /** Remove job completado após 48h (evita acúmulo no Redis) */
        removeOnComplete: { age: 48 * 60 * 60 },
        /** Remove job falhado após 7 dias (para auditoria) */
        removeOnFail: { age: 7 * 24 * 60 * 60 },
        /** Retry automático: 3 tentativas com backoff exponencial */
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 5_000, // 5s → 10s → 20s
        },
    },
});
// ─── QueueEvents (para monitoramento de jobs concluídos/falhados) ─────────────
// Útil para atualizar WorkflowExecucao.status em tempo real via listeners externos
exports.workflowQueueEvents = new bullmq_1.QueueEvents(exports.WORKFLOW_QUEUE_NAME, {
    connection: queue_1.connection,
});
exports.workflowQueueEvents.on('completed', ({ jobId }) => {
    console.log(`[WorkflowQueue] ✅ Job ${jobId} concluído com sucesso.`);
});
exports.workflowQueueEvents.on('failed', ({ jobId, failedReason }) => {
    console.error(`[WorkflowQueue] ❌ Job ${jobId} falhou: ${failedReason}`);
});
/**
 * Enfileira o próximo step de um workflow e retorna o ID do job criado.
 * Aplica jitter randômico para humanizar cadências de follow-up.
 */
async function enqueueNextStep({ jobData, delayMs = 0, jitterMs = 0, }) {
    const totalDelay = delayMs + jitterMs;
    const job = await exports.workflowQueue.add(`step:${jobData.workflowId}:${jobData.currentNodeId}:lead:${jobData.leadId}`, jobData, { delay: totalDelay > 0 ? totalDelay : undefined });
    console.log(`[WorkflowQueue] 📥 Job enfileirado — Node: ${jobData.currentNodeId} | Lead: ${jobData.leadId} | Delay: ${Math.round(totalDelay / 1000)}s | JobID: ${job.id}`);
    return job.id;
}
/**
 * Gera um jitter randômico entre minMs e maxMs (para anti-bloqueio).
 */
function randomJitter(minMs, maxMs) {
    return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
}
//# sourceMappingURL=workflow.queue.js.map