export declare class EnrichmentService {
    /**
     * Enriches lead data using BrasilAPI. If it fails or no CNPJ is provided, falls back to mock data.
     */
    enrichLeadData(leadId: string, cnpj?: string): Promise<{
        success: boolean;
        source: string;
        lead: {
            id: string;
            userId: string;
            nome: string;
            telefone: string;
            endereco: string | null;
            cidade: string | null;
            nicho: string | null;
            site: string | null;
            email: string | null;
            plataforma: string | null;
            status_extracao: string | null;
            avaliacao: number | null;
            total_reviews: number | null;
            instagram: string | null;
            status: string;
            qualidade: string | null;
            tags: string[];
            notas: string | null;
            criado_em: Date;
            atualizado_em: Date;
            ativo: boolean;
            optOut: boolean;
            ia_intencao: string | null;
            ia_resumo: string | null;
        };
        enrichedFields: any;
    }>;
    /**
     * Generates a masked CPF for structural realism.
     */
    private generateMaskedCpf;
    /**
     * Calculates a simulated score based on company capital.
     */
    private calculateScoreFromCapital;
    /**
     * Generates dynamic and realistic mock data if API fails or no CNPJ.
     */
    private generateMockData;
    /**
     * Classifica a qualidade do Lead com base no capital social e na plataforma.
     */
    private calcularQualidadeEcom;
}
//# sourceMappingURL=enrichmentService.d.ts.map