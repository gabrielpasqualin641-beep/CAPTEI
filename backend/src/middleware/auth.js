"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.systemBypassMiddleware = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("../lib/prisma");
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Não autorizado. Token ausente ou inválido.' });
        return;
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        // Injeta e encapsula o userId na execução assíncrona da requisição
        prisma_1.tenantStorage.run({ userId: decoded.id, isSystem: false }, () => {
            next();
        });
    }
    catch (error) {
        res.status(401).json({ error: 'Não autorizado. Token inválido.' });
    }
};
exports.authenticate = authenticate;
/**
 * Middleware para identificar requisições de webhook ou sistema
 * e aplicar o bypass de isolamento de tenant com segurança no AsyncLocalStorage.
 */
const systemBypassMiddleware = (req, res, next) => {
    prisma_1.tenantStorage.run({ isSystem: true }, () => {
        next();
    });
};
exports.systemBypassMiddleware = systemBypassMiddleware;
//# sourceMappingURL=auth.js.map