const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

const prisma = new PrismaClient();
const API_URL = 'http://localhost:3000/api/enrichment';

// Importa o serviço diretamente para caso o servidor esteja offline
let EnrichmentService;
try {
  // Como o projeto usa TS, compilamos em tempo de execução usando ts-node/register se necessário,
  // ou simplesmente lemos do arquivo compilado se disponível. Caso contrário, importamos diretamente usando tsx/ts-node.
  require('ts-node/register');
  EnrichmentService = require('./src/services/enrichmentService').EnrichmentService;
} catch (e) {
  try {
    // Tenta carregar sem ts-node (caso o usuário rode direto com tsx)
    EnrichmentService = require('./src/services/enrichmentService').EnrichmentService;
  } catch (err) {
    // Fallback: Se falhar em carregar o TS diretamente no Node puro
    EnrichmentService = null;
  }
}

async function runTests() {
  console.log('🔄 Iniciando teste de enriquecimento de leads...');

  let testLeadId = '';
  let isTempLead = false;

  try {
    // 1. Obter ou criar um lead de teste no banco
    let lead = await prisma.lead.findFirst({
      where: { ativo: true }
    });

    if (!lead) {
      console.log('⚠️ Nenhum lead encontrado no banco. Criando um lead temporário para o teste...');
      lead = await prisma.lead.create({
        data: {
          nome: 'Empresa Teste LTDA',
          telefone: '5511999999999',
          status: 'Novo'
        }
      });
      isTempLead = true;
    }

    testLeadId = lead.id;
    console.log(`✅ Lead de teste selecionado. ID: ${testLeadId}`);

    // Verificar se o servidor está rodando
    let serverOnline = true;
    try {
      await axios.get('http://localhost:3000/health', { timeout: 1000 });
    } catch (e) {
      serverOnline = false;
      console.log('\n⚠️  ATENÇÃO: O servidor Express não está rodando na porta 3000.');
      if (EnrichmentService) {
        console.log('💡 Executando testes DIRETOS usando a classe EnrichmentService como fallback...\n');
      } else {
        console.log('❌ Não foi possível carregar a classe TypeScript diretamente. Certifique-se de que o servidor esteja rodando com "npm run dev" para testar via HTTP.\n');
      }
    }

    if (serverOnline) {
      // --- TESTE VIA HTTP ---
      console.log('\n--- TESTE 1: Enriquecimento via BrasilAPI (CNPJ: 00000000000191) ---');
      try {
        const response1 = await axios.post(`${API_URL}/${testLeadId}`, {
          cnpj: '00000000000191'
        });
        console.log('Status HTTP:', response1.status);
        console.log('Retorno:', JSON.stringify(response1.data, null, 2));
      } catch (err) {
        const errMsg = err.response ? JSON.stringify(err.response.data) : (err.code || err.message);
        console.error('❌ Erro no Teste 1:', errMsg);
      }

      console.log('\n--- TESTE 2: Fallback Automático / Dados Mockados (Body vazio) ---');
      try {
        const response2 = await axios.post(`${API_URL}/${testLeadId}`, {});
        console.log('Status HTTP:', response2.status);
        console.log('Retorno:', JSON.stringify(response2.data, null, 2));
      } catch (err) {
        const errMsg = err.response ? JSON.stringify(err.response.data) : (err.code || err.message);
        console.error('❌ Erro no Teste 2:', errMsg);
      }
    } else if (EnrichmentService) {
      // --- TESTE DIRETO DO SERVIÇO (Sem HTTP) ---
      const service = new EnrichmentService();

      console.log('\n--- TESTE 1 (DIRETO): Enriquecimento via BrasilAPI (CNPJ: 00000000000191) ---');
      try {
        const result1 = await service.enrichLeadData(testLeadId, '00000000000191');
        console.log('Resultado:', JSON.stringify(result1, null, 2));
      } catch (err) {
        console.error('❌ Erro no Teste 1 (Direto):', err.message || err);
      }

      console.log('\n--- TESTE 2 (DIRETO): Fallback Automático / Dados Mockados (CNPJ nulo) ---');
      try {
        const result2 = await service.enrichLeadData(testLeadId);
        console.log('Resultado:', JSON.stringify(result2, null, 2));
      } catch (err) {
        console.error('❌ Erro no Teste 2 (Direto):', err.message || err);
      }
    }

  } catch (error) {
    console.error('❌ Ocorreu um erro geral durante os testes:', error.message || error);
  } finally {
    // Limpar o lead temporário se foi criado
    if (isTempLead && testLeadId) {
      console.log('\n🧹 Limpando lead temporário criado para o teste...');
      await prisma.lead.delete({
        where: { id: testLeadId }
      }).catch(err => console.error('Erro ao deletar lead temporário:', err.message));
    }
    await prisma.$disconnect();
    console.log('\n🏁 Testes finalizados!');
  }
}

runTests();
