"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initCronJobs = initCronJobs;
const node_cron_1 = __importDefault(require("node-cron"));
const prisma_1 = require("./prisma");
// Cron job para rodar todo dia 1 do mês às 00:00 (meia-noite) e resetar disparos_mes de todos os usuários
function initCronJobs() {
    console.log('⏰ Inicializando Cron Jobs...');
    // Cron expressão: 0 0 1 * * (Minuto 0, Hora 0, Dia do mês 1, Qualquer mês, Qualquer dia da semana)
    node_cron_1.default.schedule('0 0 1 * *', async () => {
        console.log('⏰ [Cron] Resetando disparos_mes de todos os usuários para o novo mês...');
        try {
            const result = await prisma_1.prisma.usuario.updateMany({
                data: {
                    disparos_mes: 0
                }
            });
            console.log(`⏰ [Cron] Sucesso! Contador de disparos zerado para ${result.count} usuários.`);
        }
        catch (error) {
            console.error('⏰ [Cron] Erro ao resetar disparos_mes no início do mês:', error);
        }
    });
}
//# sourceMappingURL=cron.js.map