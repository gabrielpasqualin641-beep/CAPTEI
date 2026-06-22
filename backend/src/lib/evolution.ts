import axios from 'axios';

const BASE_URL = process.env.EVOLUTION_API_URL;
const GLOBAL_API_KEY = process.env.EVOLUTION_API_KEY;

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    apikey: GLOBAL_API_KEY,
    'Content-Type': 'application/json'
  }
});

export const evolutionApi = {
  async createInstance(instanceName: string) {
    const { data } = await apiClient.post(`/instance/create`, {
      instanceName,
      token: instanceName,
      qrcode: true,
      integration: "WHATSAPP-BAILEYS"
    });
    return data;
  },

  async getQrCode(instanceName: string) {
    const { data } = await apiClient.get(`/instance/connect/${instanceName}`);
    return data;
  },

  async getConnectionState(instanceName: string) {
    const { data } = await apiClient.get(`/instance/connectionState/${instanceName}`);
    return data;
  },

  async setWebhook(instanceName: string, webhookUrl: string) {
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

  async sendText(instanceName: string, number: string, text: string, delay: number = 1000) {
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

  async sendMedia(
    instanceName: string,
    number: string,
    mediaUrl: string,
    mediaType: 'image' | 'audio' | 'document',
    caption?: string,
    delay: number = 1000
  ) {
    const isAudio = mediaType === 'audio';
    const payload: any = {
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

  async sendButtons(
    instanceName: string,
    number: string,
    text: string,
    buttons: Array<{ id: string; text: string }>,
    delay: number = 1000
  ) {
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
