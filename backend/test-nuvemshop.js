const axios = require('axios');
const cheerio = require('cheerio');

const testNuvemshop = async () => {
  const url = 'https://www.nuvemshop.com.br/lojas/sao-paulo';
  try {
    const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0' }});
    const $ = cheerio.load(res.data);
    const links = [];
    $('a').each((i, el) => {
      const href = $(el).attr('href');
      if (href && href.startsWith('http')) links.push(href);
    });
    console.log('Total links:', links.length);
    console.log(links.slice(0, 10));
  } catch (e) {
    console.log('Error:', e.message);
  }
};
testNuvemshop();
