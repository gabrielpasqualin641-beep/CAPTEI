// Script de teste para validar as melhorias no scraper de e-commerce
const axios = require('axios');

async function main() {
  try {
    // 1. Login para obter token
    console.log('🔐 Fazendo login...');
    const loginRes = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'admin@agencia.com',
      senha: 'admin123'
    });
    const token = loginRes.data.token;
    console.log('✅ Token obtido!\n');

    // 2. Teste da busca de e-commerce: "moda" em "São Paulo"
    console.log('🔍 Buscando e-commerces: nicho="moda", cidade="São Paulo"');
    console.log('⏳ Isso pode levar alguns minutos...\n');
    
    const startTime = Date.now();
    const res = await axios.post('http://localhost:3000/api/leads/scrape-ecommerce', {
      nicho: 'moda',
      cidade: 'São Paulo'
    }, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 300000 // 5 min timeout
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const leads = res.data.results;

    console.log(`\n${'='.repeat(70)}`);
    console.log(`📊 RESULTADOS - Tempo total: ${elapsed}s`);
    console.log(`${'='.repeat(70)}`);
    console.log(`Total de leads: ${leads.length}`);
    
    const completos = leads.filter(l => l.status_extracao?.includes('Completo'));
    const parciais = leads.filter(l => l.status_extracao?.includes('Parcial'));
    const semContato = leads.filter(l => l.status_extracao?.includes('Sem'));
    
    console.log(`✅ Completos: ${completos.length}`);
    console.log(`⚠️ Parciais: ${parciais.length}`);
    console.log(`❌ Sem contato: ${semContato.length}`);
    
    // Verificar formatação de telefone
    console.log(`\n📞 AMOSTRA DE TELEFONES:`);
    leads.filter(l => l.telefone).slice(0, 5).forEach(l => {
      console.log(`  ${l.nome}: ${l.telefone}`);
    });

    // Verificar emails
    console.log(`\n📧 AMOSTRA DE EMAILS:`);
    leads.filter(l => l.email).slice(0, 5).forEach(l => {
      console.log(`  ${l.nome}: ${l.email}`);
    });

    // Verificar ordenação (completos primeiro)
    console.log(`\n📋 ORDENAÇÃO (primeiros 5 vs últimos 5):`);
    console.log('  Primeiros:');
    leads.slice(0, 5).forEach(l => console.log(`    ${l.status_extracao} - ${l.nome}`));
    console.log('  Últimos:');
    leads.slice(-5).forEach(l => console.log(`    ${l.status_extracao} - ${l.nome}`));
    
    // Verificar duplicação
    const nomes = leads.map(l => l.nome.toLowerCase());
    const duplicados = nomes.filter((n, i) => nomes.indexOf(n) !== i);
    console.log(`\n🔄 Nomes duplicados encontrados: ${duplicados.length}`);
    if (duplicados.length > 0) console.log('  ', duplicados);
    
    // Meta: pelo menos 30 resultados limpos
    console.log(`\n${leads.length >= 30 ? '🎉 META ATINGIDA' : '⚠️ META NÃO ATINGIDA'}: ${leads.length}/30 leads`);

  } catch (err) {
    console.error('Erro:', err.response?.data || err.message);
  }
}

main();
