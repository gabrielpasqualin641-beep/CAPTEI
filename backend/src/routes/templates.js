"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.templatesRoutes = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const prisma_1 = require("../lib/prisma");
const router = (0, express_1.Router)();
// Listar templates
router.get('/', auth_1.authenticate, async (req, res) => {
    try {
        const templates = await prisma_1.prisma.template.findMany({
            orderBy: { criado_em: 'desc' },
            include: {
                sequencias: {
                    orderBy: { ordem: 'asc' }
                }
            }
        });
        return res.json(templates);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erro ao buscar templates.' });
    }
});
// Criar template
router.post('/', auth_1.authenticate, async (req, res) => {
    try {
        const { nome, nicho, conteudo, variaveis, sequencias } = req.body;
        const tenantId = req.user?.id || 'default';
        const template = await prisma_1.prisma.template.create({
            data: {
                userId: tenantId,
                nome,
                nicho,
                conteudo,
                variaveis: variaveis || [],
                sequencias: {
                    create: sequencias?.map((seq, index) => ({
                        ordem: index + 1,
                        conteudo: seq.conteudo,
                        dias_apos_anterior: seq.dias_apos_anterior || 0
                    })) || []
                }
            },
            include: {
                sequencias: true
            }
        });
        return res.status(201).json(template);
    }
    catch (error) {
        console.error('Erro ao criar template:', error);
        return res.status(500).json({ error: 'Erro ao criar template.' });
    }
});
exports.templatesRoutes = router;
//# sourceMappingURL=templates.js.map