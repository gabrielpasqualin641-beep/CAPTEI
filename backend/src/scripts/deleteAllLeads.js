"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🗑️  Iniciando limpeza completa do banco...\n');
    // Ordem importa: primeiro as tabelas dependentes (FK), depois leads
    const interacoes = await prisma.interacao.deleteMany();
    console.log(`✅ Interações deletadas: ${interacoes.count}`);
    const envios = await prisma.envio.deleteMany();
    console.log(`✅ Envios deletados:     ${envios.count}`);
    const leads = await prisma.lead.deleteMany();
    console.log(`✅ Leads deletados:      ${leads.count}`);
    console.log('\n🏁 Limpeza concluída!');
    console.log(`   Total de registros removidos: ${interacoes.count + envios.count + leads.count}`);
}
main()
    .catch((e) => {
    console.error('❌ Erro:', e);
    process.exit(1);
})
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=deleteAllLeads.js.map