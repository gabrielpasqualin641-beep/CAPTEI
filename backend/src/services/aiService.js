"use strict";
/**
 * aiService.ts
 *
 * Serviço de classificação de intenção e resumo de mensagens de leads.
 * Suporta OpenAI, Ollama (local) e um classificador local baseado em regras (fallback).
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIService = void 0;
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const DEFAULT_SYSTEM_PROMPT = `
Você é uma inteligência artificial especializada em classificar a intenção de leads de vendas no WhatsApp.
Analise a mensagem recebida e classifique-a estritamente em uma das seguintes intenções:
- "positivo": demonstrar interesse, perguntar preço, pedir apresentação/proposta, aceitar agendamento, etc.
- "negativo": recusar proposta, pedir para parar de mandar mensagens (opt-out), ofensas, etc.
- "duvida": fazer uma pergunta sobre o funcionamento do produto/serviço ou sobre a empresa.
- "neutro": respostas vazias, sem nexo, piadas ou incompreensíveis.

Além disso, faça um resumo de 1 parágrafo muito curto da mensagem do lead.

Você DEVE responder APENAS com um objeto JSON válido, sem markdown ou explicações externas, no formato:
{
  "intencao": "positivo" | "negativo" | "duvida" | "neutro",
  "resumo": "breve resumo da mensagem do lead"
}
`;
class AIService {
    /**
     * Classifica a intenção de uma mensagem do lead.
     */
    static async classifyResponse(messageText, customPrompt) {
        const systemPrompt = customPrompt || DEFAULT_SYSTEM_PROMPT;
        // 1. Tenta OpenAI
        if (process.env.OPENAI_API_KEY) {
            try {
                console.log('[AIService] 🤖 Utilizando OpenAI para classificação...');
                const response = await axios_1.default.post('https://api.openai.com/v1/chat/completions', {
                    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: `Mensagem do lead: "${messageText}"` }
                    ],
                    response_format: { type: 'json_object' },
                    temperature: 0.1
                }, {
                    headers: {
                        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                });
                const content = response.data.choices?.[0]?.message?.content;
                if (content) {
                    const parsed = JSON.parse(content);
                    if (parsed.intencao && parsed.resumo) {
                        return parsed;
                    }
                }
            }
            catch (err) {
                console.error('[AIService] ❌ Falha na API da OpenAI:', err.message);
            }
        }
        // 2. Tenta Ollama
        if (process.env.OLLAMA_URL) {
            try {
                console.log('[AIService] 🤖 Utilizando Ollama para classificação...');
                const response = await axios_1.default.post(`${process.env.OLLAMA_URL}/api/chat`, {
                    model: process.env.OLLAMA_MODEL || 'llama3',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: `Mensagem do lead: "${messageText}"` }
                    ],
                    stream: false,
                    format: 'json'
                }, {
                    timeout: 15000
                });
                const content = response.data.message?.content;
                if (content) {
                    const parsed = JSON.parse(content);
                    if (parsed.intencao && parsed.resumo) {
                        return parsed;
                    }
                }
            }
            catch (err) {
                console.error('[AIService] ❌ Falha no Ollama:', err.message);
            }
        }
        // 3. Fallback: Heurística / Classificador Local
        console.log('[AIService] ⚠️  Utilizando classificador heuristic/mock local...');
        return this.heuristicClassify(messageText);
    }
    /**
     * Classificação heurística local baseada em palavras-chave.
     */
    static heuristicClassify(messageText) {
        const text = messageText.toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim();
        // Opt-out / Negativo
        if (text === 'sair' ||
            text === 'pare' ||
            text === 'nao' ||
            text === 'stop' ||
            text === 'unsubscribe' ||
            text.includes('nao tenho interesse') ||
            text.includes('remover') ||
            text.includes('nao mande') ||
            text.includes('excluir')) {
            return {
                intencao: 'negativo',
                resumo: 'Lead expressou desejo de não receber mais contatos (opt-out) ou recusou diretamente.'
            };
        }
        // Positivo
        if (text.includes('sim') ||
            text.includes('quero') ||
            text.includes('tenho interesse') ||
            text.includes('preco') ||
            text.includes('valor') ||
            text.includes('quanto custa') ||
            text.includes('agendar') ||
            text.includes('marcar') ||
            text.includes('reuniao') ||
            text.includes('me liga') ||
            text.includes('me ligue') ||
            text.includes('pode falar') ||
            text.includes('tenho sim')) {
            return {
                intencao: 'positivo',
                resumo: 'Lead expressou interesse ou fez perguntas sobre preço/agendamento.'
            };
        }
        // Dúvida
        if (text.includes('?') ||
            text.includes('como funciona') ||
            text.includes('quem e') ||
            text.includes('do que se trata') ||
            text.includes('qual o objetivo')) {
            return {
                intencao: 'duvida',
                resumo: 'Lead demonstrou dúvidas ou perguntou sobre o funcionamento do produto/serviço.'
            };
        }
        // Neutro / Padrão
        return {
            intencao: 'neutro',
            resumo: 'Lead enviou uma resposta que não indica claramente interesse, rejeição ou dúvida específica.'
        };
    }
}
exports.AIService = AIService;
//# sourceMappingURL=aiService.js.map