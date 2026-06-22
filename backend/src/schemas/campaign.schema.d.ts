import { z } from 'zod';
/**
 * createCampanhaSchema
 *
 * Schema de validação estrita para criação de campanhas de prospecção.
 * Garante higienização de strings, formatos de UUID válidos, e integridade lógica.
 */
export declare const createCampanhaSchema: z.ZodObject<{
    body: z.ZodObject<{
        nome: z.ZodString;
        instancia_id: z.ZodString;
        template_id: z.ZodString;
        leads_ids: z.ZodArray<z.ZodString>;
        janela_inicio: z.ZodDefault<z.ZodString>;
        janela_fim: z.ZodDefault<z.ZodString>;
        dias_semana: z.ZodDefault<z.ZodArray<z.ZodNumber>>;
        delay_min: z.ZodDefault<z.ZodNumber>;
        delay_max: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strip>;
}, z.core.$strip>;
//# sourceMappingURL=campaign.schema.d.ts.map