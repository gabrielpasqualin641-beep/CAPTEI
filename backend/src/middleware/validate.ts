import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

/**
 * validate
 * 
 * Middleware genérico de validação usando Zod.
 * Recebe um Zod schema e valida os componentes 'body', 'query', e 'params' da requisição.
 * Se houver algum erro, retorna status 400 com os detalhes de validação estruturados.
 */
export const validate = (schema: z.ZodTypeAny) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      }) as any;

      // Atribui os dados validados e sanitizados de volta à requisição
      req.body = parsed.body;
      req.query = parsed.query;
      req.params = parsed.params;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
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
