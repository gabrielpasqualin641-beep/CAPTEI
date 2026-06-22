import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { tenantStorage } from '../lib/prisma';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Não autorizado. Token ausente ou inválido.' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string, role: string };
    req.user = decoded;
    
    // Injeta e encapsula o userId na execução assíncrona da requisição
    tenantStorage.run({ userId: decoded.id, isSystem: false }, () => {
      next();
    });
  } catch (error) {
    res.status(401).json({ error: 'Não autorizado. Token inválido.' });
  }
};

/**
 * Middleware para identificar requisições de webhook ou sistema
 * e aplicar o bypass de isolamento de tenant com segurança no AsyncLocalStorage.
 */
export const systemBypassMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  tenantStorage.run({ isSystem: true }, () => {
    next();
  });
};
