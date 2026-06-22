import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = Router();

// Listar templates
router.get('/', authenticate, async (req, res) => {
  try {
    const templates = await prisma.template.findMany({
      orderBy: { criado_em: 'desc' },
      include: {
        sequencias: {
          orderBy: { ordem: 'asc' }
        }
      }
    });
    return res.json(templates);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao buscar templates.' });
  }
});

// Criar template
router.post('/', authenticate, async (req: any, res) => {
  try {
    const { nome, nicho, conteudo, variaveis, sequencias } = req.body;
    const tenantId = req.user?.id || 'default';

    const template = await prisma.template.create({
      data: {
        userId: tenantId,
        nome,
        nicho,
        conteudo,
        variaveis: variaveis || [],
        sequencias: {
          create: sequencias?.map((seq: any, index: number) => ({
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
  } catch (error) {
    console.error('Erro ao criar template:', error);
    return res.status(500).json({ error: 'Erro ao criar template.' });
  }
});

export const templatesRoutes = router;
