"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.campaignsRoutes = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const prisma_1 = require("../lib/prisma");
const queue_1 = require("../lib/queue");
const checkPlano_1 = require("../middleware/checkPlano");
const validate_1 = require("../middleware/validate");
const campaign_schema_1 = require("../schemas/campaign.schema");
const router = (0, express_1.Router)();
// Listar campanhas
router.get('/', auth_1.authenticate, async (req, res) => {
    try {
        const campanhas = await prisma_1.prisma.campanha.findMany({
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
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erro ao buscar campanhas.' });
    }
});
// Criar campanha
router.post('/', auth_1.authenticate, (0, checkPlano_1.checkAcessoRecurso)('campanhas'), (0, validate_1.validate)(campaign_schema_1.createCampanhaSchema), async (req, res) => {
    try {
        const { nome, instancia_id, template_id, leads_ids, janela_inicio, janela_fim, dias_semana, delay_min, delay_max } = req.body;
        const tenantId = req.user?.id || 'default';
        const campanha = await prisma_1.prisma.campanha.create({
            data: {
                nome,
                instancia_id,
                template_id,
                userId: tenantId,
                janela_inicio: janela_inicio || '09:00',
                janela_fim: janela_fim || '18:00',
                dias_semana: dias_semana || [1, 2, 3, 4, 5],
                delay_min: delay_min || 30,
                delay_max: delay_max || 120,
                status: 'Ativa'
            }
        });
        // Criar os envios agendados
        for (const leadId of leads_ids) {
            await prisma_1.prisma.envio.create({
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
        (0, queue_1.getOrCreateCampaignWorker)(tenantId);
        await queue_1.redisPublisher.publish('campaign-workers:new', tenantId);
        // Adiciona na fila específica do tenant
        const tenantQueue = (0, queue_1.getCampaignQueue)(tenantId);
        await tenantQueue.add('iniciar_campanha', { campanhaId: campanha.id });
        return res.status(201).json(campanha);
    }
    catch (error) {
        console.error('Erro ao criar campanha:', error);
        return res.status(500).json({ error: 'Erro ao criar campanha.' });
    }
});
router.post('/:id/start', auth_1.authenticate, checkPlano_1.checkLimiteDisparos, async (req, res) => {
    try {
        const id = req.params.id;
        const campanha = await prisma_1.prisma.campanha.findUnique({
            where: { id },
            include: {
                envios: { select: { status: true } },
            },
        });
        if (!campanha) {
            return res.status(404).json({ error: 'Campanha não encontrada.' });
        }
        const pendentes = campanha.envios.filter((e) => e.status === 'Agendado').length;
        if (pendentes === 0) {
            return res.status(400).json({ error: 'Nenhum envio pendente nesta campanha.' });
        }
        // Marca como Ativa (caso estivesse Pausada)
        await prisma_1.prisma.campanha.update({
            where: { id: id },
            data: { status: 'Ativa' },
        });
        const tenantId = campanha.userId || 'default';
        // Ativa o worker dinâmico e notifica outros processos via Redis Pub/Sub
        (0, queue_1.getOrCreateCampaignWorker)(tenantId);
        await queue_1.redisPublisher.publish('campaign-workers:new', tenantId);
        // Enfileira na fila do tenant
        const tenantQueue = (0, queue_1.getCampaignQueue)(tenantId);
        await tenantQueue.add('iniciar_campanha', { campanhaId: id });
        const total = campanha.envios.length;
        const enviados = campanha.envios.filter((e) => e.status === 'Enviado' || e.status === 'Falha').length;
        return res.json({
            success: true,
            message: `Campanha iniciada com ${pendentes} envios pendentes.`,
            progresso: { total, enviados, pendentes },
        });
    }
    catch (error) {
        console.error('Erro ao iniciar campanha via /start:', error);
        return res.status(500).json({ error: 'Erro ao iniciar campanha.' });
    }
});
router.patch('/:id/status', auth_1.authenticate, async (req, res) => {
    try {
        const id = req.params.id;
        const { status } = req.body;
        const validStatuses = ['Ativa', 'Pausada', 'Cancelada'];
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Status inválido. Use: Ativa, Pausada ou Cancelada.' });
        }
        const campanha = await prisma_1.prisma.campanha.update({
            where: { id },
            data: { status },
        });
        // Se reativando, reprocessar envios pendentes
        if (status === 'Ativa') {
            const tenantId = campanha.userId || 'default';
            // Ativa o worker dinâmico e notifica outros processos via Redis Pub/Sub
            (0, queue_1.getOrCreateCampaignWorker)(tenantId);
            await queue_1.redisPublisher.publish('campaign-workers:new', tenantId);
            const tenantQueue = (0, queue_1.getCampaignQueue)(tenantId);
            await tenantQueue.add('iniciar_campanha', { campanhaId: id });
        }
        // Se cancelando, cancelar todos os envios agendados
        if (status === 'Cancelada') {
            await prisma_1.prisma.envio.updateMany({
                where: { campanha_id: id, status: 'Agendado' },
                data: { status: 'Cancelado', erro: 'Campanha cancelada pelo usuário.' },
            });
        }
        return res.json(campanha);
    }
    catch (error) {
        console.error('Erro ao atualizar status da campanha:', error);
        return res.status(500).json({ error: 'Erro ao atualizar status da campanha.' });
    }
});
exports.campaignsRoutes = router;
//# sourceMappingURL=campaigns.js.map