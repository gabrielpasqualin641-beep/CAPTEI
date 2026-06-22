import { Router, Request, Response } from 'express';
import { EnrichmentService } from '../services/enrichmentService';
import { authenticate } from '../middleware/auth';
import { checkAcessoRecurso } from '../middleware/checkPlano';

const router = Router();
const enrichmentService = new EnrichmentService();

/**
 * POST /enrichment/:leadId
 * Body: { cnpj?: string }
 */
router.post('/:leadId', authenticate, checkAcessoRecurso('enriquecimento'), async (req: any, res: Response) => {
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
  } catch (error: any) {
    console.error('Erro na rota de enriquecimento:', error.message);
    return res.status(500).json({ 
      success: false, 
      error: 'Falha ao processar o enriquecimento do lead.'
    });
  }
});

export default router;
