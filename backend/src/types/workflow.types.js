"use strict";
/**
 * Tipos TypeScript que espelham exatamente a estrutura exportada pelo
 * @xyflow/react no frontend (WorkflowJSON em WorkflowBuilder.tsx).
 *
 * Este arquivo é a "fonte da verdade" para o backend — usado tanto
 * na rota de salvamento quanto no worker de execução.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEAD_ACTIVE_JOBS_KEY = void 0;
exports.isValidWorkflowPayload = isValidWorkflowPayload;
/** Valida que um objeto desconhecido tem a estrutura mínima de WorkflowPayload */
function isValidWorkflowPayload(obj) {
    if (typeof obj !== 'object' || obj === null)
        return false;
    const p = obj;
    return Array.isArray(p.nodes) && Array.isArray(p.edges);
}
/** Chave Redis usada para rastrear jobs ativos de um lead */
const LEAD_ACTIVE_JOBS_KEY = (leadId) => `workflow:lead:${leadId}:active_jobs`;
exports.LEAD_ACTIVE_JOBS_KEY = LEAD_ACTIVE_JOBS_KEY;
//# sourceMappingURL=workflow.types.js.map