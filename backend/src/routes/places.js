"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.placesRoutes = void 0;
exports.mapOsmNichoToTags = mapOsmNichoToTags;
exports.runOsmSearch = runOsmSearch;
const express_1 = require("express");
const axios_1 = __importDefault(require("axios"));
const uuid_1 = require("uuid");
const auth_1 = require("../middleware/auth");
const prisma_1 = require("../lib/prisma");
const nationalQueue_1 = require("../lib/nationalQueue");
const router = (0, express_1.Router)();
// ── Mapeamento inteligente de nichos PT-BR → tags OSM ────────────────────────
function mapOsmNichoToTags(termo) {
    const t = termo.toLowerCase();
    if (t.includes('e-commerce') || t.includes('ecommerce') || t.includes('loja online') || t.includes('loja virtual')) {
        return ['clothes', 'electronics', 'shoes', 'furniture', 'sports', 'jewelry', 'books', 'toys', 'cosmetics', 'pet'];
    }
    if (t.includes('restaurante') || t.includes('comida') || t.includes('lanchonete') || t.includes('pizzaria')) {
        return ['restaurant', 'fast_food', 'cafe', 'bar', 'pub', 'food_court'];
    }
    if (t.includes('salão') || t.includes('beleza') || t.includes('cabelereiro') || t.includes('barbearia')) {
        return ['hairdresser', 'beauty', 'massage'];
    }
    if (t.includes('farmácia') || t.includes('drogaria'))
        return ['pharmacy'];
    if (t.includes('clínica') || t.includes('hospital') || t.includes('dentista') || t.includes('médico')) {
        return ['clinic', 'hospital', 'dentist', 'doctors'];
    }
    if (t.includes('mercado') || t.includes('supermercado') || t.includes('mercearia')) {
        return ['supermarket', 'convenience', 'grocery'];
    }
    if (t.includes('oficina') || t.includes('mecânica') || t.includes('carro')) {
        return ['car_repair', 'car_wash', 'car_parts'];
    }
    if (t.includes('roupa') || t.includes('vestuário') || t.includes('moda')) {
        return ['clothes', 'boutique', 'shoes'];
    }
    return [t];
}
/**
 * runOsmSearch — Função pura exportada.
 * Executa busca OSM/Overpass para nicho + cidade.
 * Usada pelo endpoint local e pelo Worker nacional.
 */
