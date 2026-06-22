// src/routes/leadsScrapePlatform.ts
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import axios from 'axios';
import cheerio from 'cheerio';
import pLimit from 'p-limit';
import { checkAcessoRecurso } from '../middleware/checkPlano';

const router = Router();

interface ScrapePlatformRequest {
  platform: 'nuvemshop' | 'shopify' | 'tray' | 'loja_integrada';
  segment?: string;
  state?: string; // Brazilian state abbreviation, e.g., 'SP'
  maxResults?: number; // default 100, max 200
}

interface ScrapedLead {
  nome: string;
  telefone?: string;
  email?: string;
  instagram?: string;
  cidade?: string;
  estado?: string;
  site: string;
  plataforma: 'Nuvemshop' | 'Shopify' | 'Tray' | 'Loja Integrada';
  score: number;
}

// Helpers to extract data from HTML
function extractFromHtml(html: string, url: string): Partial<ScrapedLead> {
  const $ = cheerio.load(html);
  const title = $('title').first().text().trim() || $('meta[property="og:title"]').attr('content') || '';
  const name = title;
  const phoneRegex = /(?:\+?55)?\s?(?:\(\d{2}\)?\s?)?\d{4,5}[\-\s]?\d{4}/g;
  const phones = html.match(phoneRegex) || [];
  const emailRegex = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
  const emails = html.match(emailRegex) || [];
  const instagramMatch = html.match(/instagram\.com\/([A-Za-z0-9_.]+)/i);
  const instagram = instagramMatch ? instagramMatch[1] : undefined;
  // Simple city/state extraction: look for pattern "Cidade - UF" or "Cidade/UF"
  let city: string | undefined;
  let state: string | undefined;
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

router.post('/scrape-platform', authenticate, checkAcessoRecurso('busca_plataforma'), async (req, res) => {
  try {
    const {
      platform,
      segment,
      state,
      maxResults = 100,
    }: ScrapePlatformRequest = req.body;

    // Enforce hard cap of 200 results
    const limitResults = Math.min(maxResults, 200);

    if (!platform) {
      return res.status(400).json({ error: 'platform is required' });
    }

    // Build Common Crawl query URL
    let ccQuery = '';
    if (platform === 'nuvemshop') {
      ccQuery = `https://index.commoncrawl.org/CC-MAIN-2024-10-index?url=*.nuvemshop.com.br&output=json`;
    } else if (platform === 'shopify') {
      ccQuery = `https://index.commoncrawl.org/CC-MAIN-2024-10-index?url=*.myshopify.com&output=json`;
    } else if (platform === 'tray') {
      ccQuery = `https://index.commoncrawl.org/CC-MAIN-2024-10-index?url=*.tray.com.br&output=json`;
    } else if (platform === 'loja_integrada') {
      ccQuery = `https://index.commoncrawl.org/CC-MAIN-2024-10-index?url=*.lojaintegrada.com.br&output=json`;
    }

    const ccResponse = await axios.get(ccQuery, { responseType: 'text' });
    if (ccResponse.status !== 200) {
      return res.status(502).json({ error: 'Failed to query Common Crawl index' });
    }

    const lines = ccResponse.data.split('\n');
    const urls: Set<string> = new Set();
    for (const line of lines) {
      if (!line) continue;
      try {
        const obj = JSON.parse(line);
        if (obj.url) urls.add(obj.url);
        if (urls.size >= limitResults) break;
      } catch (_) {}
    }

    const limit = pLimit(5);
    const leads: ScrapedLead[] = [];
    const fetchPromises = Array.from(urls).map((url) =>
      limit(async () => {
        try {
          const pageRes = await axios.get(url, { timeout: 10000, responseType: 'text' });
          if (pageRes.status !== 200) return;
          const html = pageRes.data;
          const data = extractFromHtml(html, url);
          // Apply optional filters
          if (segment && data.nome && !data.nome.toLowerCase().includes(segment.toLowerCase())) return;
          if (state && data.estado && data.estado.toUpperCase() !== state.toUpperCase()) return;
          const lead: ScrapedLead = {
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
        } catch (_) {
          // ignore individual fetch errors
        }
      })
    );
    await Promise.all(fetchPromises);

    return res.json({ leads });
  } catch (error: any) {
    console.error('Error in scrape-platform:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

export const scrapePlatformRoutes = router;
