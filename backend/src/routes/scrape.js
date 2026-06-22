"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scrapeRoutes = void 0;
exports.runEcommerceScrape = runEcommerceScrape;
const express_1 = require("express");
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
const https_1 = __importDefault(require("https"));
const uuid_1 = require("uuid");
const auth_1 = require("../middleware/auth");
const prisma_1 = require("../lib/prisma");
const nationalQueue_1 = require("../lib/nationalQueue");
const router = (0, express_1.Router)();
const progressMap = new Map();
// ── GET /scrape-progress — progresso em tempo real (busca local) ──────────────
router.get('/scrape-progress', auth_1.authenticate, (req, res) => {
    const { jobId } = req.query;
    if (!jobId || typeof jobId !== 'string')
        return res.json({ progress: null });
    const data = progressMap.get(jobId);
    return res.json({ progress: data || null });
});
// ── GET /national-status — progresso da varredura nacional ───────────────────
router.get('/national-status', auth_1.authenticate, async (req, res) => {
    const { jobGroupId } = req.query;
    if (!jobGroupId || typeof jobGroupId !== 'string') {
        return res.status(400).json({ error: 'jobGroupId é obrigatório.' });
    }
    try {
        const varredura = await prisma_1.prisma.varreduraJob.findUnique({
            where: { jobGroupId },
        });
        if (!varredura) {
            return res.status(404).json({ error: 'Varredura não encontrada.' });
        }
        return res.json(varredura);
    }
    catch (error) {
        return res.status(500).json({ error: 'Erro ao buscar status da varredura.' });
    }
});
// ── DELETE /national-cancel — cancela uma varredura nacional em andamento ─────
router.delete('/national-cancel', auth_1.authenticate, async (req, res) => {
    const { jobGroupId } = req.query;
    if (!jobGroupId || typeof jobGroupId !== 'string') {
        return res.status(400).json({ error: 'jobGroupId é obrigatório.' });
    }
    try {
        await prisma_1.prisma.varreduraJob.update({
            where: { jobGroupId },
            data: { status: 'cancelado' },
        });
        // Remove jobs ainda aguardando na fila
        const waitingJobs = await nationalQueue_1.nationalScrapeQueue.getJobs(['waiting', 'delayed']);
        for (const job of waitingJobs) {
            if (job.data.jobGroupId === jobGroupId) {
                await job.remove();
            }
        }
        return res.json({ success: true, message: 'Varredura cancelada.' });
    }
    catch (error) {
        return res.status(500).json({ error: 'Erro ao cancelar a varredura.' });
    }
});
// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÕES PURAS DE SCRAPING (exportadas para uso pelo NationalScrapeWorker)
// ─────────────────────────────────────────────────────────────────────────────
const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0'
];
const httpsAgent = new https_1.default.Agent({ rejectUnauthorized: false });
const delay = (ms) => new Promise(res => setTimeout(res, ms));
const fetchWithRetry = async (url, retries = 1) => {
    for (let i = 0; i <= retries; i++) {
        try {
            const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
            return await axios_1.default.get(url, {
                timeout: 15000,
                headers: {
                    'User-Agent': ua,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
                },
                httpsAgent,
                maxRedirects: 5
            });
        }
        catch (e) {
            if (i === retries)
                throw e;
            await delay(1000);
        }
    }
};
const PHONE_REGEX = /(?:(?:\+|00)?(55)\s?)?(?:\(?([1-9][0-9])\)?\s?)?(?:((?:9\d|[2-9])\d{3})\-?(\d{4}))/g;
const EMAIL_REGEX = /[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}/g;
const formatPhone = (raw) => {
    let digits = raw.replace(/\D/g, '');
    if (digits.startsWith('55') && digits.length >= 12)
        digits = digits.substring(2);
    if (digits.length === 11)
        return `(${digits.substring(0, 2)}) ${digits.substring(2, 7)}-${digits.substring(7)}`;
    if (digits.length === 10)
        return `(${digits.substring(0, 2)}) ${digits.substring(2, 6)}-${digits.substring(6)}`;
    return raw;
};
const FAKE_EMAIL_PREFIXES = [
    'exemplo', 'example', 'test', 'teste', 'noreply', 'no-reply',
    'naoresponda', 'sac', 'info@example', 'email@example'
];
const FAKE_EMAIL_DOMAINS = ['mail.com', 'example.com', 'teste.com', 'email.com'];
const isValidEmail = (email) => {
    const lower = email.toLowerCase();
    if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.webp') || lower.endsWith('.svg'))
        return false;
    if (lower.includes('sentry.io') || lower.includes('wixpress.com'))
        return false;
    for (const prefix of FAKE_EMAIL_PREFIXES) {
        if (lower.startsWith(prefix + '@') || lower.startsWith(prefix + '.'))
            return false;
    }
    for (const domain of FAKE_EMAIL_DOMAINS) {
        if (lower.endsWith('@' + domain))
            return false;
    }
    return true;
};
const COMPANY_BLACKLIST = [
    'uol', 'host', 'hospedagem', 'servidor', 'telecom',
    'universidade', 'escola', 'hospital', 'governo', 'prefeitura',
    'ministério', 'ministerio', 'faculdade', 'tribunal', 'câmara',
    'senado', 'assembleia', 'registro.br', 'cloudflare'
];
const isBlacklistedCompany = (name) => {
    const lower = name.toLowerCase();
    return COMPANY_BLACKLIST.some(word => lower.includes(word));
};
const detectPlatform = (html, url) => {
    const htmlLower = html.toLowerCase();
    if (url.includes('nuvemshop') || htmlLower.includes('nuvemshop.com.br'))
        return 'Nuvemshop';
    if (url.includes('myshopify') || htmlLower.includes('shopify.') || htmlLower.includes('cdn.shopify.com'))
        return 'Shopify';
    if (htmlLower.includes('/wp-content/plugins/woocommerce'))
        return 'WooCommerce';
    if (url.includes('lojas.tray.com.br') || htmlLower.includes('tray.com.br'))
        return 'Tray';
    if (htmlLower.includes('vtex'))
        return 'VTEX';
    if (htmlLower.includes('loja integrada') || htmlLower.includes('lojaintegrada.com.br'))
        return 'Loja Integrada';
    return 'Outra/Customizada';
};
const extractContact = (html) => {
    const emails = html.match(EMAIL_REGEX) || [];
    const validEmails = [...new Set(emails)].filter(isValidEmail);
    const phones = html.match(PHONE_REGEX) || [];
    const validPhones = [...new Set(phones)].filter(p => p.replace(/\D/g, '').length >= 10);
    const instagramMatches = html.match(/instagram\.com\/([a-zA-Z0-9_.]+)/g) || [];
    let instagram = '';
    for (const match of instagramMatches) {
        const handle = (match.split('.com/')[1] ?? '').replace(/\/$/, '');
        if (!['p', 'reel', 'explore', 'stories', 'tv', 'reels'].includes(handle.toLowerCase()) && handle.length > 2) {
            instagram = `@${handle}`;
            break;
        }
    }
    return {
        email: validEmails[0] || '',
        phone: validPhones[0] ? formatPhone(validPhones[0]) : '',
        instagram
    };
};
const extractNameFromUrl = (url) => {
    try {
        const hostname = new URL(url).hostname;
        const parts = hostname.replace('www.', '').split('.');
        if (parts.length > 0) {
            const name = parts[0] ?? '';
            return name.charAt(0).toUpperCase() + name.slice(1);
        }
    }
    catch (e) { }
    return url;
};
const mapOSMTagsEcommerce = (termo) => {
    const t = termo.toLowerCase();
    if (t.includes('roupa') || t.includes('moda') || t.includes('vestuário') || t.includes('vestuario')
        || t.includes('boutique') || t.includes('fashion') || t.includes('clothing')
        || t.includes('underwear') || t.includes('lingerie') || t.includes('calcados') || t.includes('calçados')
        || t.includes('acessorios') || t.includes('acessórios')) {
        return ['clothes', 'boutique', 'shoes', 'fashion', 'bag', 'jewelry', 'second_hand', 'fabric', 'leather'];
    }
    if (t.includes('eletrônico') || t.includes('eletronico'))
        return ['electronics', 'mobile_phone', 'computer'];
    if (t.includes('pet'))
        return ['pet', 'pet_grooming'];
    if (t.includes('joia') || t.includes('acessório'))
        return ['jewelry', 'watches'];
    if (t.includes('móvel') || t.includes('decoração') || t.includes('movel') || t.includes('decoracao'))
        return ['furniture', 'interior_decoration', 'carpet', 'curtain'];
    if (t.includes('cosmético') || t.includes('beleza') || t.includes('perfume') || t.includes('cosmetico'))
        return ['cosmetics', 'perfumery', 'beauty'];
    if (t.includes('esporte') || t.includes('fitness'))
        return ['sports', 'outdoor', 'fitness'];
    if (t.includes('alimento') || t.includes('comida') || t.includes('gourmet'))
        return ['deli', 'bakery', 'confectionery', 'organic', 'health_food'];
    if (t.includes('brinquedo') || t.includes('infantil') || t.includes('bebê') || t.includes('bebe'))
        return ['toys', 'baby_goods'];
};
/**
 * runEcommerceScrape — Função pura exportada.
 * Executa a busca e scraping de e-commerces.
 */
