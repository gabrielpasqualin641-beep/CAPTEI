import axios from 'axios';
import { Prisma } from '@prisma/client';
/**
 * SEGURANÇA (Anti-IDOR): Usamos o cliente Prisma estendido com RLS em vez de
 * instanciar new PrismaClient() diretamente. Isso garante que todas as queries
 * de Lead neste serviço sejam automaticamente filtradas pelo userId do tenant
 * ativo no AsyncLocalStorage, impedindo acesso cross-tenant.
 */
import { prisma } from '../lib/prisma';

interface BrasilApiResponse {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  municipio: string;
  uf: string;
  capital_social: number;
  qsa: Array<{
    nome_socio: string;
    qualificacao_socio: string;
  }>;
}

export class EnrichmentService {
  /**
   * Enriches lead data using BrasilAPI. If it fails or no CNPJ is provided, falls back to mock data.
   */
  public async enrichLeadData(leadId: string, cnpj?: string) {
    let enrichedData: any = {};
    let usedFallback = false;

    if (cnpj) {
      try {
        const cleanCnpj = cnpj.replace(/\D/g, '');
        const response = await axios.get<BrasilApiResponse>(
          `https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`,
          { timeout: 5000 }
        );

        const data = response.data;
        
        // Extract address
        const endereco = `${data.logradouro}, ${data.numero} - ${data.bairro}, ${data.municipio} - ${data.uf}, ${data.cep}`;
        
        // Extract partner name and format a masked CPF
        let nomeSocio = data.qsa && data.qsa.length > 0 ? data.qsa[0].nome_socio : 'Sócio Padrão';
        const maskedCpf = this.generateMaskedCpf();

        // Simulate credit score based on capital_social
        const score = this.calculateScoreFromCapital(data.capital_social);

        enrichedData = {
          endereco,
          cpf: maskedCpf,
          score,
          nomeSocio, // Optionally we could use this if we wanted, but not explicitly requested to save in DB, only to extract.
          capital_social: data.capital_social
        };

      } catch (error) {
        console.warn(`Failed to fetch data for CNPJ ${cnpj}. Using fallback data.`);
        usedFallback = true;
      }
    } else {
      usedFallback = true;
    }

    if (usedFallback) {
      enrichedData = this.generateMockData();
    }

    // Fetch the lead to get its plataforma for quality calculation
    const currentLead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { plataforma: true }
    });

    // Prepare dynamic update data
    const updateData: any = {};
    
    // Always update address
    if (enrichedData.endereco) {
      updateData.endereco = enrichedData.endereco;
    }

    // Dynamically check if 'cpf' and 'score' exist in the Prisma Lead model schema
    const leadModel = Prisma.dmmf.datamodel.models.find(m => m.name === 'Lead');
    const hasCpf = leadModel?.fields.some(f => f.name === 'cpf');
    const hasScore = leadModel?.fields.some(f => f.name === 'score');

    if (hasCpf && enrichedData.cpf) {
      updateData.cpf = enrichedData.cpf;
    }
    
    if (hasScore && enrichedData.score) {
      updateData.score = enrichedData.score;
    }

    const hasQualidade = leadModel?.fields.some(f => f.name === 'qualidade');
    if (hasQualidade && enrichedData.capital_social !== undefined) {
      updateData.qualidade = this.calcularQualidadeEcom(enrichedData.capital_social, currentLead?.plataforma);
    }

    try {
      const updatedLead = await prisma.lead.update({
        where: { id: leadId },
        data: updateData,
      });

      return {
        success: true,
        source: usedFallback ? 'mock' : 'brasilapi',
        lead: updatedLead,
        enrichedFields: enrichedData
      };
    } catch (error) {
      console.error('Error updating lead with enriched data:', error);
      throw new Error('Failed to update lead');
    }
  }

  /**
   * Generates a masked CPF for structural realism.
   */
  private generateMaskedCpf(): string {
    const p1 = Math.floor(Math.random() * 999).toString().padStart(3, '0');
    const p2 = Math.floor(Math.random() * 999).toString().padStart(3, '0');
    return `***.${p1}.${p2}-**`;
  }

  /**
   * Calculates a simulated score based on company capital.
   */
  private calculateScoreFromCapital(capital: number | undefined | null): number {
    const val = capital || 0;
    if (val > 1000000) return 950;
    if (val > 150000) return 890;
    if (val > 50000) return 710;
    if (val > 10000) return 550;
    return 420;
  }

  /**
   * Generates dynamic and realistic mock data if API fails or no CNPJ.
   */
  private generateMockData() {
    const score = Math.floor(Math.random() * (950 - 320 + 1)) + 320;
    const ruas = ['Av. Paulista', 'Rua das Flores', 'Av. Brasil', 'Rua XV de Novembro'];
    const cidades = ['São Paulo - SP', 'Rio de Janeiro - RJ', 'Curitiba - PR', 'Belo Horizonte - MG'];
    
    const rua = ruas[Math.floor(Math.random() * ruas.length)];
    const cidade = cidades[Math.floor(Math.random() * cidades.length)];
    const numero = Math.floor(Math.random() * 2000) + 1;

    return {
      endereco: `${rua}, ${numero} - ${cidade}`,
      cpf: this.generateMaskedCpf(),
      score,
      nomeSocio: 'Sócio Fictício',
      capital_social: Math.floor(Math.random() * 800000) // Random capital for mock
    };
  }

  /**
   * Classifica a qualidade do Lead com base no capital social e na plataforma.
   */
  private calcularQualidadeEcom(capitalSocial: number | undefined | null, plataforma: string | undefined | null): string {
    const plataformasPME = ['nuvemshop', 'shopify', 'loja integrada', 'tray', 'woocommerce'];
    
    // Prioridade máxima se usa plataforma PME
    if (plataforma && plataformasPME.some(p => plataforma.toLowerCase().includes(p))) {
      // Se for uma empresa gigantesca (mais de 500k), ainda assim marcamos como Baixa ou Média? 
      // O prompt diz: "Se o script de scraping identificar plataformas amigáveis a PMEs... dê prioridade máxima ao lead."
      // Para manter a sanidade, vamos dar Alta Qualidade, a não ser que seja enterprise.
      // Vou classificar como Alta incondicionalmente se tiver plataforma PME.
      return 'Alta';
    }

    const val = capitalSocial || 0;
    if (val > 500000) {
      return 'Baixa';
    } else if (val >= 5000 && val <= 150000) {
      return 'Alta';
    }
    
    return 'Média';
  }
}
