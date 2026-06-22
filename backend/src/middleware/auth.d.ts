import { Request, Response, NextFunction } from 'express';
export interface AuthRequest extends Request {
    user?: {
        id: string;
        role: string;
    };
}
export declare const authenticate: (req: AuthRequest, res: Response, next: NextFunction) => void;
/**
 * Middleware para identificar requisições de webhook ou sistema
 * e aplicar o bypass de isolamento de tenant com segurança no AsyncLocalStorage.
 */
export declare const systemBypassMiddleware: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.d.ts.map