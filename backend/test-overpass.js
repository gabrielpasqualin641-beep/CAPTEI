// Teste direto da Overpass API para São Paulo
const axios = require('axios');

async function testOverpass() {
  console.log('1. Buscando geocoding de São Paulo...');
  const geoRes = await axios.get('https://nominatim.openstreetmap.org/search?q=S%C3%A3o%20Paulo&format=json&limit=1', {
    headers: { 'User-Agent': 'ProspectZap/1.0' }
  });
  
  if (!geoRes.data.length) {
    console.log('ERRO: Nominatim não encontrou São Paulo');
    return;
  }
  
  const bboxArr = geoRes.data[0].boundingbox;
  console.log('BBox:', bboxArr);
  console.log('Display name:', geoRes.data[0].display_name);
  
  const bbox = `${bboxArr[0]},${bboxArr[2]},${bboxArr[1]},${bboxArr[3]}`;
  console.log('BBox formatado:', bbox);

  // Testar query simples primeiro
  const simpleQuery = `
    [out:json][timeout:25];
    (
      nwr["shop"="clothes"](${bbox});
    );
    out center 20;
  `;
  
  console.log('\n2. Testando query simples (shop=clothes, limit 20)...');
  const startSimple = Date.now();
  try {
    const res = await axios.post(
      'https://overpass-api.de/api/interpreter',
      `data=${encodeURIComponent(simpleQuery)}`,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'ProspectZap/1.0' }, timeout: 30000 }
    );
    console.log(`   OK em ${Date.now() - startSimple}ms - Elementos: ${res.data.elements?.length}`);
    
    // Contar quantos têm website
    const withWebsite = res.data.elements?.filter(e => e.tags?.website || e.tags?.url) || [];
    console.log(`   Com website: ${withWebsite.length}`);
    if (withWebsite.length > 0) {
      console.log('   Exemplo:', withWebsite[0].tags?.name, '-', withWebsite[0].tags?.website);
    }
  } catch(e) {
    console.log(`   FALHOU em ${Date.now() - startSimple}ms:`, e.message);
  }

  // Testar query COM filtro de website
  const withWebsiteQuery = `
    [out:json][timeout:25];
    (
      nwr["shop"="clothes"](if:t["website"]!="")(${bbox});
    );
    out center 20;
  `;
  
  console.log('\n3. Testando COM filtro website (if:t["website"]!="")...');
  const startFiltered = Date.now();
  try {
    const res = await axios.post(
      'https://overpass-api.de/api/interpreter',
      `data=${encodeURIComponent(withWebsiteQuery)}`,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'ProspectZap/1.0' }, timeout: 30000 }
    );
    console.log(`   OK em ${Date.now() - startFiltered}ms - Elementos: ${res.data.elements?.length}`);
  } catch(e) {
    console.log(`   FALHOU em ${Date.now() - startFiltered}ms:`, e.message);
  }

  // Testar query SEM filtro de website (alternativa)
  const noFilterQuery = `
    [out:json][timeout:25];
    (
      nwr["shop"="clothes"]["website"](${bbox});
    );
    out center 50;
  `;
  
  console.log('\n4. Testando COM tag ["website"] direto (sem if)...');
  const startNoFilter = Date.now();
  try {
    const res = await axios.post(
      'https://overpass-api.de/api/interpreter',
      `data=${encodeURIComponent(noFilterQuery)}`,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'ProspectZap/1.0' }, timeout: 30000 }
    );
    console.log(`   OK em ${Date.now() - startNoFilter}ms - Elementos: ${res.data.elements?.length}`);
    const els = res.data.elements || [];
    els.slice(0, 5).forEach(e => {
      console.log(`   -> ${e.tags?.name || 'N/A'} | ${e.tags?.website || 'N/A'}`);
    });
  } catch(e) {
    console.log(`   FALHOU em ${Date.now() - startNoFilter}ms:`, e.message);
  }

  // Testar query multi-tag como no scrape.ts
  const multiQuery = `
    [out:json][timeout:45];
    (
      nwr["shop"="clothes"]["website"](${bbox});
      nwr["shop"="boutique"]["website"](${bbox});
      nwr["shop"="shoes"]["website"](${bbox});
      nwr["shop"="fashion"]["website"](${bbox});
      nwr["shop"="bag"]["website"](${bbox});
      nwr["shop"="jewelry"]["website"](${bbox});
    );
    out center 200;
  `;
  
  console.log('\n5. Testando multi-tag (clothes+boutique+shoes+fashion+bag+jewelry)...');
  const startMulti = Date.now();
  try {
    const res = await axios.post(
      'https://overpass-api.de/api/interpreter',
      `data=${encodeURIComponent(multiQuery)}`,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'ProspectZap/1.0' }, timeout: 60000 }
    );
    console.log(`   OK em ${Date.now() - startMulti}ms - Elementos: ${res.data.elements?.length}`);
    const urls = res.data.elements?.map(e => e.tags?.website).filter(Boolean) || [];
    console.log(`   URLs únicas: ${[...new Set(urls)].length}`);
    [...new Set(urls)].slice(0, 10).forEach(u => console.log(`   -> ${u}`));
  } catch(e) {
    console.log(`   FALHOU em ${Date.now() - startMulti}ms:`, e.message);
  }
}

testOverpass().catch(e => console.error('Fatal:', e.message));
