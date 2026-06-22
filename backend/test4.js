const axios = require('axios');
const testApi = async () => {
  const cidadeLimpa = 'Porto Alegre';
  const nicho = 'restaurante';

  const mapOSMTags = (termo) => {
    const t = termo.toLowerCase();
    if (t.includes('restaurante') || t.includes('comida') || t.includes('lanchonete') || t.includes('pizzaria')) {
      return ['restaurant', 'fast_food', 'cafe', 'bar', 'pub', 'food_court'];
    }
    if (t.includes('salão') || t.includes('beleza') || t.includes('cabelereiro') || t.includes('barbearia')) {
      return ['hairdresser', 'beauty', 'massage'];
    }
    if (t.includes('farmácia') || t.includes('drogaria')) {
      return ['pharmacy'];
    }
    if (t.includes('clínica') || t.includes('hospital') || t.includes('dentista') || t.includes('médico')) {
      return ['clinic', 'hospital', 'dentist', 'doctors'];
    }
    if (t.includes('mercado') || t.includes('supermercado') || t.includes('mercearia')) {
      return ['supermarket', 'convenience', 'grocery'];
    }
    return [t]; // fallback
  };

  const tagsEmIngles = mapOSMTags(nicho);

  const geoRes = await axios.get(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cidadeLimpa)}&format=json&limit=1`, {
      headers: { 'User-Agent': 'ProspectZap/1.0 (admin@prospectzap.com)' }
  });
  const bboxArr = geoRes.data[0].boundingbox;
  const bbox = `${bboxArr[0]},${bboxArr[2]},${bboxArr[1]},${bboxArr[3]}`;

  // Create query lines for each english tag mapped
  const tagLines = tagsEmIngles.map(tag => `
        nwr["amenity"="${tag}"](${bbox});
        nwr["shop"="${tag}"](${bbox});
        nwr["healthcare"="${tag}"](${bbox});
  `).join('');

  const overpassQuery = `
    [out:json][timeout:30];
    (
      ${tagLines}
      nwr["name"~"${nicho}",i](${bbox});
      nwr["amenity"~"${nicho}",i](${bbox});
      nwr["shop"~"${nicho}",i](${bbox});
      nwr["tourism"~"${nicho}",i](${bbox});
      nwr["craft"~"${nicho}",i](${bbox});
      nwr["office"~"${nicho}",i](${bbox});
      nwr["healthcare"~"${nicho}",i](${bbox});
      nwr["leisure"~"${nicho}",i](${bbox});
      nwr["building"~"${nicho}",i](${bbox});
    );
    out center 500;
  `;
  const response = await axios.post(
      'https://overpass-api.de/api/interpreter',
      'data=' + encodeURIComponent(overpassQuery),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'ProspectZap/1.0', 'Accept': 'application/json' } }
  );
  const elements = response.data.elements || [];
  const withPhone = elements.filter(p => p.tags && (p.tags.phone || p.tags['contact:phone']));
  console.log('Total Results:', elements.length);
  console.log('Results with phone:', withPhone.length);
};
testApi();
