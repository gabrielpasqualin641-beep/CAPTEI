"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = void 0;
const zod_1 = require("zod");
/**
 * validate
 *
 * Middleware genérico de validação usando Zod.
 * Recebe um Zod schema e valida os componentes 'body', 'query', e 'params' da requisição.
 * Se houver algum erro, retorna status 400 com os detalhes de validação estruturados.
 */
const validate = (schema) => {
    return async (req, res, next) => {
        try {
            const parsed = await schema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params,
            });
            // Atribui os dados validados e sanitizados de volta à requisição
            req.body = parsed.body;
            req.query = parsed.query;
            req.params = parsed.params;
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                res.status(400).json({
                    error: 'Erro de validação de dados.',
                    detalhes: error.issues.map((err) => ({
                        campo: err.path.slice(1).join('.'), // Remove o prefixo 'body'/'query'/'params' do path
                        mensagem: err.message,
                    })),
                });
                return;
            }
            res.status(500).json({ error: 'Erro interno no processamento de validação.' });
        }
    };
};
exports.validate = validate;
//# sourceMappingURL=validate.js.map