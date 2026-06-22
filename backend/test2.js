const axios = require('axios');

async function test() {
  try {
    const query = `[out:json][timeout:25];
area["name"="Porto Alegre"]->.searchArea;
(
  nwr["amenity"~"restaurant",i](area.searchArea);
  nwr["name"~"restaurante",i](area.searchArea);
);
out center;`;
    const res = await axios.post('https://overpass-api.de/api/interpreter', `data=${encodeURIComponent(query)}`, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'ProspectZap/1.0',
        'Accept': 'application/json'
      }
    });
    console.log(res.data.elements.length);
    console.log(res.data.elements.slice(0, 1));
  } catch(e) {
    console.error(e.response ? e.response.status : e.message);
  }
}
test();
