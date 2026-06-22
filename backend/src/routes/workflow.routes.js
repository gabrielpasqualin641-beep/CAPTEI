"use strict";
/**
 * workflow.routes.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Rotas Express 5 para gerenciamento e disparo dos workflows de automação visual.
 *
 * Endpoints:
 *   POST   /api/workflows              → Salvar um novo workflow
 *   PUT    /api/workflows/:id          → Atualizar payload de um workflow
 *   GET    /api/workflows              → Listar workflows do usuário
 *   GET    /api/workflows/:id          → Detalhe de um workflow
 *   DELETE /api/workflows/:id          → Arquivar (soft delete via status)
 *   POST   /api/workflows/:id/disparar → Enfileirar o workflow para um lead
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.workflowRoutes = void 0;
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const workflow_queue_1 = require("../queues/workflow.queue");
const workflow_types_1 = require("../types/workflow.types");
// ─── Middleware de autenticação (reutiliza o middleware existente) ─────────────
// Importa do mesmo padrão dos outros routes do projeto
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Token de autenticação necessário.' });
        return;
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
        req.userId = decoded.id;
        req.userRole = decoded.role;
        next();
    }
    catch {
        res.status(401).json({ error: 'Token inválido ou expirado.' });
    }
}
// ─── Router ───────────────────────────────────────────────────────────────────
const router = (0, express_1.Router)();
exports.workflowRoutes = router;
// Aplica autenticação em todas as rotas deste router
router.use(authMiddleware);
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/workflows — Salvar novo workflow
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
    const { userId } = req;
    const { nome, payload } = req.body;
    // ── Validação ────────────────────────────────────────────────────────────
    if (!nome || typeof nome !== 'string' || nome.trim().length === 0) {
        return res.status(400).json({ error: 'O campo "nome" é obrigatório.' });
    }
    if (!(0, workflow_types_1.isValidWorkflowPayload)(payload)) {
        return res.status(400).json({
            error: 'O campo "payload" deve conter um objeto { nodes: [...], edges: [...] } válido.',
        });
    }
    const typedPayload = payload;
    if (typedPayload.nodes.length === 0) {
        return res.status(400).json({ error: 'O workflow deve ter pelo menos um nó.' });
    }
    try {
        const workflow = await prisma_1.prisma.workflow.create({
            data: {
                userId,
                nome: nome.trim(),
                payload: typedPayload, // Prisma aceita Json
                status: 'ativo',
            },
        });
        console.log(`[WorkflowRoutes] ✅ Workflow "${workflow.nome}" (${workflow.id}) salvo por usuário ${userId}`);
        return res.status(201).json({
            id: workflow.id,
            nome: workflow.nome,
            status: workflow.status,
            totalNos: typedPayload.nodes.length,
            totalConexoes: typedPayload.edges.length,
            criado_em: workflow.criado_em,
        });
    }
    catch (err) {
        console.error('[WorkflowRoutes] Erro ao salvar workflow:', err);
        return res.status(500).json({ error: 'Erro interno ao salvar o workflow.' });
    }
});
// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/workflows/:id — Atualizar workflow existente
// ─────────────────────────────────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
    const { userId } = req;
    const { id } = req.params;
    const { nome, payload } = req.body;
    const existing = await prisma_1.prisma.workflow.findFirst({
        where: { id: id, userId: userId },
        select: { id: true },
    });
    if (!existing) {
        return res.status(404).json({ error: 'Workflow não encontrado.' });
    }
    if (payload !== undefined && !(0, workflow_types_1.isValidWorkflowPayload)(payload)) {
        return res.status(400).json({ error: 'Payload inválido.' });
    }
    const updated = await prisma_1.prisma.workflow.update({
        where: { id: id },
        data: {
            ...(nome && { nome: nome.trim() }),
            ...(payload && { payload: payload }),
        },
        select: { id: true, nome: true, atualizado_em: true },
    });
    console.log(`[WorkflowRoutes] ✏️  Workflow ${id} atualizado por usuário ${userId}`);
    return res.json(updated);
});
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/workflows — Listar workflows do usuário
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
    const { userId } = req;
    const workflows = await prisma_1.prisma.workflow.findMany({
        where: { userId, status: 'ativo' },
        select: {
            id: true,
            nome: true,
            status: true,
            criado_em: true,
            atualizado_em: true,
            _count: { select: { execucoes: true } },
        },
        orderBy: { atualizado_em: 'desc' },
    });
    return res.json(workflows);
});
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/workflows/:id — Detalhe de um workflow
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
    const { userId } = req;
    const { id } = req.params;
    const workflow = await prisma_1.prisma.workflow.findFirst({
        where: { id: id, userId: userId },
        include: {
            execucoes: {
                orderBy: { iniciado_em: 'desc' },
                take: 20,
                select: {
                    id: true,
                    lead_id: true,
                    node_atual_id: true,
                    status: true,
                    erro: true,
                    iniciado_em: true,
                    atualizado_em: true,
                },
            },
        },
    });
    if (!workflow) {
        return res.status(404).json({ error: 'Workflow não encontrado.' });
    }
    return res.json(workflow);
});
// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/workflows/:id — Arquivar workflow (soft delete)
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
    const { userId } = req;
    const { id } = req.params;
    const existing = await prisma_1.prisma.workflow.findFirst({
        where: { id: id, userId: userId },
        select: { id: true },
    });
    if (!existing) {
        return res.status(404).json({ error: 'Workflow não encontrado.' });
    }
    await prisma_1.prisma.workflow.update({
        where: { id: id },
        data: { status: 'inativo' },
    });
    console.log(`[WorkflowRoutes] 🗑  Workflow ${id} arquivado por usuário ${userId}`);
    return res.json({ ok: true, message: 'Workflow arquivado com sucesso.' });
});
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/workflows/:id/disparar — Enfileirar workflow para um lead
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:id/disparar', async (req, res) => {
    const { userId } = req;
    const { id: workflowId } = req.params;
    const { leadId } = req.body;
    if (!leadId) {
        return res.status(400).json({ error: 'O campo "leadId" é obrigatório.' });
    }
    // ── Valida workflow ──────────────────────────────────────────────────────
    const workflow = await prisma_1.prisma.workflow.findFirst({
        where: { id: workflowId, userId: userId, status: 'ativo' },
    });
    if (!workflow) {
        return res.status(404).json({ error: 'Workflow não encontrado ou inativo.' });
    }
    // ── Valida lead ──────────────────────────────────────────────────────────
    const lead = await prisma_1.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
        return res.status(404).json({ error: 'Lead não encontrado.' });
    }
    if (!(0, workflow_types_1.isValidWorkflowPayload)(workflow.payload)) {
        return res.status(400).json({ error: 'Payload do workflow está corrompido.' });
    }
    const { nodes, edges } = workflow.payload;
    // ── Encontra o nó inicial do fluxo ──────────────────────────────────────
    // Nó inicial = nó que NÃO é alvo de nenhuma aresta (entrada)
    const targetNodeIds = new Set(edges.map((e) => e.target));
    const startNode = nodes.find((n) => !targetNodeIds.has(n.id));
    if (!startNode) {
        return res.status(400).json({
            error: 'O workflow não possui nó inicial (nenhum nó sem conexão de entrada).',
        });
    }
    // ── Verifica se já há execução ativa para este lead/workflow ─────────────
    const existingExecucao = await prisma_1.prisma.workflowExecucao.findFirst({
        where: {
            workflow_id: workflowId,
            lead_id: leadId,
            status: { in: ['pendente', 'executando'] },
        },
    });
    if (existingExecucao) {
        return res.status(409).json({
            error: 'Este lead já possui uma execução ativa deste workflow.',
            execucaoId: existingExecucao.id,
        });
    }
    // ── Cria o registro de execução ──────────────────────────────────────────
    const execucao = await prisma_1.prisma.workflowExecucao.create({
        data: {
            workflow_id: workflowId,
            lead_id: leadId,
            userId: userId,
            node_atual_id: startNode.id,
            status: 'pendente',
        },
    });
    // ── Enpileira o primeiro step ────────────────────────────────────────────
    const jobData = {
        execucaoId: execucao.id,
        workflowId: workflowId,
        leadId: leadId,
        currentNodeId: startNode.id,
    };
    const jobId = await (0, workflow_queue_1.enqueueNextStep)({ jobData, delayMs: 0 });
    // Registra o job inicial no registro de execução
    await prisma_1.prisma.workflowExecucao.update({
        where: { id: execucao.id },
        data: { bullmq_job_id: jobId },
    });
    console.log(`[WorkflowRoutes] 🚀 Workflow "${workflow.nome}" disparado para lead "${lead.nome}" | Execução: ${execucao.id} | Job: ${jobId}`);
    return res.status(202).json({
        message: 'Workflow enfileirado com sucesso.',
        execucaoId: execucao.id,
        workflowId: workflowId,
        leadId: leadId,
        startNodeId: startNode.id,
        jobId,
    });
});
//# sourceMappingURL=workflow.routes.js.map