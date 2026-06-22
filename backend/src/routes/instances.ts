import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { evolutionApi } from '../lib/evolution';
import { checkAcessoRecurso } from '../middleware/checkPlano';

const router = Router();

// Listar instâncias
router.get('/', authenticate, async (req, res) => {
  try {
    const instancias = await prisma.instancia.findMany({
      orderBy: { criado_em: 'desc' }
    });

    // Opcional: Atualizar o status real delas batendo na API
    for (const inst of instancias) {
      if (inst.status !== 'desconectado') {
        try {
          const state = await evolutionApi.getConnectionState(inst.nome);
          const newState = state?.instance?.state || 'desconectado';
          if (newState !== inst.status) {
            await prisma.instancia.update({
              where: { id: inst.id },
              data: { status: newState }
            });
            inst.status = newState;
          }
        } catch (e) {
          // Ignorar se a instância não existe na API no momento
        }
      }
    }

    return res.json(instancias);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao buscar instâncias.' });
  }
});

// Criar nova instância
router.post('/', authenticate, checkAcessoRecurso('instancias'), async (req: any, res) => {
  try {
    const { nome } = req.body;
    const tenantId = req.user?.id || 'default';
    
    // 1. Criar na Evolution API primeiro
    await evolutionApi.createInstance(nome);

    // 2. Criar no banco apenas se der sucesso
    const novaInstancia = await prisma.instancia.create({
      data: {
        userId: tenantId,
        nome,
        status: 'aguardando_qr'
      }
    });

    return res.status(201).json(novaInstancia);
  } catch (error) {
    console.error('Erro ao criar instância:', error);
    return res.status(500).json({ error: 'Erro ao criar instância.' });
  }
});

// Obter QR Code
router.get('/:id/qrcode', authenticate, async (req, res) => {
  try {
    const instancia = await prisma.instancia.findUnique({
      where: { id: req.params.id as string }
    });

    if (!instancia) return res.status(404).json({ error: 'Instância não encontrada.' });

    const qrData = await evolutionApi.getQrCode(instancia.nome);
    
    return res.json({ base64: qrData?.base64 });
  } catch (error) {
    console.error('Erro ao buscar QR code:', error);
    return res.status(500).json({ error: 'Erro ao buscar QR Code.' });
  }
});

export const instancesRoutes = router;
