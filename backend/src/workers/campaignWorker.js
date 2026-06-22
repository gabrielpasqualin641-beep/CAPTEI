"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
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
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Importar o worker (que se auto-registra ao ser importado)
const queue_1 = require("../lib/queue");
console.log('═══════════════════════════════════════════════');
console.log('  🚀 Captei Campaign Worker — Iniciado');
console.log('  📋 Fila: CampanhaQueue');
console.log('  ⏳ Aguardando jobs...');
console.log('═══════════════════════════════════════════════');
// Graceful shutdown
const shutdown = async () => {
    console.log('\n[Worker] Encerrando graciosamente...');
    await queue_1.campanhaWorker.close();
    process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
// Mantém o processo vivo
setInterval(() => { }, 1 << 30);
//# sourceMappingURL=campaignWorker.js.map