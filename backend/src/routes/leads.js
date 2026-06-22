"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.leadsRoutes = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const prisma_1 = require("../lib/prisma");
const client_1 = require("@prisma/client");
const checkPlano_1 = require("../middleware/checkPlano");
const GoogleMapsService_1 = require("../services/GoogleMapsService");
const router = (0, express_1.Router)();
// Listar Leads
router.get('/', auth_1.authenticate, async (req, res) => {
    try {
        const orderByEnriched = req.query.orderByEnriched === 'true';
        // Verifica dinamicamente se a coluna 'cpf' existe no modelo Lead do Prisma
        const leadModel = client_1.Prisma.dmmf.datamodel.models.find(m => m.name === 'Lead');
        const hasCpf = leadModel?.fields.some(f => f.name === 'cpf');
        let orderBy = { criado_em: 'desc' };
        if (orderByEnriched && hasCpf) {
            orderBy = [
                { cpf: 'desc' },
                { criado_em: 'desc' }
            ];
        }
        const leads = await prisma_1.prisma.lead.findMany({
            where: { ativo: true },
            orderBy: orderBy
        });
        return res.json(leads);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erro ao buscar leads.' });
    }
});
// Buscar leads usando Google Maps API
router.post('/search', auth_1.authenticate, async (req, res) => {
    try {
        const { query, location, cidade } = req.body;
        const local = location || cidade;
        if (!query || !local) {
            return res.status(400).json({ error: 'Os parâmetros "query" e "location" (ou "cidade") são obrigatórios.' });
        }
        const results = await GoogleMapsService_1.GoogleMapsService.searchPlaces(query, local);
        return res.json({ results });
    }
    catch (error) {
        console.error('Erro na busca do Google Maps:', error);
        return res.status(500).json({ error: 'Erro ao buscar leads no Google Maps.', detalhes: error.message });
    }
});
// Salvar leads em lote (vindo da busca do Places)
router.post('/batch', auth_1.authenticate, (0, checkPlano_1.checkAcessoRecurso)('leads'), async (req, res) => {
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
            const existe = await prisma_1.prisma.lead.findUnique({
                where: { telefone: telParaSalvar }
            });
            if (existe) {
                duplicados++;
                continue;
            }
            await prisma_1.prisma.lead.create({
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
    }
    catch (error) {
        console.error('Erro ao salvar leads:', error);
        return res.status(500).json({ error: 'Erro ao buscar leads', detalhes: error.message });
    }
});
// Atualizar status de um lead
router.patch('/:id/status', auth_1.authenticate, async (req, res) => {
    try {
        const id = req.params.id;
        const { status } = req.body;
        if (!status) {
            return res.status(400).json({ error: 'Status é obrigatório' });
        }
        const lead = await prisma_1.prisma.lead.update({
            where: { id },
            data: { status }
        });
        res.json(lead);
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar status', detalhes: error.message });
    }
});
// Excluir um lead
router.delete('/:id', auth_1.authenticate, async (req, res) => {
    try {
        const id = req.params.id;
        await prisma_1.prisma.lead.update({
            where: { id },
            data: { ativo: false }
        });
        res.json({ success: true, message: 'Lead excluído com sucesso' });
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao excluir lead', detalhes: error.message });
    }
});
exports.leadsRoutes = router;
//# sourceMappingURL=leads.js.map