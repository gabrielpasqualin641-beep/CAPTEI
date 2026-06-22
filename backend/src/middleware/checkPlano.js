"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkLimiteDisparos = checkLimiteDisparos;
exports.checkAcessoRecurso = checkAcessoRecurso;
const planos_1 = require("../config/planos");
/**
 * SEGURANÇA (Anti-IDOR): Usamos o cliente Prisma estendido com RLS em vez de
 * instanciar new PrismaClient() diretamente. Isso garante que todas as contagens
 * de recursos (instâncias, templates, campanhas, leads) retornem apenas os registros
 * pertencentes ao tenant ativo, impedindo que um tenant "enxergue" dados de outro
 * e impedindo o bypass de limites de plano por contagem global.
 */
const prisma_1 = require("../lib/prisma");
// 1. checkLimiteDisparos
async function checkLimiteDisparos(req, res, next) {
    try {
        const usuarioId = req.user?.id;
        if (!usuarioId) {
            return res.status(401).json({ erro: 'Não autorizado', mensagem: 'Usuário não autenticado' });
        }
        const usuario = await prisma_1.prisma.usuario.findUnique({
            where: { id: usuarioId }
        });
        if (!usuario) {
            return res.status(404).json({ erro: 'Não encontrado', mensagem: 'Usuário não encontrado' });
        }
        const planoAtual = (usuario.plano || 'free');
        const limites = planos_1.PLANOS[planoAtual];
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
    }
    catch (error) {
        console.error('Erro no middleware checkLimiteDisparos:', error);
        res.status(500).json({ erro: 'Erro interno', mensagem: 'Erro interno no controle de limites de disparos' });
    }
}
// 2. checkAcessoRecurso
function checkAcessoRecurso(recurso) {
    return async (req, res, next) => {
        try {
            const usuarioId = req.user?.id;
            if (!usuarioId) {
                return res.status(401).json({ erro: 'Não autorizado', mensagem: 'Usuário não autenticado' });
            }
            const usuario = await prisma_1.prisma.usuario.findUnique({
                where: { id: usuarioId }
            });
            if (!usuario) {
                return res.status(404).json({ erro: 'Não encontrado', mensagem: 'Usuário não encontrado' });
            }
            const planoAtual = (usuario.plano || 'free');
            const limites = planos_1.PLANOS[planoAtual];
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
                        const total = await prisma_1.prisma.instancia.count();
                        if (total >= valorLimite) {
                            return res.status(403).json({
                                erro: 'Limite atingido',
                                mensagem: `Limite de instâncias atingido para o plano ${limites.nome} (${valorLimite} instâncias). Remova instâncias ou faça um upgrade.`
                            });
                        }
                    }
                    if (recurso === 'templates') {
                        const total = await prisma_1.prisma.template.count();
                        if (total >= valorLimite) {
                            return res.status(403).json({
                                erro: 'Limite atingido',
                                mensagem: `Limite de templates atingido para o plano ${limites.nome} (${valorLimite} templates). Remova templates ou faça um upgrade.`
                            });
                        }
                    }
                    if (recurso === 'campanhas') {
                        const total = await prisma_1.prisma.campanha.count({ where: { ativo: true } });
                        if (total >= valorLimite) {
                            return res.status(403).json({
                                erro: 'Limite atingido',
                                mensagem: `Limite de campanhas ativas atingido para o plano ${limites.nome} (${valorLimite} campanhas). Remova campanhas ou faça um upgrade.`
                            });
                        }
                    }
                    if (recurso === 'leads') {
                        const total = await prisma_1.prisma.lead.count({ where: { ativo: true } });
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
        }
        catch (error) {
            console.error('Erro no middleware checkAcessoRecurso:', error);
            res.status(500).json({ erro: 'Erro interno', mensagem: 'Erro interno no controle de recursos do plano' });
        }
    };
}
//# sourceMappingURL=checkPlano.js.map