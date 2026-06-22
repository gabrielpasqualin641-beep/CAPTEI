/**
 * workflow.worker.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Motor de execução assíncrona dos fluxos visuais de automação.
 *
 * Cada job representa UM step (nó) do workflow para UM lead específico.
 * O worker processa, executa a ação do nó e enfileira o próximo step
 * com o delay adequado — até o fim do fluxo ou até pausa por webhook.
 *
 * Arquitetura de segurança:
 *  - Verifica WorkflowExecucao.status antes de executar (mecanismo de pausa)
 *  - Registra bullmq_job_id no DB para cancelamento por webhook
 *  - Registra toda interação na tabela `interacoes` do lead
 */
import { Worker } from 'bullmq';
import { type WorkflowJobData } from '../types/workflow.types';
export declare const workflowWorker: Worker<WorkflowJobData, any, string>;
//# sourceMappingURL=workflow.worker.d.ts.map