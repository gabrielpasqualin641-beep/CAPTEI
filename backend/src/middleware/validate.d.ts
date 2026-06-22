import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
/**
 * validate
 *
 * Middleware genérico de validação usando Zod.
 * Recebe um Zod schema e valida os componentes 'body', 'query', e 'params' da requisição.
 * Se houver algum erro, retorna status 400 com os detalhes de validação estruturados.
 */
export declare const validate: (schema: z.ZodTypeAny) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=validate.d.ts.map