import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando seed de dados...');

  let admin = await prisma.usuario.findUnique({
    where: { email: 'admin@agencia.com' }
  });
  
  if (!admin) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);

    admin = await prisma.usuario.create({
      data: {
        nome: 'Admin',
        email: 'admin@agencia.com',
        senha: hashedPassword,
        role: 'Admin'
      }
    });
    console.log('Usuário admin criado (admin@agencia.com / admin123)');
  }

  const leads = await prisma.lead.count();
  if (leads === 0) {
    await prisma.lead.createMany({
      data: [
        {
          userId: admin.id,
          nome: 'Clinica Sorriso Real',
          telefone: '5511999999991',
          cidade: 'São Paulo, SP',
          nicho: 'Odontologia',
          status: 'Novo',
          tags: ['SP', 'Odonto']
        },
        {
          userId: admin.id,
          nome: 'Restaurante Sabor de Casa',
          telefone: '5511999999992',
          cidade: 'Campinas, SP',
          nicho: 'Restaurantes',
          status: 'Contatado',
          tags: ['SP', 'Restaurantes']
        }
      ]
    });
    console.log('Leads falsos criados.');
  }

  console.log('Seed concluído com sucesso!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
