"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleMapsService = void 0;
const axios_1 = __importDefault(require("axios"));
class GoogleMapsService {
    static API_URL = 'https://places.googleapis.com/v1/places:searchText';
    /**
     * Limpa e formata o telefone para o padrão do WhatsApp (apenas números, com DDI +55 se for brasileiro)
     */
    static formatWhatsAppNumber(phone) {
        if (!phone)
            return '';
        // Remove tudo que não for dígito
        let cleaned = phone.replace(/\D/g, '');
        // Se começar com 0 (ex: 051999999999), remove o 0
        if (cleaned.startsWith('0')) {
            cleaned = cleaned.substring(1);
        }
        // Se tiver 10 ou 11 dígitos, assumimos que é Brasil e adicionamos o 55
        if (cleaned.length === 10 || cleaned.length === 11) {
            cleaned = '55' + cleaned;
        }
        return cleaned;
    }
    /**
     * Busca leads usando a API oficial Text Search (New) do Google Places
     */
    static async searchPlaces(query, location) {
        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
            throw new Error('A chave da API do Google Maps (GOOGLE_MAPS_API_KEY) não está configurada no ambiente.');
        }
        const textQuery = `${query} em ${location}`;
        try {
            let allPlaces = [];
            let pageToken = undefined;
            const MAX_RESULTS = 60; // Teto de 60 leads por requisição
            while (allPlaces.length < MAX_RESULTS) {
                const payload = {
                    textQuery: textQuery,
                    languageCode: 'pt-BR',
                    pageSize: 20
                };
                if (pageToken) {
                    payload.pageToken = pageToken;
                }
                const response = await axios_1.default.post(this.API_URL, payload, {
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Goog-Api-Key': apiKey,
                        // Adicionamos nextPageToken ao FieldMask para receber o token de paginação
                        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.addressComponents,places.rating,places.userRatingCount,nextPageToken'
                    }
                });
                const places = response.data.places || [];
                allPlaces = allPlaces.concat(places);
                pageToken = response.data.nextPageToken;
                // Se não houver próxima página ou acabaram os resultados
                if (!pageToken || places.length === 0) {
                    break;
                }
            }
            return allPlaces.map((place) => {
                // Extrai o nome
                const nome = place.displayName?.text || 'Sem Nome';
                // Extrai o endereço completo
                const endereco = place.formattedAddress || '';
                // Extrai o telefone e formata para WhatsApp
                const rawPhone = place.internationalPhoneNumber || place.nationalPhoneNumber || '';
                const telefone = this.formatWhatsAppNumber(rawPhone);
                // Extrai Bairro e Cidade dos componentes de endereço
                let bairro = '';
                let cidadeResult = location;
                if (place.addressComponents && Array.isArray(place.addressComponents)) {
                    const bairroComponent = place.addressComponents.find((c) => c.types?.includes('sublocality') || c.types?.includes('sublocality_level_1') || c.types?.includes('neighborhood'));
                    if (bairroComponent) {
                        bairro = bairroComponent.longText;
                    }
                    const cidadeComponent = place.addressComponents.find((c) => c.types?.includes('administrative_area_level_2') || c.types?.includes('locality'));
                    if (cidadeComponent) {
                        cidadeResult = cidadeComponent.longText;
                    }
                }
                // Site ou Link
                const site = place.websiteUri || null;
                return {
                    id_google: place.id || Math.random().toString(36).substring(7),
                    nome,
                    telefone,
                    endereco,
                    bairro,
                    cidade: cidadeResult,
                    site,
                    avaliacao: place.rating,
                    total_reviews: place.userRatingCount
                };
            });
        }
        catch (error) {
            console.error('Erro na integração com Google Maps API:', error?.response?.data || error.message);
            console.warn('⚠️ Google Maps falhou. Ativando dados de teste (Mock)...');
            return [
                {
                    id_google: 'mock-demo-1',
                    nome: 'Restaurante Exemplo Demo',
                    telefone: '5511999999999',
                    endereco: 'Av. Paulista, 1000 - Bela Vista, São Paulo - SP',
                    bairro: 'Bela Vista',
                    cidade: 'São Paulo',
                    site: 'https://exemplo.com.br',
                    avaliacao: 4.8,
                    total_reviews: 124
                },
                {
                    id_google: 'mock-demo-2',
                    nome: 'Pizzaria Mamma Mia Teste',
                    telefone: '5551988882222',
                    endereco: 'Rua da Consolação, 200 - Consolação, São Paulo - SP',
                    bairro: 'Consolação',
                    cidade: 'São Paulo',
                    site: null,
                    avaliacao: 4.5,
                    total_reviews: 85
                },
                {
                    id_google: 'mock-demo-3',
                    nome: 'Hamburgueria Artesanal (Mock)',
                    telefone: '5551977773333',
                    endereco: 'Rua Augusta, 1500 - Cerqueira César, São Paulo - SP',
                    bairro: 'Cerqueira César',
                    cidade: 'São Paulo',
                    site: 'https://hamburgueriamock.com',
                    avaliacao: 4.9,
                    total_reviews: 250
                },
                {
                    id_google: 'mock-demo-4',
                    nome: 'Bistrô Sabor Real',
                    telefone: '5511955554444',
                    endereco: 'Rua Padre Chagas, 50 - Moinhos de Vento, Porto Alegre - RS',
                    bairro: 'Moinhos de Vento',
                    cidade: 'Porto Alegre',
                    site: null,
                    avaliacao: 4.7,
                    total_reviews: 94
                }
            ];
        }
    }
}
exports.GoogleMapsService = GoogleMapsService;
//# sourceMappingURL=GoogleMapsService.js.map