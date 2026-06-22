import { AsyncLocalStorage } from 'async_hooks';
/**
 * TenantContext
 *
 * Estrutura do contexto de tenant que é persistido de forma assíncrona nas requisições.
 */
export interface TenantContext {
    userId?: string;
    isSystem?: boolean;
}
/**
 * tenantStorage
 *
 * AsyncLocalStorage nativo para armazenar o context do usuário/sistema
 * de forma assíncrona persistente sem precisar passá-lo manualmente.
 */
export declare const tenantStorage: AsyncLocalStorage<TenantContext>;
/**
 * bypassTenantIsolation
 *
 * Função utilitária para contornar temporariamente o isolamento de tenant.
 * Muito útil para webhooks (ex: Evolution API, Mercado Pago) e scripts do sistema/workers
 * que operam em nível administrativo.
 */
export declare function bypassTenantIsolation<T>(callback: () => T | Promise<T>): Promise<T>;
/**
 * prisma (Client Estendido)
 *
 * Extensão do cliente Prisma para aplicar segurança Row-Level (RLS) de forma centralizada.
 * Qualquer query (leitura ou escrita) feita em models dependentes de tenant adicionará
 * automaticamente o filtro de "userId".
 */
export declare const prisma: import("@prisma/client/runtime/library").DynamicClientExtensionThis<import("@prisma/client").Prisma.TypeMap<import("@prisma/client/runtime/library").InternalArgs & {
    result: {};
    model: {};
    query: {};
    client: {};
}, {}>, import("@prisma/client").Prisma.TypeMapCb<import("@prisma/client").Prisma.PrismaClientOptions>, {
    result: {};
    model: {};
    query: {};
    client: {};
}>;
//# sourceMappingURL=prisma.d.ts.map