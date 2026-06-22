import { z } from 'zod';

/**
 * createCampanhaSchema
 * 
 * Schema de validação estrita para criação de campanhas de prospecção.
 * Garante higienização de strings, formatos de UUID válidos, e integridade lógica.
 */
export const createCampanhaSchema = z.object({
  body: z.object({
    nome: z
      .string()
      .trim()
      .min(3, 'O nome deve conter pelo menos 3 caracteres.')
      .max(100, 'O nome deve conter no máximo 100 caracteres.'),
    
    instancia_id: z
      .string()
      .uuid('Formato de ID de instância inválido (deve ser UUID).'),
    
    template_id: z
      .string()
      .uuid('Formato de ID de template inválido (deve ser UUID).'),
    
    leads_ids: z
      .array(z.string().uuid('ID de lead inválido no lote.'))
      .min(1, 'Selecione pelo menos 1 lead para iniciar a campanha.'),
    
    janela_inicio: z
      .string()
      .regex(/^\d{2}:\d{2}$/, 'Formato de horário de início inválido (use HH:MM).')
      .default('09:00'),
    
    janela_fim: z
      .string()
      .regex(/^\d{2}:\d{2}$/, 'Formato de horário de término inválido (use HH:MM).')
      .default('18:00'),
    
    dias_semana: z
      .array(z.number().min(0).max(6))
      .min(1, 'Defina pelo menos um dia da semana para envio.')
      .default([1, 2, 3, 4, 5]),
    
    delay_min: z
      .number()
      .min(5, 'O delay mínimo deve ser de pelo menos 5 segundos.')
      .default(30),
    
    delay_max: z
      .number()
      .min(5, 'O delay máximo deve ser de pelo menos 5 segundos.')
      .default(120),
  }).refine((data) => data.delay_max >= data.delay_min, {
    message: 'O delay máximo não pode ser menor do que o delay mínimo.',
    path: ['delay_max'],
  }),
});
