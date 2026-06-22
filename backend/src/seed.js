"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('Iniciando seed de dados...');
    let admin = await prisma.usuario.findUnique({
        where: { email: 'admin@agencia.com' }
    });
    if (!admin) {
        const salt = await bcryptjs_1.default.genSalt(10);
        const hashedPassword = await bcryptjs_1.default.hash('admin123', salt);
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
//# sourceMappingURL=seed.js.map