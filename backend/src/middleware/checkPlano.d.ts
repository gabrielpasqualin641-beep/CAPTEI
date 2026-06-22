import { Response, NextFunction } from 'express';
import { PLANOS } from '../config/planos';
import { AuthRequest } from './auth';
export declare function checkLimiteDisparos(req: AuthRequest, res: Response, next: NextFunction): Promise<any>;
export declare function checkAcessoRecurso(recurso: keyof typeof PLANOS['free']): (req: AuthRequest, res: Response, next: NextFunction) => Promise<any>;
//# sourceMappingURL=checkPlano.d.ts.map