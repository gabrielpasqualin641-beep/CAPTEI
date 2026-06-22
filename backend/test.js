const axios = require('axios');

async function test() {
  try {
    const query = `[out:json][timeout:25];
area["name"~"Porto Alegre",i]->.searchArea;
(
  nwr["amenity"~"restaurante",i](area.searchArea);
  nwr["name"~"restaurante",i](area.searchArea);
);
out center;`;
    const res = await axios.post('https://overpass-api.de/api/interpreter', `data=${encodeURIComponent(query)}`, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'ProspectZap/1.0 (support@prospectzap.com)',
        'Accept': 'application/json'
      }
    });
    console.log(res.data.elements.length);
  } catch(e) {
    console.error(e.response ? e.response.status + ' ' + e.response.statusText : e.message);
  }
}
test();
