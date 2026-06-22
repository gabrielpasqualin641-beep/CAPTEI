"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const extractNameFromUrl = (url) => {
    try {
        let cleanUrl = url;
        if (!cleanUrl.startsWith('http'))
            cleanUrl = 'https://' + cleanUrl;
        const hostname = new URL(cleanUrl).hostname;
        const parts = hostname.replace('www.', '').split('.');
        if (parts.length > 0) {
            const name = parts[0];
            return name.charAt(0).toUpperCase() + name.slice(1);
        }
    }
    catch (e) { }
    return url;
};
async function cleanNames() {
    console.log('Iniciando limpeza de nomes...');
    const leads = await prisma.lead.findMany();
    let updatedCount = 0;
    for (const lead of leads) {
        if (lead.nome.includes('http') || lead.nome.includes('.com')) {
            const novoNome = extractNameFromUrl(lead.nome);
            if (novoNome !== lead.nome) {
                await prisma.lead.update({
                    where: { id: lead.id },
                    data: { nome: novoNome }
                });
                console.log(`[ATUALIZADO] ${lead.nome} -> ${novoNome}`);
                updatedCount++;
            }
        }
    }
    console.log(`Limpeza concluída! ${updatedCount} leads atualizados.`);
}
cleanNames().catch(console.error).finally(() => prisma.$disconnect());
//# sourceMappingURL=clean-names.js.map