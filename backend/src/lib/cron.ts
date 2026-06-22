import cron from 'node-cron';
import { prisma } from './prisma';

// Cron job para rodar todo dia 1 do mês às 00:00 (meia-noite) e resetar disparos_mes de todos os usuários
export function initCronJobs() {
  console.log('⏰ Inicializando Cron Jobs...');
  
  // Cron expressão: 0 0 1 * * (Minuto 0, Hora 0, Dia do mês 1, Qualquer mês, Qualquer dia da semana)
  cron.schedule('0 0 1 * *', async () => {
    console.log('⏰ [Cron] Resetando disparos_mes de todos os usuários para o novo mês...');
    try {
      const result = await prisma.usuario.updateMany({
        data: {
          disparos_mes: 0
        }
      });
      console.log(`⏰ [Cron] Sucesso! Contador de disparos zerado para ${result.count} usuários.`);
    } catch (error) {
      console.error('⏰ [Cron] Erro ao resetar disparos_mes no início do mês:', error);
    }
  });
}
