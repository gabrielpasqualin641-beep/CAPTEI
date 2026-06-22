import { Router } from 'express';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { authenticate } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import {
  nationalScrapeQueue,
  CAPITAIS_BRASIL,
  type NationalJobData,
} from '../lib/nationalQueue';

const router = Router();

// ── Mapeamento inteligente de nichos PT-BR → tags OSM ────────────────────────
export function mapOsmNichoToTags(termo: string): string[] {
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
  if (t.includes('farmácia') || t.includes('drogaria')) return ['pharmacy'];
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

export interface OsmFilters {
  apenasComTelefone?: boolean;
  ocultarInstituicoes?: boolean;
  palavrasExcluir?: string;
  palavrasObrigatorias?: string;
}

/**
 * runOsmSearch — Função pura exportada.
 * Executa busca OSM/Overpass para nicho + cidade.
 * Usada pelo endpoint local e pelo Worker nacional.
 */
export async function runOsmSearch(
  nicho: string,
  cidade: string,
  filters: OsmFilters = {},
): Promise<any[]> {
  const {
    apenasComTelefone = false,
    ocultarInstituicoes = true,
    palavrasExcluir = '',
    palavrasObrigatorias = '',
  } = filters;

  const cidadeLimpa = (cidade.split(',')[0] ?? cidade).trim();

  const geoRes = await axios.get(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cidadeLimpa)}&format=json&limit=1`,
    { headers: { 'User-Agent': 'Captei/1.0 (admin@captei.com)' } }
  );

  if (!geoRes.data || geoRes.data.length === 0) return [];

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

  const response = await axios.post(
    'https://overpass-api.de/api/interpreter',
    `data=${encodeURIComponent(overpassQuery)}`,
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Captei/1.0 (admin@captei.com)',
        'Accept': 'application/json'
      }
    }
  );

  const elements = response.data.elements || [];
  const isEcommerceSearch =
    nicho.toLowerCase().includes('ecommerce') ||
    nicho.toLowerCase().includes('e-commerce') ||
    nicho.toLowerCase().includes('loja online') ||
    nicho.toLowerCase().includes('loja virtual');

  return elements.map((place: any) => {
    const tags = place.tags || {};
    let endereco = '';
    const rua = tags['addr:street'];
    const numero = tags['addr:housenumber'];
    const cidadeOSM = tags['addr:city'] || cidadeLimpa;

    if (rua) {
      endereco = numero ? `${rua}, ${numero}` : rua;
      if (cidadeOSM) endereco += ` - ${cidadeOSM}`;
    } else {
      endereco = cidadeOSM;
    }

    const telefone = tags.phone || tags['contact:phone'] || tags.mobile || '';
    const site = tags.website || tags['contact:website'] || tags['url'] || '';

    let score = 0;
    if (telefone) score = 1;
    if (telefone && endereco && endereco !== cidadeOSM) score = 2;
    if (telefone && endereco && endereco !== cidadeOSM && site) score = 3;

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
  }).filter((place: any) => {
    if (place.nome === 'Sem Nome') return false;
    if (apenasComTelefone && !place.telefone) return false;
    if (isEcommerceSearch && !place.site) return false;

    const nomeLower = place.nome.toLowerCase();

    if (ocultarInstituicoes !== false) {
      const blacklist = [
        'universitário', 'universitária', 'ufrgs', 'pucrs', 'unisinos',
        'escola', 'colégio', 'emef', 'emei', 'creche',
        'hospital', 'upa', 'posto de saúde', 'caps',
        'presídio', 'penitenciária', 'sesc', 'sesi', 'senai'
      ];
      if (nomeLower.includes('restaurante') && nomeLower.includes('popular')) return false;
      if (blacklist.some(term => nomeLower.includes(term))) return false;
    }

    if (palavrasExcluir) {
      const termosExcluir = palavrasExcluir.split(',').map((t: string) => t.trim().toLowerCase()).filter(Boolean);
      if (termosExcluir.some((term: string) => nomeLower.includes(term))) return false;
    }

    if (palavrasObrigatorias) {
      const termosObrigatorios = palavrasObrigatorias.split(',').map((t: string) => t.trim().toLowerCase()).filter(Boolean);
      if (termosObrigatorios.length > 0 && !termosObrigatorios.some((term: string) => nomeLower.includes(term))) return false;
    }

    return true;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// ENDPOINT POST /places/search
// ─────────────────────────────────────────────────────────────────────────────
router.post('/search', authenticate, async (req, res) => {
  try {
    const { nicho, cidade, apenasComTelefone, ocultarInstituicoes, palavrasExcluir, palavrasObrigatorias } = req.body;

    if (!nicho) {
      return res.status(400).json({ error: 'O campo Nicho é obrigatório.' });
    }

    const filters: OsmFilters = { apenasComTelefone, ocultarInstituicoes, palavrasExcluir, palavrasObrigatorias };

    // ── MODO NACIONAL: cidade vazia → enfileira uma busca por capital ──────
    if (!cidade || cidade.trim() === '') {
      const jobGroupId = uuidv4();
      const totalCidades = CAPITAIS_BRASIL.length;

      const tenantId = (req as any).user?.id || 'default';

      await prisma.varreduraJob.create({
        data: {
          jobGroupId,
          userId: tenantId,
          nicho,
          modo: 'osm',
          totalCidades,
        },
      });

      for (let i = 0; i < CAPITAIS_BRASIL.length; i++) {
        const jobData: NationalJobData = {
          jobGroupId,
          nicho,
          cidade: CAPITAIS_BRASIL[i]!,
          modo: 'osm',
          filters,
        };
        await nationalScrapeQueue.add('national_osm', jobData, {
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

  } catch (error: any) {
    console.error('Erro ao buscar na Overpass API:', error?.response?.data || error.message);
    return res.status(500).json({ error: 'Erro ao buscar dados na OpenStreetMap.' });
  }
});

export const placesRoutes = router;
