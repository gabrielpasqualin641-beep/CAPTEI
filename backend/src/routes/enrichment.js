"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const enrichmentService_1 = require("../services/enrichmentService");
const auth_1 = require("../middleware/auth");
const checkPlano_1 = require("../middleware/checkPlano");
const router = (0, express_1.Router)();
const enrichmentService = new enrichmentService_1.EnrichmentService();
/**
 * POST /enrichment/:leadId
 * Body: { cnpj?: string }
 */
router.post('/:leadId', auth_1.authenticate, (0, checkPlano_1.checkAcessoRecurso)('enriquecimento'), async (req, res) => {
    try {
        const { leadId } = req.params;
        const { cnpj } = req.body;
        if (!leadId) {
            return res.status(400).json({ success: false, error: 'O ID do lead é obrigatório' });
        }
        const result = await enrichmentService.enrichLeadData(leadId, cnpj);
        return res.status(200).json({
            success: true,
            lead: result.lead,
            source: result.source,
            enrichedFields: result.enrichedFields
        });
    }
    catch (error) {
        console.error('Erro na rota de enriquecimento:', error.message);
        return res.status(500).json({
            success: false,
            error: 'Falha ao processar o enriquecimento do lead.'
        });
    }
});
exports.default = router;
//# sourceMappingURL=enrichment.js.map