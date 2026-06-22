"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scrapePlatformRoutes = void 0;
// src/routes/leadsScrapePlatform.ts
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const axios_1 = __importDefault(require("axios"));
const cheerio_1 = __importDefault(require("cheerio"));
const p_limit_1 = __importDefault(require("p-limit"));
const checkPlano_1 = require("../middleware/checkPlano");
const router = (0, express_1.Router)();
// Helpers to extract data from HTML
function extractFromHtml(html, url) {
    const $ = cheerio_1.default.load(html);
    const title = $('title').first().text().trim() || $('meta[property="og:title"]').attr('content') || '';
    const name = title;
    const phoneRegex = /(?:\+?55)?\s?(?:\(\d{2}\)?\s?)?\d{4,5}[\-\s]?\d{4}/g;
    const phones = html.match(phoneRegex) || [];
    const emailRegex = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
    const emails = html.match(emailRegex) || [];
    const instagramMatch = html.match(/instagram\.com\/([A-Za-z0-9_.]+)/i);
    const instagram = instagramMatch ? instagramMatch[1] : undefined;
    // Simple city/state extraction: look for pattern "Cidade - UF" or "Cidade/UF"
    let city;
    let state;
    const locationMatch = html.match(/([A-Za-zÀ-ÿ\s]+)[\s\-\/]{1,3}([A-Z]{2})/);
    if (locationMatch) {
        city = locationMatch[1].trim();
        state = locationMatch[2];
    }
    return {
        nome: name,
        telefone: phones[0],
        email: emails[0],
        instagram,
        cidade: city,
        estado: state,
        site: url,
    };
}
router.post('/scrape-platform', auth_1.authenticate, (0, checkPlano_1.checkAcessoRecurso)('busca_plataforma'), async (req, res) => {
    try {
        const { platform, segment, state, maxResults = 100, } = req.body;
        // Enforce hard cap of 200 results
        const limitResults = Math.min(maxResults, 200);
        if (!platform) {
            return res.status(400).json({ error: 'platform is required' });
        }
        // Build Common Crawl query URL
        let ccQuery = '';
        if (platform === 'nuvemshop') {
            ccQuery = `https://index.commoncrawl.org/CC-MAIN-2024-10-index?url=*.nuvemshop.com.br&output=json`;
        }
        else if (platform === 'shopify') {
            ccQuery = `https://index.commoncrawl.org/CC-MAIN-2024-10-index?url=*.myshopify.com&output=json`;
        }
        else if (platform === 'tray') {
            ccQuery = `https://index.commoncrawl.org/CC-MAIN-2024-10-index?url=*.tray.com.br&output=json`;
        }
        else if (platform === 'loja_integrada') {
            ccQuery = `https://index.commoncrawl.org/CC-MAIN-2024-10-index?url=*.lojaintegrada.com.br&output=json`;
        }
        const ccResponse = await axios_1.default.get(ccQuery, { responseType: 'text' });
        if (ccResponse.status !== 200) {
            return res.status(502).json({ error: 'Failed to query Common Crawl index' });
        }
        const lines = ccResponse.data.split('\n');
        const urls = new Set();
        for (const line of lines) {
            if (!line)
                continue;
            try {
                const obj = JSON.parse(line);
                if (obj.url)
                    urls.add(obj.url);
                if (urls.size >= limitResults)
                    break;
            }
            catch (_) { }
        }
        const limit = (0, p_limit_1.default)(5);
        const leads = [];
        const fetchPromises = Array.from(urls).map((url) => limit(async () => {
            try {
                const pageRes = await axios_1.default.get(url, { timeout: 10000, responseType: 'text' });
                if (pageRes.status !== 200)
                    return;
                const html = pageRes.data;
                const data = extractFromHtml(html, url);
                // Apply optional filters
                if (segment && data.nome && !data.nome.toLowerCase().includes(segment.toLowerCase()))
                    return;
                if (state && data.estado && data.estado.toUpperCase() !== state.toUpperCase())
                    return;
                const lead = {
                    nome: data.nome || 'Sem nome',
                    telefone: data.telefone,
                    email: data.email,
                    instagram: data.instagram,
                    cidade: data.cidade,
                    estado: data.estado,
                    site: url,
                    plataforma: platform === 'nuvemshop' ? 'Nuvemshop' : platform === 'shopify' ? 'Shopify' : platform === 'tray' ? 'Tray' : 'Loja Integrada',
                    score: (data.telefone ? 2 : 0) + (data.email ? 1.5 : 0) + (data.instagram ? 1 : 0),
                };
                leads.push(lead);
            }
            catch (_) {
                // ignore individual fetch errors
            }
        }));
        await Promise.all(fetchPromises);
        return res.json({ leads });
    }
    catch (error) {
        console.error('Error in scrape-platform:', error);
        return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});
exports.scrapePlatformRoutes = router;
//# sourceMappingURL=leadsScrapePlatform.js.map