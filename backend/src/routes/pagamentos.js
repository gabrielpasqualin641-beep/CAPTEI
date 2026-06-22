"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pagamentosRoutes = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const prisma_1 = require("../lib/prisma");
const planos_1 = require("../config/planos");
const mercadopago_1 = require("mercadopago");
const router = (0, express_1.Router)();
// Configura o Mercado Pago
const mpAccessToken = process.env.MP_ACCESS_TOKEN || 'TEST-YOUR-ACCESS-TOKEN';
const mpClient = new mercadopago_1.MercadoPagoConfig({ accessToken: mpAccessToken });
const preApproval = new mercadopago_1.PreApproval(mpClient);
// 1. GET /planos - Retorna todos os planos disponíveis
router.get('/planos', async (req, res) => {
    return res.json(planos_1.PLANOS);
});
// 2. GET /meu-plano - Retorna plano atual e consumo do usuário
router.get('/meu-plano', auth_1.authenticate, async (req, res) => {
    try {
        const usuarioId = req.user?.id;
        const usuario = await prisma_1.prisma.usuario.findUnique({
            where: { id: usuarioId },
            select: {
                plano: true,
                disparos_mes: true,
                data_renovacao: true,
                mp_subscription_id: true
            }
        });
        if (!usuario) {
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        }
        const planoKey = (usuario.plano || 'free');
        const limites = planos_1.PLANOS[planoKey];
        // Contar uso atual no banco para instâncias, campanhas, leads, templates
        const instanciasAtivas = await prisma_1.prisma.instancia.count();
        const campanhasAtivas = await prisma_1.prisma.campanha.count({ where: { ativo: true } });
        const leadsTotais = await prisma_1.prisma.lead.count({ where: { ativo: true } });
        const templatesTotais = await prisma_1.prisma.template.count();
        const totalDisparos = usuario.disparos_mes;
        const limiteDisparos = limites.disparos_mes;
        const porcentagemUso = limiteDisparos === -1 ? 0 : Math.round((totalDisparos / limiteDisparos) * 100);
        let statusCota = 'normal';
        if (limiteDisparos !== -1) {
            if (porcentagemUso >= 100) {
                statusCota = 'esgotado';
            }
            else if (porcentagemUso >= 80) {
                statusCota = 'alerta';
            }
        }
        return res.json({
            plano: usuario.plano,
            data_renovacao: usuario.data_renovacao,
            mp_subscription_id: usuario.mp_subscription_id,
            limites,
            uso: {
                disparos_mes: usuario.disparos_mes,
                instancias: instanciasAtivas,
                campanhas: campanhasAtivas,
                leads: leadsTotais,
                templates: templatesTotais
            },
            usoCota: {
                total: totalDisparos,
                limite: limiteDisparos,
                porcentagem: porcentagemUso,
                status: statusCota
            }
        });
    }
    catch (error) {
        console.error('Erro ao buscar meu plano:', error);
        return res.status(500).json({ error: 'Erro ao buscar informações do plano.' });
    }
});
// 3. POST /assinar - Cria uma assinatura no Mercado Pago
router.post('/assinar', auth_1.authenticate, async (req, res) => {
    try {
        const { planoKey, isAnual } = req.body;
        const usuarioId = req.user?.id;
        if (!planoKey || !planos_1.PLANOS[planoKey]) {
            return res.status(400).json({ error: 'Plano inválido.' });
        }
        const usuario = await prisma_1.prisma.usuario.findUnique({ where: { id: usuarioId } });
        if (!usuario) {
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        }
        const plano = planos_1.PLANOS[planoKey];
        if (plano.preco === 0) {
            // Retorna para o plano free
            await prisma_1.prisma.usuario.update({
                where: { id: usuarioId },
                data: {
                    plano: 'free',
                    mp_subscription_id: null,
                    data_renovacao: null
                }
            });
            return res.json({ message: 'Plano alterado para Free com sucesso.' });
        }
        // Calcula preço com desconto de 20% se for anual
        let preco = plano.preco;
        if (isAnual) {
            preco = Math.round(preco * 12 * 0.8); // 20% de desconto no total anual
        }
        const appUrl = process.env.APP_URL || 'http://localhost:5173';
        const body = {
            back_url: `${appUrl}/planos`,
            reason: `Assinatura Captei - Plano ${plano.nome} (${isAnual ? 'Anual' : 'Mensal'})`,
            auto_recurring: {
                frequency: isAnual ? 12 : 1,
                frequency_type: "months",
                transaction_amount: preco / 100, // valor em reais com decimais
                currency_id: "BRL"
            },
            payer_email: usuario.email,
            external_reference: usuario.id,
            status: "pending"
        };
        const response = await preApproval.create({ body });
        return res.json({
            checkoutUrl: response.init_point,
            subscriptionId: response.id
        });
    }
    catch (error) {
        console.error('Erro ao criar assinatura no Mercado Pago:', error);
        return res.status(500).json({ error: 'Erro ao processar assinatura.', detalhes: error.message });
    }
});
// 4. POST /webhook - Recebe notificações do Mercado Pago e atualiza plano do usuário
router.post('/webhook', auth_1.systemBypassMiddleware, async (req, res) => {
    try {
        const { action, data, type } = req.body;
        if (type === 'subscription_authorized' || req.query.topic === 'preapproval' || (action && action.startsWith('subscription'))) {
            const id = data?.id || req.body.resource?.split('/').pop();
            if (!id) {
                return res.status(200).send('OK');
            }
            // Buscar os detalhes do PreApproval no Mercado Pago
            const subDetails = await preApproval.get({ id });
            const usuarioId = subDetails.external_reference;
            const status = subDetails.status; // authorized, paused, cancelled, pending
            if (usuarioId && status === 'authorized') {
                const reason = subDetails.reason || '';
                let novoPlano = 'free';
                if (reason.includes('Starter'))
                    novoPlano = 'starter';
                else if (reason.includes('Pro'))
                    novoPlano = 'pro';
                else if (reason.includes('Enterprise'))
                    novoPlano = 'enterprise';
                const proximaRenovacao = subDetails.next_payment_date ? new Date(subDetails.next_payment_date) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                await prisma_1.prisma.usuario.update({
                    where: { id: usuarioId },
                    data: {
                        plano: novoPlano,
                        mp_subscription_id: id,
                        data_renovacao: proximaRenovacao
                    }
                });
                console.log(`[Webhook MP] Usuário ${usuarioId} atualizado para plano ${novoPlano} via assinatura ${id}`);
            }
        }
        return res.status(200).send('OK');
    }
    catch (error) {
        console.error('Erro no webhook do Mercado Pago:', error);
        return res.status(200).send('Webhook processado com log de erro');
    }
});
// 5. POST /cancelar - Cancela assinatura atual do usuário
router.post('/cancelar', auth_1.authenticate, async (req, res) => {
    try {
        const usuarioId = req.user?.id;
        const usuario = await prisma_1.prisma.usuario.findUnique({ where: { id: usuarioId } });
        if (!usuario || !usuario.mp_subscription_id) {
            return res.status(400).json({ error: 'Nenhuma assinatura ativa encontrada.' });
        }
        // Cancela no Mercado Pago
        await preApproval.update({
            id: usuario.mp_subscription_id,
            body: {
                status: "cancelled"
            }
        });
        // Atualiza no banco
        await prisma_1.prisma.usuario.update({
            where: { id: usuarioId },
            data: {
                plano: 'free',
                mp_subscription_id: null,
                data_renovacao: null
            }
        });
        return res.json({ message: 'Assinatura cancelada com sucesso.' });
    }
    catch (error) {
        console.error('Erro ao cancelar assinatura:', error);
        return res.status(500).json({ error: 'Erro ao cancelar assinatura.', detalhes: error.message });
    }
});
exports.pagamentosRoutes = router;
//# sourceMappingURL=pagamentos.js.map