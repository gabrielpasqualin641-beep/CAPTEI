"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCampanhaSchema = void 0;
const zod_1 = require("zod");
/**
 * createCampanhaSchema
 *
 * Schema de validação estrita para criação de campanhas de prospecção.
 * Garante higienização de strings, formatos de UUID válidos, e integridade lógica.
 */
exports.createCampanhaSchema = zod_1.z.object({
    body: zod_1.z.object({
        nome: zod_1.z
            .string()
            .trim()
            .min(3, 'O nome deve conter pelo menos 3 caracteres.')
            .max(100, 'O nome deve conter no máximo 100 caracteres.'),
        instancia_id: zod_1.z
            .string()
            .uuid('Formato de ID de instância inválido (deve ser UUID).'),
        template_id: zod_1.z
            .string()
            .uuid('Formato de ID de template inválido (deve ser UUID).'),
        leads_ids: zod_1.z
            .array(zod_1.z.string().uuid('ID de lead inválido no lote.'))
            .min(1, 'Selecione pelo menos 1 lead para iniciar a campanha.'),
        janela_inicio: zod_1.z
            .string()
            .regex(/^\d{2}:\d{2}$/, 'Formato de horário de início inválido (use HH:MM).')
            .default('09:00'),
        janela_fim: zod_1.z
            .string()
            .regex(/^\d{2}:\d{2}$/, 'Formato de horário de término inválido (use HH:MM).')
            .default('18:00'),
        dias_semana: zod_1.z
            .array(zod_1.z.number().min(0).max(6))
            .min(1, 'Defina pelo menos um dia da semana para envio.')
            .default([1, 2, 3, 4, 5]),
        delay_min: zod_1.z
            .number()
            .min(5, 'O delay mínimo deve ser de pelo menos 5 segundos.')
            .default(30),
        delay_max: zod_1.z
            .number()
            .min(5, 'O delay máximo deve ser de pelo menos 5 segundos.')
            .default(120),
    }).refine((data) => data.delay_max >= data.delay_min, {
        message: 'O delay máximo não pode ser menor do que o delay mínimo.',
        path: ['delay_max'],
    }),
});
//# sourceMappingURL=campaign.schema.js.map