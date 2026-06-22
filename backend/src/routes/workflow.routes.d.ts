/**
 * workflow.routes.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Rotas Express 5 para gerenciamento e disparo dos workflows de automação visual.
 *
 * Endpoints:
 *   POST   /api/workflows              → Salvar um novo workflow
 *   PUT    /api/workflows/:id          → Atualizar payload de um workflow
 *   GET    /api/workflows              → Listar workflows do usuário
 *   GET    /api/workflows/:id          → Detalhe de um workflow
 *   DELETE /api/workflows/:id          → Arquivar (soft delete via status)
 *   POST   /api/workflows/:id/disparar → Enfileirar o workflow para um lead
 */
declare const router: import("express-serve-static-core").Router;
export { router as workflowRoutes };
//# sourceMappingURL=workflow.routes.d.ts.map