export interface GoogleMapsSearchResult {
    id_google?: string;
    nome: string;
    telefone: string;
    endereco: string;
    bairro: string;
    cidade: string;
    site: string | null;
    avaliacao?: number;
    total_reviews?: number;
}
export declare class GoogleMapsService {
    private static readonly API_URL;
    /**
     * Limpa e formata o telefone para o padrão do WhatsApp (apenas números, com DDI +55 se for brasileiro)
     */
    private static formatWhatsAppNumber;
    /**
     * Busca leads usando a API oficial Text Search (New) do Google Places
     */
    static searchPlaces(query: string, location: string): Promise<GoogleMapsSearchResult[]>;
}
//# sourceMappingURL=GoogleMapsService.d.ts.map