async function runOsmSearch(nicho, cidade, filters = {}) {
    const { apenasComTelefone = false, ocultarInstituicoes = true, palavrasExcluir = '', palavrasObrigatorias = '', } = filters;
    const cidadeLimpa = (cidade.split(',')[0] ?? cidade).trim();
    const geoRes = await axios_1.default.get(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cidadeLimpa)}&format=json&limit=1`, { headers: { 'User-Agent': 'Captei/1.0 (admin@captei.com)' } });
    if (!geoRes.data || geoRes.data.length === 0)
        return [];
    const bboxArr = geoRes.data[0].boundingbox;
    // Nominatim: [south, north, west, east] → Overpass: (south,west,north,east)
    const bbox = `${bboxArr[0]},${bboxArr[2]},${bboxArr[1]},${bboxArr[3]}`;
    const tagsEmIngles = mapOsmNichoToTags(nicho);
    const tagLines = tagsEmIngles.map(tag => `
      nwr["amenity"="${tag}"](${bbox});
      nwr["shop"="${tag}"](${bbox});
      nwr["healthcare"="${tag}"](${bbox});
  `).join('');
    const overpassQuery = `
    [out:json][timeout:30];
    (
      ${tagLines}
      nwr["amenity"~"${nicho}",i](${bbox});
      nwr["shop"~"${nicho}",i](${bbox});
      nwr["tourism"~"${nicho}",i](${bbox});
      nwr["craft"~"${nicho}",i](${bbox});
      nwr["office"~"${nicho}",i](${bbox});
      nwr["healthcare"~"${nicho}",i](${bbox});
      nwr["leisure"~"${nicho}",i](${bbox});
      nwr["building"~"${nicho}",i](${bbox});
      nwr["name"~"${nicho}",i](${bbox});
    );
    out center 500;
  `;
    const response = await axios_1.default.post('https://overpass-api.de/api/interpreter', `data=${encodeURIComponent(overpassQuery)}`, {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Captei/1.0 (admin@captei.com)',
            'Accept': 'application/json'
        }
    });
    const elements = response.data.elements || [];
    const isEcommerceSearch = nicho.toLowerCase().includes('ecommerce') ||
        nicho.toLowerCase().includes('e-commerce') ||
        nicho.toLowerCase().includes('loja online') ||
        nicho.toLowerCase().includes('loja virtual');
    return elements.map((place) => {
        const tags = place.tags || {};
        let endereco = '';
        const rua = tags['addr:street'];
        const numero = tags['addr:housenumber'];
        const cidadeOSM = tags['addr:city'] || cidadeLimpa;
        if (rua) {
            endereco = numero ? `${rua}, ${numero}` : rua;
            if (cidadeOSM)
                endereco += ` - ${cidadeOSM}`;
        }
        else {
            endereco = cidadeOSM;
        }
        const telefone = tags.phone || tags['contact:phone'] || tags.mobile || '';
        const site = tags.website || tags['contact:website'] || tags['url'] || '';
        let score = 0;
        if (telefone)
            score = 1;
        if (telefone && endereco && endereco !== cidadeOSM)
            score = 2;
        if (telefone && endereco && endereco !== cidadeOSM && site)
            score = 3;
        return {
            id_google: place.id.toString(),
            nome: tags.name || 'Sem Nome',
            telefone,
            endereco,
            cidade: cidadeLimpa,
            avaliacao: null,
            total_reviews: null,
            site,
            aberto_agora: null,
            score
        };
    }).filter((place) => {
        if (place.nome === 'Sem Nome')
            return false;
        if (apenasComTelefone && !place.telefone)
            return false;
        if (isEcommerceSearch && !place.site)
            return false;
        const nomeLower = place.nome.toLowerCase();
        if (ocultarInstituicoes !== false) {
            const blacklist = [
                'universitário', 'universitária', 'ufrgs', 'pucrs', 'unisinos',
                'escola', 'colégio', 'emef', 'emei', 'creche',
                'hospital', 'upa', 'posto de saúde', 'caps',
                'presídio', 'penitenciária', 'sesc', 'sesi', 'senai'
            ];
            if (nomeLower.includes('restaurante') && nomeLower.includes('popular'))
                return false;
            if (blacklist.some(term => nomeLower.includes(term)))
                return false;
        }
        if (palavrasExcluir) {
            const termosExcluir = palavrasExcluir.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
            if (termosExcluir.some((term) => nomeLower.includes(term)))
                return false;
        }
        if (palavrasObrigatorias) {
            const termosObrigatorios = palavrasObrigatorias.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
            if (termosObrigatorios.length > 0 && !termosObrigatorios.some((term) => nomeLower.includes(term)))
                return false;
        }
        return true;
    });
}
// ─────────────────────────────────────────────────────────────────────────────
// ENDPOINT POST /places/search
// ─────────────────────────────────────────────────────────────────────────────
router.post('/search', auth_1.authenticate, async (req, res) => {
    try {
        const { nicho, cidade, apenasComTelefone, ocultarInstituicoes, palavrasExcluir, palavrasObrigatorias } = req.body;
        if (!nicho) {
            return res.status(400).json({ error: 'O campo Nicho é obrigatório.' });
        }
        const filters = { apenasComTelefone, ocultarInstituicoes, palavrasExcluir, palavrasObrigatorias };
        // ── MODO NACIONAL: cidade vazia → enfileira uma busca por capital ──────
        if (!cidade || cidade.trim() === '') {
            const jobGroupId = (0, uuid_1.v4)();
            const totalCidades = nationalQueue_1.CAPITAIS_BRASIL.length;
            const tenantId = req.user?.id || 'default';
            await prisma_1.prisma.varreduraJob.create({
                data: {
                    jobGroupId,
                    userId: tenantId,
                    nicho,
                    modo: 'osm',
                    totalCidades,
                },
            });
            for (let i = 0; i < nationalQueue_1.CAPITAIS_BRASIL.length; i++) {
                const jobData = {
                    jobGroupId,
                    nicho,
                    cidade: nationalQueue_1.CAPITAIS_BRASIL[i],
                    modo: 'osm',
                    filters,
                };
                await nationalQueue_1.nationalScrapeQueue.add('national_osm', jobData, {
                    delay: i * 5000, // 5 segundos entre cada cidade
                });
            }
            console.log(`[Nacional OSM] Varredura ${jobGroupId} iniciada: ${nicho} em ${totalCidades} cidades.`);
            return res.status(202).json({
                modo: 'nacional',
                jobGroupId,
                totalCidades,
                message: `Varredura nacional OSM iniciada para "${nicho}" em ${totalCidades} cidades.`,
            });
        }
        // ── MODO LOCAL (retrocompatível): cidade informada → síncrono ──────────
        const formattedPlaces = await runOsmSearch(nicho, cidade, filters);
        return res.json({ results: formattedPlaces, nextPageToken: null });
    }
    catch (error) {
        console.error('Erro ao buscar na Overpass API:', error?.response?.data || error.message);
        return res.status(500).json({ error: 'Erro ao buscar dados na OpenStreetMap.' });
    }
});
exports.placesRoutes = router;
//# sourceMappingURL=places.js.map