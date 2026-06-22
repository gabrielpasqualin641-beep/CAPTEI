import { Response, NextFunction } from 'express';
import { PLANOS, PlanKey } from '../config/planos';
import { AuthRequest } from './auth';
/**
 * SEGURANÇA (Anti-IDOR): Usamos o cliente Prisma estendido com RLS em vez de
 * instanciar new PrismaClient() diretamente. Isso garante que todas as contagens
 * de recursos (instâncias, templates, campanhas, leads) retornem apenas os registros
 * pertencentes ao tenant ativo, impedindo que um tenant "enxergue" dados de outro
 * e impedindo o bypass de limites de plano por contagem global.
 */
import { prisma } from '../lib/prisma';

// 1. checkLimiteDisparos
export async function checkLimiteDisparos(req: AuthRequest, res: Response, next: NextFunction): Promise<any> {
  try {
    const usuarioId = req.user?.id;
    if (!usuarioId) {
      return res.status(401).json({ erro: 'Não autorizado', mensagem: 'Usuário não autenticado' });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioId }
    });

    if (!usuario) {
      return res.status(404).json({ erro: 'Não encontrado', mensagem: 'Usuário não encontrado' });
    }

    const planoAtual = (usuario.plano || 'free') as PlanKey;
    const limites = PLANOS[planoAtual];

    if (!limites) {
      return res.status(400).json({ erro: 'Erro de plano', mensagem: 'Plano inválido' });
    }

    if (limites.disparos_mes !== -1 && usuario.disparos_mes >= limites.disparos_mes) {
      return res.status(403).json({
        erro: 'Limite atingido',
        mensagem: `Você atingiu o limite de disparos mensais do seu plano (${limites.disparos_mes} disparos). Faça um upgrade para continuar.`
      });
    }

    next();
  } catch (error) {
    console.error('Erro no middleware checkLimiteDisparos:', error);
    res.status(500).json({ erro: 'Erro interno', mensagem: 'Erro interno no controle de limites de disparos' });
  }
}

// 2. checkAcessoRecurso
export function checkAcessoRecurso(recurso: keyof typeof PLANOS['free']) {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<any> => {
    try {
      const usuarioId = req.user?.id;
      if (!usuarioId) {
        return res.status(401).json({ erro: 'Não autorizado', mensagem: 'Usuário não autenticado' });
      }

      const usuario = await prisma.usuario.findUnique({
        where: { id: usuarioId }
      });

      if (!usuario) {
        return res.status(404).json({ erro: 'Não encontrado', mensagem: 'Usuário não encontrado' });
      }

      const planoAtual = (usuario.plano || 'free') as PlanKey;
      const limites = PLANOS[planoAtual];

      if (!limites) {
        return res.status(400).json({ erro: 'Erro de plano', mensagem: 'Plano inválido' });
      }

      const valorLimite = limites[recurso];

      // Se for booleano
      if (typeof valorLimite === 'boolean') {
        if (!valorLimite) {
          return res.status(403).json({
            erro: 'Recurso indisponível',
            mensagem: `A funcionalidade '${recurso}' não está disponível no plano ${limites.nome}. Faça um upgrade para acessar.`
          });
        }
      }

      // Se for numérico
      if (typeof valorLimite === 'number') {
        if (valorLimite !== -1) {
          if (recurso === 'instancias') {
            const total = await prisma.instancia.count();
            if (total >= valorLimite) {
              return res.status(403).json({
                erro: 'Limite atingido',
                mensagem: `Limite de instâncias atingido para o plano ${limites.nome} (${valorLimite} instâncias). Remova instâncias ou faça um upgrade.`
              });
            }
          }
          if (recurso === 'templates') {
            const total = await prisma.template.count();
            if (total >= valorLimite) {
              return res.status(403).json({
                erro: 'Limite atingido',
                mensagem: `Limite de templates atingido para o plano ${limites.nome} (${valorLimite} templates). Remova templates ou faça um upgrade.`
              });
            }
          }
          if (recurso === 'campanhas') {
            const total = await prisma.campanha.count({ where: { ativo: true } });
            if (total >= valorLimite) {
              return res.status(403).json({
                erro: 'Limite atingido',
                mensagem: `Limite de campanhas ativas atingido para o plano ${limites.nome} (${valorLimite} campanhas). Remova campanhas ou faça um upgrade.`
              });
            }
          }
          if (recurso === 'leads') {
            const total = await prisma.lead.count({ where: { ativo: true } });
            if (total >= valorLimite) {
              return res.status(403).json({
                erro: 'Limite atingido',
                mensagem: `Limite de leads atingido para o plano ${limites.nome} (${valorLimite} leads). Faça um upgrade para poder cadastrar mais leads.`
              });
            }
          }
        }
      }

      next();
    } catch (error) {
      console.error('Erro no middleware checkAcessoRecurso:', error);
      res.status(500).json({ erro: 'Erro interno', mensagem: 'Erro interno no controle de recursos do plano' });
    }
  };
}
