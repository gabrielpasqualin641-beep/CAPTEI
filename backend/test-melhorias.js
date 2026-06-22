// Teste unitário das funções de melhoria (sem depender do banco de dados)
console.log('=== TESTES UNITÁRIOS DAS MELHORIAS ===\n');

// ── TESTE 1: Formatação de telefone ──
const formatPhone = (raw) => {
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length >= 12) digits = digits.substring(2);
  if (digits.length === 11) return `(${digits.substring(0, 2)}) ${digits.substring(2, 7)}-${digits.substring(7)}`;
  if (digits.length === 10) return `(${digits.substring(0, 2)}) ${digits.substring(2, 6)}-${digits.substring(6)}`;
  return raw;
};

console.log('📞 TESTE 1: Formatação de Telefone');
const phoneTests = [
  { input: '5511999887766', expected: '(11) 99988-7766' },
  { input: '11999887766', expected: '(11) 99988-7766' },
  { input: '1133445566', expected: '(11) 3344-5566' },
  { input: '+55 (11) 99999-1234', expected: '(11) 99999-1234' },
  { input: '551132101234', expected: '(11) 3210-1234' },
];
phoneTests.forEach(({ input, expected }) => {
  const result = formatPhone(input);
  const pass = result === expected;
  console.log(`  ${pass ? '✅' : '❌'} "${input}" → "${result}" ${pass ? '' : `(esperado: "${expected}")`}`);
});

// ── TESTE 2: Filtro de e-mails falsos ──
const FAKE_EMAIL_PREFIXES = ['exemplo', 'example', 'test', 'teste', 'noreply', 'no-reply', 'naoresponda', 'sac'];
const FAKE_EMAIL_DOMAINS = ['mail.com', 'example.com', 'teste.com', 'email.com'];

const isValidEmail = (email) => {
  const lower = email.toLowerCase();
  if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.webp') || lower.endsWith('.svg')) return false;
  if (lower.includes('sentry.io') || lower.includes('wixpress.com')) return false;
  for (const prefix of FAKE_EMAIL_PREFIXES) {
    if (lower.startsWith(prefix + '@') || lower.startsWith(prefix + '.')) return false;
  }
  for (const domain of FAKE_EMAIL_DOMAINS) {
    if (lower.endsWith('@' + domain)) return false;
  }
  return true;
};

console.log('\n📧 TESTE 2: Filtro de E-mails Falsos');
const emailTests = [
  { input: 'contato@loja.com.br', expected: true },
  { input: 'exemplo@loja.com.br', expected: false },
  { input: 'example@test.com', expected: false },
  { input: 'test@gmail.com', expected: false },
  { input: 'sac@empresa.com', expected: false },
  { input: 'noreply@site.com', expected: false },
  { input: 'vendas@minhaloja.com.br', expected: true },
  { input: 'maria@mail.com', expected: false },
  { input: 'foto@sentry.io', expected: false },
  { input: 'logo@site.png', expected: false },
];
emailTests.forEach(({ input, expected }) => {
  const result = isValidEmail(input);
  const pass = result === expected;
  console.log(`  ${pass ? '✅' : '❌'} "${input}" → ${result ? 'válido' : 'inválido'} ${pass ? '' : `(esperado: ${expected ? 'válido' : 'inválido'})`}`);
});

// ── TESTE 3: Blacklist de empresas ──
const COMPANY_BLACKLIST = ['uol', 'host', 'hospedagem', 'servidor', 'telecom', 'universidade', 'escola', 'hospital', 'governo', 'prefeitura', 'ministério', 'ministerio', 'faculdade', 'tribunal', 'câmara', 'senado', 'assembleia', 'registro.br', 'cloudflare'];
const isBlacklistedCompany = (name) => {
  const lower = name.toLowerCase();
  return COMPANY_BLACKLIST.some(word => lower.includes(word));
};

console.log('\n🚫 TESTE 3: Blacklist de Empresas');
const blacklistTests = [
  { input: 'Loja Fashion SP', expected: false },
  { input: 'UOL Host Servidores', expected: true },
  { input: 'Hospedagem Brasil', expected: true },
  { input: 'Universidade Federal de SP', expected: true },
  { input: 'Hospital São Paulo', expected: true },
  { input: 'Prefeitura de Campinas', expected: true },
  { input: 'Boutique Maria Clara', expected: false },
  { input: 'Escola Estadual ABC', expected: true },
];
blacklistTests.forEach(({ input, expected }) => {
  const result = isBlacklistedCompany(input);
  const pass = result === expected;
  console.log(`  ${pass ? '✅' : '❌'} "${input}" → ${result ? 'bloqueado' : 'permitido'} ${pass ? '' : `(esperado: ${expected ? 'bloqueado' : 'permitido'})`}`);
});

// ── TESTE 4: Mapeamento expandido de tags ──
const mapOSMTags = (termo) => {
  const t = termo.toLowerCase();
  if (t.includes('roupa') || t.includes('moda') || t.includes('vestuário') || t.includes('vestuario')
    || t.includes('boutique') || t.includes('fashion') || t.includes('clothing')
    || t.includes('underwear') || t.includes('lingerie') || t.includes('calcados') || t.includes('calçados')
    || t.includes('acessorios') || t.includes('acessórios')) {
    return ['clothes', 'boutique', 'shoes', 'fashion', 'bag', 'jewelry', 'second_hand', 'fabric', 'leather'];
  }
  return [t];
};

console.log('\n🏷️  TESTE 4: Expansão de Tags OSM');
const tagTests = [
  { input: 'moda', minTags: 8 },
  { input: 'boutique', minTags: 8 },
  { input: 'fashion', minTags: 8 },
  { input: 'lingerie', minTags: 8 },
  { input: 'calcados', minTags: 8 },
  { input: 'acessorios', minTags: 8 },
];
tagTests.forEach(({ input, minTags }) => {
  const tags = mapOSMTags(input);
  const pass = tags.length >= minTags;
  console.log(`  ${pass ? '✅' : '❌'} "${input}" → ${tags.length} tags: [${tags.join(', ')}]`);
});

// ── TESTE 5: Ordenação (leads completos primeiro) ──
console.log('\n📊 TESTE 5: Ordenação por Score');
const leads = [
  { nome: 'Loja A', score: 1 },
  { nome: 'Loja B', score: 3 },
  { nome: 'Loja C', score: 2 },
  { nome: 'Loja D', score: 1.5 },
  { nome: 'Loja E', score: 3 },
];
leads.sort((a, b) => b.score - a.score);
const isOrdered = leads[0].score >= leads[1].score && leads[1].score >= leads[2].score;
console.log(`  ${isOrdered ? '✅' : '❌'} Ordenação: ${leads.map(l => `${l.nome}(${l.score})`).join(' > ')}`);

// ── TESTE 6: Deduplicação ──
console.log('\n🔄 TESTE 6: Deduplicação de Nomes');
const nomes = ['Loja A', 'Loja B', 'loja a', 'Loja C', 'LOJA B'];
const seenNames = new Set();
const deduplicated = [];
for (const n of nomes) {
  const norm = n.toLowerCase().trim();
  if (!seenNames.has(norm)) {
    seenNames.add(norm);
    deduplicated.push(n);
  }
}
const pass6 = deduplicated.length === 3;
console.log(`  ${pass6 ? '✅' : '❌'} ${nomes.length} nomes → ${deduplicated.length} únicos: [${deduplicated.join(', ')}]`);

console.log('\n=== FIM DOS TESTES ===');
