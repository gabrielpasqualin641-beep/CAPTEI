"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = exports.tenantStorage = void 0;
exports.bypassTenantIsolation = bypassTenantIsolation;
const client_1 = require("@prisma/client");
const async_hooks_1 = require("async_hooks");
/**
 * tenantStorage
 *
 * AsyncLocalStorage nativo para armazenar o context do usuário/sistema
 * de forma assíncrona persistente sem precisar passá-lo manualmente.
 */
exports.tenantStorage = new async_hooks_1.AsyncLocalStorage();
/**
 * bypassTenantIsolation
 *
 * Função utilitária para contornar temporariamente o isolamento de tenant.
 * Muito útil para webhooks (ex: Evolution API, Mercado Pago) e scripts do sistema/workers
 * que operam em nível administrativo.
 */
function bypassTenantIsolation(callback) {
    return exports.tenantStorage.run({ isSystem: true }, async () => {
        return callback();
    });
}
const basePrisma = new client_1.PrismaClient();
// Modelos globais/sistema que estão isentos do isolamento de tenant
const globalModels = ['Usuario', 'FollowupSequencia', 'Envio', 'Interacao'];
/**
 * prisma (Client Estendido)
 *
 * Extensão do cliente Prisma para aplicar segurança Row-Level (RLS) de forma centralizada.
 * Qualquer query (leitura ou escrita) feita em models dependentes de tenant adicionará
 * automaticamente o filtro de "userId".
 */
exports.prisma = basePrisma.$extends({
    query: {
        $allModels: {
            async $allOperations({ model, operation, args, query }) {
                if (globalModels.includes(model)) {
                    return query(args);
                }
                const context = exports.tenantStorage.getStore();
                // Se o contexto do sistema/webhook estiver habilitado, realiza o bypass seguro
                if (context?.isSystem === true) {
                    return query(args);
                }
                const tenantId = context?.userId;
                // Se não houver contexto de tenant válido para o modelo protegido, lança um erro para evitar tenant leaks
                if (!tenantId) {
                    throw new Error(`Acesso Bloqueado: Tentativa de acessar/modificar o modelo protegido por tenant '${model}' sem contexto ativo ou bypass de sistema.`);
                }
                const typedArgs = args;
                // Injeta o userId nas operações de leitura (filtros de busca)
                if (operation === 'findMany' ||
                    operation === 'findFirst' ||
                    operation === 'findUnique' ||
                    operation === 'count' ||
                    operation === 'aggregate' ||
                    operation === 'groupBy') {
                    typedArgs.where = typedArgs.where || {};
                    typedArgs.where.userId = tenantId;
                }
                // Injeta o userId nas operações de alteração/exclusão (impede que edite outro tenant)
                else if (operation === 'update' ||
                    operation === 'updateMany' ||
                    operation === 'delete' ||
                    operation === 'deleteMany') {
                    typedArgs.where = typedArgs.where || {};
                    typedArgs.where.userId = tenantId;
                }
                // Injeta o userId na inserção (garante que novos registros pertencem ao tenant logado)
                else if (operation === 'create') {
                    typedArgs.data = typedArgs.data || {};
                    typedArgs.data.userId = tenantId;
                }
                else if (operation === 'createMany') {
                    if (Array.isArray(typedArgs.data)) {
                        typedArgs.data.forEach((item) => {
                            item.userId = tenantId;
                        });
                    }
                    else {
                        typedArgs.data = typedArgs.data || {};
                        typedArgs.data.userId = tenantId;
                    }
                }
                else if (operation === 'upsert') {
                    typedArgs.create = typedArgs.create || {};
                    typedArgs.create.userId = tenantId;
                    typedArgs.where = typedArgs.where || {};
                    typedArgs.where.userId = tenantId;
                }
                return query(args);
            }
        }
    }
});
//# sourceMappingURL=prisma.js.map