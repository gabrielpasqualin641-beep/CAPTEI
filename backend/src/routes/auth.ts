import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';

const router = Router();

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body;

    const normalizedEmail = email?.trim().toLowerCase();
    const user = await prisma.usuario.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    const normalizedSenha = senha?.trim() || '';
    const isValid = await bcrypt.compare(normalizedSenha, user.senha);
    if (!isValid) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '1d' }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        role: user.role,
      }
    });
  } catch (error) {
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

    const existingUser = await prisma.usuario.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Este e-mail já está em uso.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(senha, salt);

    const newUser = await prisma.usuario.create({
      data: {
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        senha: hashedPassword,
        role: 'Operador',   // Novos usuários públicos sempre começam como Operador
        plano: 'free',      // Plano gratuito por padrão
      },
    });

    return res.status(201).json({
      id: newUser.id,
      nome: newUser.nome,
      email: newUser.email,
      role: newUser.role,
      plano: newUser.plano,
    });
  } catch (error) {
    console.error('Erro no registro:', error);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
});


export const authRoutes = router;
