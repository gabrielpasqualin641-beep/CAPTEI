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
import type { WorkflowJobData } from '../types/workflow.types';
export declare const WORKFLOW_QUEUE_NAME: "WorkflowStepQueue";
export declare const workflowQueue: Queue<WorkflowJobData, any, string, WorkflowJobData, any, string>;
export declare const workflowQueueEvents: QueueEvents;
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
export declare function enqueueNextStep({ jobData, delayMs, jitterMs, }: EnqueueNextStepOptions): Promise<string>;
/**
 * Gera um jitter randômico entre minMs e maxMs (para anti-bloqueio).
 */
export declare function randomJitter(minMs: number, maxMs: number): number;
export {};
//# sourceMappingURL=workflow.queue.d.ts.map