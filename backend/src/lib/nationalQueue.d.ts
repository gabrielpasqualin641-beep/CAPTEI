/**
 * nationalQueue.ts
 *
 * Fila BullMQ dedicada à varredura nacional de leads.
 * Cada job processa uma combinação [nicho + capital] e salva os
 * resultados diretamente no banco, sem bloquear o request do usuário.
 */
import { Queue, Worker } from 'bullmq';
export declare const CAPITAIS_BRASIL: string[];
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
export declare const nationalScrapeQueue: Queue<any, any, string, any, any, string>;
export declare const nationalScrapeWorker: Worker<NationalJobData, any, string>;
//# sourceMappingURL=nationalQueue.d.ts.map