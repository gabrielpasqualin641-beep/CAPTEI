/**
 * campaignWorker.ts
 *
 * Entry-point stand-alone para o Worker de Campanhas.
 * Pode ser iniciado separadamente do server principal com:
 *   npm run worker
 *
 * O worker real já está implementado em src/lib/queue.ts.
 * Este arquivo apenas importa e mantém o processo vivo.
 */
import dotenv from 'dotenv';
dotenv.config();

// Importar o worker (que se auto-registra ao ser importado)
import { campanhaWorker } from '../lib/queue';

console.log('═══════════════════════════════════════════════');
console.log('  🚀 Captei Campaign Worker — Iniciado');
console.log('  📋 Fila: CampanhaQueue');
console.log('  ⏳ Aguardando jobs...');
console.log('═══════════════════════════════════════════════');

// Graceful shutdown
const shutdown = async () => {
  console.log('\n[Worker] Encerrando graciosamente...');
  await campanhaWorker.close();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Mantém o processo vivo
setInterval(() => {}, 1 << 30);
