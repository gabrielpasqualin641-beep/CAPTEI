/**
 * aiService.ts
 *
 * Serviço de classificação de intenção e resumo de mensagens de leads.
 * Suporta OpenAI, Ollama (local) e um classificador local baseado em regras (fallback).
 */
export interface AIClassificationResult {
    intencao: 'positivo' | 'negativo' | 'duvida' | 'neutro';
    resumo: string;
}
export declare class AIService {
    /**
     * Classifica a intenção de uma mensagem do lead.
     */
    static classifyResponse(messageText: string, customPrompt?: string): Promise<AIClassificationResult>;
    /**
     * Classificação heurística local baseada em palavras-chave.
     */
    private static heuristicClassify;
}
//# sourceMappingURL=aiService.d.ts.map