async function runEcommerceScrape(nicho, cidade, jobId) {
    // ----- NEW LOGIC: Crawl Nuvemshop official store directory -----
    const NUVEMSHOP_CATEGORIES = [
        'Moda Feminina', 'Moda Masculina', 'Calçados', 'Beleza',
        'Casa e Decoração', 'Esporte', 'Infantil', 'Pet Shop', 'Alimentação'
    ];
    const collectedUrls = [];
    for (const categoria of NUVEMSHOP_CATEGORIES) {
        for (let page = 1; page <= 10; page++) {
            const dirUrl = `https://www.nuvemshop.com.br/stores?category=${encodeURIComponent(categoria)}&page=${page}`;
            try {
                const res = await fetchWithRetry(dirUrl, 1);
                if (res && res.data) {
                    const $ = cheerio.load(res.data);
                    $('a').each((_, el) => {
                        const href = $(el).attr('href');
                        if (href && href.includes('nuvemshop.com.br')) {
                            const full = href.startsWith('http') ? href : `https://${href}`;
                            collectedUrls.push(full);
                        }
                    });
                }
            }
            catch (e) {
                console.log(`[Nuvemshop] Falha ao buscar ${dirUrl}: ${e}`);
            }
        }
    }
    const uniqueUrls = [...new Set(collectedUrls)];
    console.log(`[Ecommerce Scrape] ${uniqueUrls.length} URLs encontradas nas categorias Nuvemshop.`);
    if (jobId)
        progressMap.set(jobId, { status: 'Analisando sites encontrados...', total: uniqueUrls.length, processados: 0 });
    const leads = [];
    const seenNames = new Set();
    let processados = 0;
    for (const siteUrl of uniqueUrls) {
        if (jobId)
            progressMap.set(jobId, { status: `Raspando site ${processados + 1} de ${uniqueUrls.length}`, total: uniqueUrls.length, processados });
        processados++;
        let cleanUrl = String(siteUrl).trim();
        if (!cleanUrl.startsWith('http'))
            cleanUrl = 'https://' + cleanUrl;
        let phone = '';
        let email = '';
        let instagram = '';
        let nomeDaLoja = cleanUrl;
        let extractionStatus = '❌ Sem contato';
        try {
            const siteRes = await fetchWithRetry(cleanUrl, 1);
            if (siteRes && siteRes.data) {
                const siteHtml = siteRes.data;
                const $site = cheerio.load(siteHtml);
                const extracted = extractContact(siteHtml);
                email = extracted.email;
                phone = extracted.phone;
                instagram = extracted.instagram;
                const rawTitle = ($site('title').text().split('-')[0] ?? '').split('|')[0].trim();
                const TITLE_BLACKLIST = ['Carrinho', '404', 'Nuvemshop'];
                let cleanedTitle = rawTitle;
                for (const term of TITLE_BLACKLIST) {
                    cleanedTitle = cleanedTitle.replace(new RegExp(term, 'gi'), '').trim();
                }
                nomeDaLoja = cleanedTitle && cleanedTitle.length > 2 && !cleanedTitle.includes('http') ? cleanedTitle : extractNameFromUrl(cleanUrl);
                if (!phone || !email) {
                    let contatoUrl = '';
                    $site('a').each((i, el) => {
                        const href = $site(el).attr('href');
                        if (href && (href.toLowerCase().includes('contato') || href.toLowerCase().includes('fale-conosco') || href.toLowerCase().includes('quem-somos') || href.toLowerCase().includes('contact'))) {
                            contatoUrl = href;
                        }
                    });
                    if (contatoUrl) {
                        if (!contatoUrl.startsWith('http')) {
                            const urlObj = new URL(cleanUrl);
                            contatoUrl = `${urlObj.protocol}//${urlObj.host}${contatoUrl.startsWith('/') ? '' : '/'}${contatoUrl}`;
                        }
                        try {
                            const contatoRes = await fetchWithRetry(contatoUrl, 0);
                            if (contatoRes && contatoRes.data) {
                                const c = extractContact(contatoRes.data);
                                if (!phone && c.phone)
                                    phone = c.phone;
                                if (!email && c.email)
                                    email = c.email;
                                if (!instagram && c.instagram)
                                    instagram = c.instagram;
                            }
                        }
                        catch (e) { }
                    }
                }
            }
        }
        catch (err) {
            console.log(`[Ecommerce Scrape] Falha ao raspar: ${cleanUrl} — ${err.message}`);
        }
        if (isBlacklistedCompany(nomeDaLoja))
            continue;
        const nomeNormalizado = nomeDaLoja.toLowerCase().trim();
        if (seenNames.has(nomeNormalizado))
            continue;
        seenNames.add(nomeNormalizado);
        if (phone && email)
            extractionStatus = '✅ Completo';
        else if (phone || email)
            extractionStatus = '⚠️ Parcial';
        leads.push({
            id_google: Buffer.from(cleanUrl).toString('base64'),
            nome: nomeDaLoja,
            telefone: phone,
            email,
            instagram,
            site: cleanUrl,
            endereco: cidade,
            cidade,
            plataforma: 'Nuvemshop',
            status_extracao: extractionStatus,
            score: (phone && email) ? 3 : (phone ? 2 : (email ? 1.5 : 1))
        });
        await delay(400);
    }
    leads.sort((a, b) => b.score - a.score);
    if (jobId)
        progressMap.delete(jobId);
    return leads;
}
// ─────────────────────────────────────────────────────────────────────────────
// ENDPOINT POST /scrape-ecommerce
// ─────────────────────────────────────────────────────────────────────────────
router.post('/scrape-ecommerce', auth_1.authenticate, async (req, res) => {
    try {
        const { nicho, cidade, jobId } = req.body;
        if (!nicho) {
            return res.status(400).json({ error: 'O campo Nicho é obrigatório.' });
        }
        // ── MODO NACIONAL: cidade vazia → enfileira uma busca por capital ──────
        if (!cidade || cidade.trim() === '') {
            const jobGroupId = (0, uuid_1.v4)();
            const totalCidades = nationalQueue_1.CAPITAIS_BRASIL.length;
            const tenantId = req.user?.id || 'default';
            // Persiste o grupo no banco para rastreamento resiliente
            await prisma_1.prisma.varreduraJob.create({
                data: {
                    jobGroupId,
                    userId: tenantId,
                    nicho,
                    modo: 'ecommerce',
                    totalCidades,
                },
            });
            // Enfileira um job por capital com delay crescente (5s cada) para não sobrecarregar OSM
            for (let i = 0; i < nationalQueue_1.CAPITAIS_BRASIL.length; i++) {
                const jobData = {
                    jobGroupId,
                    nicho,
                    cidade: nationalQueue_1.CAPITAIS_BRASIL[i],
                    modo: 'ecommerce',
                };
                await nationalQueue_1.nationalScrapeQueue.add('national_ecommerce', jobData, {
                    delay: i * 5000, // 0s, 5s, 10s, 15s ...
                });
            }
            console.log(`[Nacional] Varredura ${jobGroupId} iniciada: ${nicho} em ${totalCidades} cidades.`);
            return res.status(202).json({
                modo: 'nacional',
                jobGroupId,
                totalCidades,
                message: `Varredura nacional iniciada para "${nicho}" em ${totalCidades} cidades. Acompanhe o progresso pelo jobGroupId.`,
            });
        }
        // ── MODO LOCAL (retrocompatível): cidade informada → fluxo síncrono atual ──
        const results = await runEcommerceScrape(nicho, cidade, jobId);
        return res.json({ results, nextPageToken: null });
    }
    catch (error) {
        console.error('Erro no Scraper de E-commerce:', error?.message);
        const { jobId } = req.body;
        if (jobId)
            progressMap.delete(jobId);
        return res.status(500).json({ error: 'Erro ao buscar e-commerces online.' });
    }
});
exports.scrapeRoutes = router;
//# sourceMappingURL=scrape.js.map