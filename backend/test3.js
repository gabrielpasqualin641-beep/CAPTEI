const axios = require('axios');

async function test() {
  try {
    const cidade = 'Porto Alegre';
    const nicho = 'restaurante';

    // 1. Get bbox from Nominatim
    console.log('Fetching bbox for:', cidade);
    const geoRes = await axios.get(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cidade)}&format=json&limit=1`, {
      headers: { 'User-Agent': 'ProspectZap/1.0' }
    });

    if (!geoRes.data || geoRes.data.length === 0) {
      console.log('City not found');
      return;
    }

    const bboxArr = geoRes.data[0].boundingbox;
    // Nominatim returns [south, north, west, east] as strings
    // Overpass expects (south,west,north,east)
    const bbox = `${bboxArr[0]},${bboxArr[2]},${bboxArr[1]},${bboxArr[3]}`;
    console.log('BBox:', bbox);

    // 2. Overpass Query
    const overpassQuery = `
      [out:json][timeout:25];
      (
        nwr["amenity"~"${nicho}",i](${bbox});
        nwr["shop"~"${nicho}",i](${bbox});
        nwr["name"~"${nicho}",i](${bbox});
      );
      out center 50;
    `;

    console.log('Sending query...');
    const response = await axios.post(
      'https://overpass-api.de/api/interpreter',
      `data=${encodeURIComponent(overpassQuery)}`,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'ProspectZap/1.0',
          'Accept': 'application/json'
        }
      }
    );

    const elements = response.data.elements || [];
    console.log('Total Results:', elements.length);
    console.log(JSON.stringify(elements.slice(0, 3), null, 2));
  } catch(e) {
    console.error(e.response ? e.response.status + ' ' + e.response.statusText : e.message);
  }
}
test();
