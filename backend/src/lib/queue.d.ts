import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
export declare const connection: IORedis;
export declare const redisPublisher: IORedis;
export declare const redisSubscriber: IORedis;
export declare const queues: Map<string, Queue<any, any, string, any, any, string>>;
export declare const workers: Map<string, Worker<any, any, string>>;
export declare const campanhaQueue: Queue<any, any, string, any, any, string>;
/**
 * Obtém ou cria a fila BullMQ específica de um tenant.
 */
export declare function getCampaignQueue(tenantId: string): Queue;
/**
 * Cria ou retorna o Worker do BullMQ para o tenant correspondente.
 * Cada agência (tenant) tem seu próprio fluxo isolado de concorrência.
 */
export declare function getOrCreateCampaignWorker(tenantId: string): Worker;
/**
 * Inicializa os workers de campanhas ativas cadastradas no banco no startup.
 */
export declare function initCampaignWorkers(): Promise<void>;
/**
 * Encerra graciosamente todos os workers ativos.
 */
export declare function closeAllWorkers(): Promise<void>;
export declare const campanhaWorker: {
    close: typeof closeAllWorkers;
};
//# sourceMappingURL=queue.d.ts.map