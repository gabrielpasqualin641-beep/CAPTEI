const axios = require('axios');
const cheerio = require('cheerio');

axios.get('https://www.ecosia.org/search?q=site:myshopify.com+moda+%22s%C3%A3o+paulo%22', {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36'
  }
}).then(res => {
  const $ = cheerio.load(res.data);
  const links = [];
  $('a.result-title').each((i, el) => {
    let href = $(el).attr('href');
    if (href && href.startsWith('http')) {
      links.push(href);
    }
  });
  console.log('Found Ecosia Links:', [...new Set(links)]);
}).catch(err => {
  console.error('Error:', err.message);
});
