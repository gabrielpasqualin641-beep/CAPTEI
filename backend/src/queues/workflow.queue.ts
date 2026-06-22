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

import { Queue, QueueEvents } from 'bullmq';
import { connection } from '../lib/queue'; // reutiliza a conexão IORedis singleton
import type { WorkflowJobData } from '../types/workflow.types';

// ─── Nome da fila (constante para evitar typos) ───────────────────────────────

export const WORKFLOW_QUEUE_NAME = 'WorkflowStepQueue' as const;

// ─── Fila principal ───────────────────────────────────────────────────────────

export const workflowQueue = new Queue<WorkflowJobData>(WORKFLOW_QUEUE_NAME, {
  connection,
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

export const workflowQueueEvents = new QueueEvents(WORKFLOW_QUEUE_NAME, {
  connection,
});

workflowQueueEvents.on('completed', ({ jobId }) => {
  console.log(`[WorkflowQueue] ✅ Job ${jobId} concluído com sucesso.`);
});

workflowQueueEvents.on('failed', ({ jobId, failedReason }) => {
  console.error(`[WorkflowQueue] ❌ Job ${jobId} falhou: ${failedReason}`);
});

// ─── Helper: adicionar próximo step do fluxo ─────────────────────────────────

interface EnqueueNextStepOptions {
  jobData: WorkflowJobData;
  /** Delay em millisegundos antes de executar o próximo step */
  delayMs?: number;
  /** Delay humanizador randômico adicional (ms) para anti-bloqueio */
  jitterMs?: number;
}

/**
 * Enfileira o próximo step de um workflow e retorna o ID do job criado.
 * Aplica jitter randômico para humanizar cadências de follow-up.
 */
export async function enqueueNextStep({
  jobData,
  delayMs = 0,
  jitterMs = 0,
}: EnqueueNextStepOptions): Promise<string> {
  const totalDelay = delayMs + jitterMs;

  const job = await workflowQueue.add(
    `step:${jobData.workflowId}:${jobData.currentNodeId}:lead:${jobData.leadId}`,
    jobData,
    { delay: totalDelay > 0 ? totalDelay : undefined }
  );

  console.log(
    `[WorkflowQueue] 📥 Job enfileirado — Node: ${jobData.currentNodeId} | Lead: ${jobData.leadId} | Delay: ${Math.round(totalDelay / 1000)}s | JobID: ${job.id}`
  );

  return job.id!;
}

/**
 * Gera um jitter randômico entre minMs e maxMs (para anti-bloqueio).
 */
export function randomJitter(minMs: number, maxMs: number): number {
  return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
}
