"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.instancesRoutes = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const prisma_1 = require("../lib/prisma");
const evolution_1 = require("../lib/evolution");
const checkPlano_1 = require("../middleware/checkPlano");
const router = (0, express_1.Router)();
// Listar instâncias
router.get('/', auth_1.authenticate, async (req, res) => {
    try {
        const instancias = await prisma_1.prisma.instancia.findMany({
            orderBy: { criado_em: 'desc' }
        });
        // Opcional: Atualizar o status real delas batendo na API
        for (const inst of instancias) {
            if (inst.status !== 'desconectado') {
                try {
                    const state = await evolution_1.evolutionApi.getConnectionState(inst.nome);
                    const newState = state?.instance?.state || 'desconectado';
                    if (newState !== inst.status) {
                        await prisma_1.prisma.instancia.update({
                            where: { id: inst.id },
                            data: { status: newState }
                        });
                        inst.status = newState;
                    }
                }
                catch (e) {
                    // Ignorar se a instância não existe na API no momento
                }
            }
        }
        return res.json(instancias);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erro ao buscar instâncias.' });
    }
});
// Criar nova instância
router.post('/', auth_1.authenticate, (0, checkPlano_1.checkAcessoRecurso)('instancias'), async (req, res) => {
    try {
        const { nome } = req.body;
        const tenantId = req.user?.id || 'default';
        // 1. Criar na Evolution API primeiro
        await evolution_1.evolutionApi.createInstance(nome);
        // 2. Criar no banco apenas se der sucesso
        const novaInstancia = await prisma_1.prisma.instancia.create({
            data: {
                userId: tenantId,
                nome,
                status: 'aguardando_qr'
            }
        });
        return res.status(201).json(novaInstancia);
    }
    catch (error) {
        console.error('Erro ao criar instância:', error);
        return res.status(500).json({ error: 'Erro ao criar instância.' });
    }
});
// Obter QR Code
router.get('/:id/qrcode', auth_1.authenticate, async (req, res) => {
    try {
        const instancia = await prisma_1.prisma.instancia.findUnique({
            where: { id: req.params.id }
        });
        if (!instancia)
            return res.status(404).json({ error: 'Instância não encontrada.' });
        const qrData = await evolution_1.evolutionApi.getQrCode(instancia.nome);
        return res.json({ base64: qrData?.base64 });
    }
    catch (error) {
        console.error('Erro ao buscar QR code:', error);
        return res.status(500).json({ error: 'Erro ao buscar QR Code.' });
    }
});
exports.instancesRoutes = router;
//# sourceMappingURL=instances.js.map