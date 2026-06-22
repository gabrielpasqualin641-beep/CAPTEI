import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const BLACKLIST = [
  'nuvemshop',
  'shopify',
  '404',
  'error',
  'página não',
  'central de atendimento',
  'loja de aplicativos',
  'desenvolvimento',
  'configuração',
  'checklist',
  'trabalhe na',
  'pinterest',
  'construa sua visão',
  'migrar',
  'grátis: crie',
];

async function main() {
  const leads = await prisma.lead.findMany();
  let removidos = 0;
  for (const lead of leads) {
    const nomeMin = lead.nome.toLowerCase();
    const deveRemover =
      BLACKLIST.some(p => nomeMin.includes(p)) ||
      (lead.telefone && lead.telefone.startsWith('SEM_')) ||
      lead.site?.includes('www.nuvemshop.com.br') ||
      lead.site?.includes('www.shopify.com');
    if (deveRemover) {
      await prisma.interacao.deleteMany({ where: { lead_id: lead.id } });
      await prisma.envio.deleteMany({ where: { lead_id: lead.id } });
      await prisma.lead.delete({ where: { id: lead.id } });
      removidos++;
      console.log(`Removido: ${lead.nome}`);
    }
  }
  console.log(`\nTotal removidos: ${removidos}`);
  await prisma.$disconnect();
}

main();
