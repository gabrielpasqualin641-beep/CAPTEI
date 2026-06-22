"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = void 0;
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("../lib/prisma");
const router = (0, express_1.Router)();
// Login
router.post('/login', async (req, res) => {
    try {
        const { email, senha } = req.body;
        const normalizedEmail = email?.trim().toLowerCase();
        const user = await prisma_1.prisma.usuario.findUnique({ where: { email: normalizedEmail } });
        if (!user) {
            return res.status(401).json({ error: 'Credenciais inválidas.' });
        }
        const normalizedSenha = senha?.trim() || '';
        const isValid = await bcryptjs_1.default.compare(normalizedSenha, user.senha);
        if (!isValid) {
            return res.status(401).json({ error: 'Credenciais inválidas.' });
        }
        const token = jsonwebtoken_1.default.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
        return res.json({
            token,
            user: {
                id: user.id,
                nome: user.nome,
                email: user.email,
                role: user.role,
            }
        });
    }
    catch (error) {
        console.error('Erro no login:', error);
        return res.status(500).json({ error: 'Erro interno no servidor.' });
    }
});
// Registro público — self-service da Landing Page
// Qualquer pessoa pode criar uma conta gratuita.
// Criação de usuários Admin deve ser feita via painel com autenticação.
router.post('/register', async (req, res) => {
    try {
        const { nome, email, senha } = req.body;
        if (!nome?.trim() || !email?.trim() || !senha) {
            return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios.' });
        }
        if (senha.length < 6) {
            return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres.' });
        }
        const existingUser = await prisma_1.prisma.usuario.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: 'Este e-mail já está em uso.' });
        }
        const salt = await bcryptjs_1.default.genSalt(10);
        const hashedPassword = await bcryptjs_1.default.hash(senha, salt);
        const newUser = await prisma_1.prisma.usuario.create({
            data: {
                nome: nome.trim(),
                email: email.trim().toLowerCase(),
                senha: hashedPassword,
                role: 'Operador', // Novos usuários públicos sempre começam como Operador
                plano: 'free', // Plano gratuito por padrão
            },
        });
        return res.status(201).json({
            id: newUser.id,
            nome: newUser.nome,
            email: newUser.email,
            role: newUser.role,
            plano: newUser.plano,
        });
    }
    catch (error) {
        console.error('Erro no registro:', error);
        return res.status(500).json({ error: 'Erro interno no servidor.' });
    }
});
exports.authRoutes = router;
//# sourceMappingURL=auth.js.map