import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  const filePath = path.join(__dirname, '../../../data/prospeccao_imobiliarias.csv');
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  
  const lines = fileContent.split('\n').filter(line => line.trim().length > 0);
  // Remove header
  lines.shift();

  // Busca o usuário admin para associar os leads importados
  const admin = await prisma.usuario.findFirst({
    where: { role: 'Admin' }
  });
  if (!admin) {
    throw new Error('Nenhum usuário admin encontrado para associar.');
  }
  const adminId = admin.id;
  let count = 0;

  for (const line of lines) {
    // Handling possible different spaces or hidden chars in CSV
    const parts = line.split(',');
    if (parts.length >= 3) {
      const empresa = parts[0].trim();
      const pontoAcesso = parts[1].trim();
      let numero = parts[2].replace(/\D/g, ''); // keep only digits
      
      // se nao tem ddd (menos de 10 digitos), assumimos 51 (RS) pelo padrao da planilha
      if (numero.length <= 9) {
        numero = '51' + numero;
      }
      
      // se nao tem ddi (55), adicionamos
      if (!numero.startsWith('55')) {
        numero = '55' + numero;
      }

      await prisma.lead.upsert({
        where: { telefone: numero },
        update: {
          nome: empresa,
          nicho: 'Imobiliária',
          notas: `Ponto de acesso: ${pontoAcesso}`
        },
        create: {
          userId: adminId,
          nome: empresa,
          telefone: numero,
          nicho: 'Imobiliária',
          notas: `Ponto de acesso: ${pontoAcesso}`,
          status: 'Novo'
        }
      });
      count++;
      console.log(`Inserido/Atualizado: ${empresa} (${numero})`);
    }
  }

  console.log(`\nImportação concluída! Total processado: ${count} leads.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
