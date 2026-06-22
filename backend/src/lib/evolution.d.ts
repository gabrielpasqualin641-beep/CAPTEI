export declare const evolutionApi: {
    createInstance(instanceName: string): Promise<any>;
    getQrCode(instanceName: string): Promise<any>;
    getConnectionState(instanceName: string): Promise<any>;
    setWebhook(instanceName: string, webhookUrl: string): Promise<any>;
    sendText(instanceName: string, number: string, text: string, delay?: number): Promise<any>;
    sendMedia(instanceName: string, number: string, mediaUrl: string, mediaType: "image" | "audio" | "document", caption?: string, delay?: number): Promise<any>;
    sendButtons(instanceName: string, number: string, text: string, buttons: Array<{
        id: string;
        text: string;
    }>, delay?: number): Promise<any>;
};
//# sourceMappingURL=evolution.d.ts.map