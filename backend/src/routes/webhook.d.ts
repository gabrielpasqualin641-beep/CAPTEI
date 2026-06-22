/**
 * webhook.ts — Receptor de Eventos da Evolution API
 * ─────────────────────────────────────────────────────────────────────────────
 * Responsabilidades:
 *  1. Registrar mensagens recebidas (interações)
 *  2. Atualizar status do lead no CRM (→ Respondeu)
 *  3. Cancelar envios agendados na tabela `envios` (CampanhaQueue)
 *  4. [NOVO] Pausar execuções ativas do WorkflowEngine via Redis + BullMQ
 */
export declare const webhookRoutes: import("express-serve-static-core").Router;
//# sourceMappingURL=webhook.d.ts.map