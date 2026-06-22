import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';
import { checkAcessoRecurso } from '../middleware/checkPlano';
import { GoogleMapsService } from '../services/GoogleMapsService';

const router = Router();

// Listar Leads
router.get('/', authenticate, async (req, res) => {
  try {
    const orderByEnriched = req.query.orderByEnriched === 'true';

    // Verifica dinamicamente se a coluna 'cpf' existe no modelo Lead do Prisma
    const leadModel = Prisma.dmmf.datamodel.models.find(m => m.name === 'Lead');
    const hasCpf = leadModel?.fields.some(f => f.name === 'cpf');

    let orderBy: any = { criado_em: 'desc' };

    if (orderByEnriched && hasCpf) {
      orderBy = [
        { cpf: 'desc' },
        { criado_em: 'desc' }
      ];
    }

    const leads = await prisma.lead.findMany({
      where: { ativo: true },
      orderBy: orderBy
    });
    return res.json(leads);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao buscar leads.' });
  }
});

// Buscar leads usando Google Maps API
router.post('/search', authenticate, async (req, res) => {
  try {
    const { query, location, cidade } = req.body;
    const local = location || cidade;

    if (!query || !local) {
      return res.status(400).json({ error: 'Os parâmetros "query" e "location" (ou "cidade") são obrigatórios.' });
    }

    const results = await GoogleMapsService.searchPlaces(query, local);
    return res.json({ results });
  } catch (error: any) {
    console.error('Erro na busca do Google Maps:', error);
    return res.status(500).json({ error: 'Erro ao buscar leads no Google Maps.', detalhes: error.message });
  }
});

// Salvar leads em lote (vindo da busca do Places)
router.post('/batch', authenticate, checkAcessoRecurso('leads'), async (req: any, res) => {
  try {
    const { leads, tag } = req.body;
    const tenantId = req.user?.id || 'default';

    if (!Array.isArray(leads) || leads.length === 0) {
      return res.status(400).json({ error: 'Lista de leads vazia ou inválida.' });
    }

    let adicionados = 0;
    let duplicados = 0;

    for (const lead of leads) {
      const telParaSalvar = lead.telefone || `SEM_FONE_${lead.id_google}`;
      
      const existe = await prisma.lead.findUnique({
        where: { telefone: telParaSalvar }
      });

      if (existe) {
        duplicados++;
        continue;
      }

      await prisma.lead.create({
        data: {
          userId: tenantId,
          nome: lead.nome,
          telefone: telParaSalvar,
          endereco: lead.endereco,
          cidade: lead.cidade || null,
          nicho: lead.nicho || null,
          site: lead.site,
          email: lead.email,
          plataforma: lead.plataforma,
          status_extracao: lead.status_extracao,
          avaliacao: lead.avaliacao,
          total_reviews: lead.total_reviews,
          tags: tag ? [tag] : [],
        }
      });
      adicionados++;
    }

    return res.json({ 
      sucesso: true, 
      adicionados, 
      duplicados 
    });
  } catch (error: any) {
    console.error('Erro ao salvar leads:', error);
    return res.status(500).json({ error: 'Erro ao buscar leads', detalhes: error.message });
  }
});

// Atualizar status de um lead
router.patch('/:id/status', authenticate, async (req, res) => {
  try {
    const id = req.params.id as string;
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ error: 'Status é obrigatório' });
    }

    const lead = await prisma.lead.update({
      where: { id },
      data: { status }
    });

    res.json(lead);
  } catch (error: any) {
    res.status(500).json({ error: 'Erro ao atualizar status', detalhes: error.message });
  }
});

// Excluir um lead
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const id = req.params.id as string;
    
    await prisma.lead.update({
      where: { id },
      data: { ativo: false }
    });

    res.json({ success: true, message: 'Lead excluído com sucesso' });
  } catch (error: any) {
    res.status(500).json({ error: 'Erro ao excluir lead', detalhes: error.message });
  }
});

export const leadsRoutes = router;
