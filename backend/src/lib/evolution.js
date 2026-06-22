"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.evolutionApi = void 0;
const axios_1 = __importDefault(require("axios"));
const BASE_URL = process.env.EVOLUTION_API_URL;
const GLOBAL_API_KEY = process.env.EVOLUTION_API_KEY;
const apiClient = axios_1.default.create({
    baseURL: BASE_URL,
    headers: {
        apikey: GLOBAL_API_KEY,
        'Content-Type': 'application/json'
    }
});
exports.evolutionApi = {
    async createInstance(instanceName) {
        const { data } = await apiClient.post(`/instance/create`, {
            instanceName,
            token: instanceName,
            qrcode: true,
            integration: "WHATSAPP-BAILEYS"
        });
        return data;
    },
    async getQrCode(instanceName) {
        const { data } = await apiClient.get(`/instance/connect/${instanceName}`);
        return data;
    },
    async getConnectionState(instanceName) {
        const { data } = await apiClient.get(`/instance/connectionState/${instanceName}`);
        return data;
    },
    async setWebhook(instanceName, webhookUrl) {
        const { data } = await apiClient.post(`/webhook/set/${instanceName}`, {
            url: webhookUrl,
            webhook_by_events: false,
            webhook_base64: false,
            events: [
                "MESSAGES_UPSERT",
                "MESSAGES_UPDATE",
                "SEND_MESSAGE"
            ]
        });
        return data;
    },
    async sendText(instanceName, number, text, delay = 1000) {
        const { data } = await apiClient.post(`/message/sendText/${instanceName}`, {
            number,
            text,
            options: {
                delay,
                presence: "composing"
            }
        });
        return data;
    },
    async sendMedia(instanceName, number, mediaUrl, mediaType, caption, delay = 1000) {
        const isAudio = mediaType === 'audio';
        const payload = {
            number,
            mediatype: mediaType,
            media: mediaUrl,
            options: {
                delay,
                presence: isAudio ? "recording" : "composing"
            }
        };
        if (caption && mediaType !== 'audio') {
            payload.caption = caption;
        }
        const { data } = await apiClient.post(`/message/sendMedia/${instanceName}`, payload);
        return data;
    },
    async sendButtons(instanceName, number, text, buttons, delay = 1000) {
        const payload = {
            number,
            title: "",
            description: text,
            footer: "",
            buttons: buttons.map((b) => ({
                buttonId: b.id,
                buttonText: {
                    displayText: b.text
                },
                type: 1
            })),
            options: {
                delay,
                presence: "composing"
            }
        };
        const { data } = await apiClient.post(`/message/sendButtons/${instanceName}`, payload);
        return data;
    }
};
//# sourceMappingURL=evolution.js.map