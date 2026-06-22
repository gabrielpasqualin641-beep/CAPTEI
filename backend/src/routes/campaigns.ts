import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { getCampaignQueue, getOrCreateCampaignWorker, redisPublisher } from '../lib/queue';
import { checkLimiteDisparos, checkAcessoRecurso } from '../middleware/checkPlano';
import { validate } from '../middleware/validate';
import { createCampanhaSchema } from '../schemas/campaign.schema';

const router = Router();

// Listar campanhas
router.get('/', authenticate, async (req, res) => {
  try {
    const campanhas = await prisma.campanha.findMany({
      where: { ativo: true },
      include: {
        instancia: { select: { nome: true } },
        template: { select: { nome: true } },
        envios: {
          select: { status: true }
        }
      },
      orderBy: { criado_em: 'desc' }
    });

    const formatedCampanhas = campanhas.map(c => {
      const total = c.envios.length;
      const enviados = c.envios.filter(e => e.status === 'Enviado' || e.status === 'Falha').length;
      return {
        ...c,
        progresso: { total, enviados }
      };
    });

    return res.json(formatedCampanhas);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao buscar campanhas.' });
  }
});

// Criar campanha
router.post('/', authenticate, checkAcessoRecurso('campanhas'), validate(createCampanhaSchema), async (req: any, res) => {
  try {
    const { nome, instancia_id, template_id, leads_ids, janela_inicio, janela_fim, dias_semana, delay_min, delay_max } = req.body;
    const tenantId = req.user?.id || 'default';

    const campanha = await prisma.campanha.create({
      data: {
        nome,
        instancia_id,
        template_id,
        userId: tenantId,
        janela_inicio: janela_inicio || '09:00',
        janela_fim: janela_fim || '18:00',
        dias_semana: dias_semana || [1,2,3,4,5],
        delay_min: delay_min || 30,
        delay_max: delay_max || 120,
        status: 'Ativa'
      }
    });

    // Criar os envios agendados
    for (const leadId of leads_ids) {
      await prisma.envio.create({
        data: {
          campanha_id: campanha.id,
          lead_id: leadId,
          conteudo_renderizado: '', // Será gerado na hora de enviar
          agendado_para: new Date(), // Job vai verificar a janela
          status: 'Agendado'
        }
      });
    }

    // Ativa o worker dinâmico e notifica outros processos via Redis Pub/Sub
    getOrCreateCampaignWorker(tenantId);
    await redisPublisher.publish('campaign-workers:new', tenantId);

    // Adiciona na fila específica do tenant
    const tenantQueue = getCampaignQueue(tenantId);
    await tenantQueue.add('iniciar_campanha', { campanhaId: campanha.id });

    return res.status(201).json(campanha);
  } catch (error) {
    console.error('Erro ao criar campanha:', error);
    return res.status(500).json({ error: 'Erro ao criar campanha.' });
  }
});

router.post('/:id/start', authenticate, checkLimiteDisparos, async (req: any, res) => {
  try {
    const id = req.params.id as string;
    const campanha = await prisma.campanha.findUnique({
      where: { id },
      include: {
        envios: { select: { status: true } },
      },
    }) as any;
    if (!campanha) {
      return res.status(404).json({ error: 'Campanha não encontrada.' });
    }

    const pendentes = campanha.envios.filter((e: any) => e.status === 'Agendado').length;
    if (pendentes === 0) {
      return res.status(400).json({ error: 'Nenhum envio pendente nesta campanha.' });
    }

    // Marca como Ativa (caso estivesse Pausada)
    await prisma.campanha.update({
      where: { id: id },
      data: { status: 'Ativa' },
    });

    const tenantId = campanha.userId || 'default';
    
    // Ativa o worker dinâmico e notifica outros processos via Redis Pub/Sub
    getOrCreateCampaignWorker(tenantId);
    await redisPublisher.publish('campaign-workers:new', tenantId);

    // Enfileira na fila do tenant
    const tenantQueue = getCampaignQueue(tenantId);
    await tenantQueue.add('iniciar_campanha', { campanhaId: id });

    const total = campanha.envios.length;
    const enviados = campanha.envios.filter((e: any) => e.status === 'Enviado' || e.status === 'Falha').length;

    return res.json({
      success: true,
      message: `Campanha iniciada com ${pendentes} envios pendentes.`,
      progresso: { total, enviados, pendentes },
    });
  } catch (error: any) {
    console.error('Erro ao iniciar campanha via /start:', error);
    return res.status(500).json({ error: 'Erro ao iniciar campanha.' });
  }
});

router.patch('/:id/status', authenticate, async (req: any, res) => {
  try {
    const id = req.params.id as string;
    const { status } = req.body;
    const validStatuses = ['Ativa', 'Pausada', 'Cancelada'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Status inválido. Use: Ativa, Pausada ou Cancelada.' });
    }

    const campanha = await prisma.campanha.update({
      where: { id },
      data: { status },
    });

    // Se reativando, reprocessar envios pendentes
    if (status === 'Ativa') {
      const tenantId = campanha.userId || 'default';
      
      // Ativa o worker dinâmico e notifica outros processos via Redis Pub/Sub
      getOrCreateCampaignWorker(tenantId);
      await redisPublisher.publish('campaign-workers:new', tenantId);

      const tenantQueue = getCampaignQueue(tenantId);
      await tenantQueue.add('iniciar_campanha', { campanhaId: id });
    }

    // Se cancelando, cancelar todos os envios agendados
    if (status === 'Cancelada') {
      await prisma.envio.updateMany({
        where: { campanha_id: id, status: 'Agendado' },
        data: { status: 'Cancelado', erro: 'Campanha cancelada pelo usuário.' },
      });
    }

    return res.json(campanha);
  } catch (error: any) {
    console.error('Erro ao atualizar status da campanha:', error);
    return res.status(500).json({ error: 'Erro ao atualizar status da campanha.' });
  }
});

export const campaignsRoutes = router;
