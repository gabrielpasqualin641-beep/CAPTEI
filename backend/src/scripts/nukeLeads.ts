import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  console.log('⏳ Iniciando limpeza total do banco de dados...')
  
  // Deleta na ordem correta devido às chaves estrangeiras (Foreign Keys)
  const interacoes = await prisma.interacao.deleteMany()
  console.log(`❌ Interações removidas: ${interacoes.count}`)

  const envios = await prisma.envio.deleteMany()
  console.log(`❌ Envios removidos: ${envios.count}`)

  const leads = await prisma.lead.deleteMany()
  console.log(`❌ Total de Leads removidos do CRM: ${leads.count}`)

  try {
    // Tenta limpar também os logs de varreduras se o modelo existir
    if ('varreduraJob' in prisma) {
      const varreduras = await prisma.varreduraJob.deleteMany()
      console.log(`❌ Varreduras removidas: ${varreduras.count}`)
    }
  } catch (e) {
    console.warn('⚠️ Não foi possível limpar varreduras:', e)
  }

  console.log('✅ Limpeza total concluída!')
}

main()
  .catch(e => {
    console.error('❌ Erro na limpeza total:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
