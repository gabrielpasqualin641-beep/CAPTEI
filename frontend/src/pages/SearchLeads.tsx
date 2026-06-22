// src/pages/SearchLeads.tsx
import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import {
  Search,
  MapPin,
  Briefcase,
  Globe,
  CheckSquare,
  Flag,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { PlatformBadge } from '@/components/PlatformBadge';

// ── Types ─────────────────────────────────────────────────────────────────────
interface VarreduraStatus {
  jobGroupId: string;
  nicho: string;
  modo: 'osm' | 'ecommerce' | 'platform';
  status: 'processando' | 'concluido' | 'cancelado';
  totalCidades: number;
  concluidas: number;
  falhas: number;
  leadsCapturados: number;
}

// ── Component: National progress overlay ─────────────────────────────────────
function NationalProgressCard({
  varredura,
  onCancel,
  onClose,
}: {
  varredura: VarreduraStatus;
  onCancel: () => void;
  onClose: () => void;
}) {
  const progress = varredura.totalCidades > 0 ? Math.round(((varredura.concluidas + varredura.falhas) / varredura.totalCidades) * 100) : 0;
  const isDone = varredura.status === 'concluido' || varredura.status === 'cancelado';
  return (
    <div
      className="fixed bottom-6 right-6 z-50 w-96 rounded-2xl shadow-2xl border overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        borderColor: isDone
          ? varredura.status === 'concluido'
            ? '#22c55e44'
            : '#ef444444'
          : '#3b82f644',
        boxShadow: isDone
          ? varredura.status === 'concluido'
            ? '0 0 30px rgba(34,197,94,0.15)'
            : '0 0 30px rgba(239,68,68,0.15)'
          : '0 0 30px rgba(59,130,246,0.2)',
      }}
    >
      {/* Top bar */}
      <div className="h-1 bg-slate-700/50 w-full">
        <div
          className="h-1 transition-all duration-700 ease-out"
          style={{
            width: `${progress}%`,
            background: isDone
              ? varredura.status === 'concluido'
                ? '#22c55e'
                : '#ef4444'
              : 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
          }}
        />
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            {isDone ? (
              varredura.status === 'concluido' ? (
                <CheckCircle2 size={18} className="text-green-400 flex-shrink-0" />
              ) : (
                <AlertCircle size={18} className="text-red-400 flex-shrink-0" />
              )
            ) : (
              <div className="relative flex-shrink-0">
                <Loader2 size={18} className="text-blue-400 animate-spin" />
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-white leading-tight">
                {isDone
                  ? varredura.status === 'concluido'
                    ? '🏁 Varredura Concluída!'
                    : '⏹ Varredura Cancelada'
                  : '🇧🇷 Varredura Nacional'}
              </p>
              <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[220px]">
                {varredura.modo === 'ecommerce' ? 'E-commerce Online' : 'Mapa OSM'} · {varredura.nicho}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors p-1 rounded">
            <X size={16} />
          </button>
        </div>
        {/* Metrics */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="rounded-lg p-2.5 text-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <p className="text-lg font-bold text-white leading-none">{varredura.concluidas + varredura.falhas}</p>
            <p className="text-xs text-slate-500 mt-1">de {varredura.totalCidades}</p>
            <p className="text-xs text-slate-400">cidades</p>
          </div>
          <div className="rounded-lg p-2.5 text-center" style={{ background: 'rgba(34,197,94,0.08)' }}>
            <p className="text-lg font-bold text-green-400 leading-none">{varredura.leadsCapturados}</p>
            <p className="text-xs text-green-500/60 mt-1">leads</p>
            <p className="text-xs text-slate-400">capturados</p>
          </div>
          <div className="rounded-lg p-2.5 text-center" style={{ background: 'rgba(239,68,68,0.06)' }}>
            <p className="text-lg font-bold text-red-400 leading-none">{varredura.falhas}</p>
            <p className="text-xs text-red-500/60 mt-1">erros</p>
            <p className="text-xs text-slate-400">cidades</p>
          </div>
        </div>
        {/* Internal progress bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-slate-500 mb-1.5">
            <span>{progress}% concluído</span>
            <span>{varredura.totalCidades - varredura.concluidas - varredura.falhas} restantes</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2">
            <div
              className="h-2 rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${progress}%`,
                background: isDone
                  ? varredura.status === 'concluido'
                    ? '#22c55e'
                    : '#ef4444'
                  : 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
              }}
            />
          </div>
        </div>
        {/* Actions */}
        <div className="flex gap-2">
          {isDone ? (
            <a
              href="/leads"
              className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium text-white transition-all"
              style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}
            >
              <ExternalLink size={14} />
              Ver no CRM
            </a>
          ) : (
            <button
              onClick={onCancel}
              className="flex-1 py-2 px-3 rounded-lg text-sm font-medium text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-colors"
            >
              Cancelar varredura
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────
export function SearchLeads() {
  const [searchMode, setSearchMode] = useState<'osm' | 'ecommerce' | 'platform'>('osm');
  const [nicho, setNicho] = useState('');
  const [cidade, setCidade] = useState('');
  const [platform, setPlatform] = useState<'Nuvemshop' | 'Shopify' | 'Tray' | 'Loja Integrada'>('Nuvemshop');
  const [segment, setSegment] = useState('');
  const [state, setState] = useState('');
  const [modoNacional, setModoNacional] = useState(false);
  const [apenasComTelefone, setApenasComTelefone] = useState(true);
  const [ocultarInstituicoes, setOcultarInstituicoes] = useState(true);
  const [ocultarGrandesRedes, setOcultarGrandesRedes] = useState(true);
  const [palavrasExcluir, setPalavrasExcluir] = useState('');
  const [palavrasObrigatorias, setPalavrasObrigatorias] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [visibleCount, setVisibleCount] = useState(50);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [progress, setProgress] = useState<{ status: string; total: number; processados: number } | null>(null);
  const [varredura, setVarredura] = useState<VarreduraStatus | null>(null);
  const [showVarreduraCard, setShowVarreduraCard] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const startPolling = (jobGroupId: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(async () => {
      try {
        const { data } = await api.get<VarreduraStatus>(`/leads/national-status?jobGroupId=${jobGroupId}`);
        setVarredura(data);
        if (data.status === 'concluido' || data.status === 'cancelado') {
          clearInterval(pollingRef.current!);
          pollingRef.current = null;
        }
      } catch (_) {}
    }, 4000);
  };

  const handleToggleNacional = () => {
    setModoNacional((prev) => {
      if (!prev) setCidade('');
      return !prev;
    });
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nicho) return;
    if (!modoNacional && !cidade) return;
    setLoading(true);
    setProgress(null);
    const newJobId = Math.random().toString(36).substring(7);
    let progressInterval: any;
    try {
      let url = '/leads/search';
      if (searchMode === 'ecommerce') url = '/leads/scrape-ecommerce';
      else if (searchMode === 'platform') url = '/leads/scrape-platform';

      const payload: any = {
        query: nicho,
        location: modoNacional ? '' : cidade,
        nicho,
        cidade: modoNacional ? '' : cidade,
        apenasComTelefone,
        ocultarInstituicoes,
        ocultarGrandesRedes,
        palavrasExcluir,
        palavrasObrigatorias,
        jobId: newJobId,
        ...(searchMode === 'platform' && { plataforma: platform, estado: state, segmento: segment, maxResults: 100 }),
      };

      if (!modoNacional && searchMode === 'ecommerce') {
        progressInterval = setInterval(async () => {
          try {
            const { data } = await api.get(`/leads/scrape-progress?jobId=${newJobId}`);
            if (data.progress) setProgress(data.progress);
          } catch (_) {}
        }, 2000);
      }

      const { data } = await api.post(url, payload);

      if (data.modo === 'nacional') {
        setVarredura({
          jobGroupId: data.jobGroupId,
          nicho,
          modo: searchMode,
          status: 'processando',
          totalCidades: data.totalCidades,
          concluidas: 0,
          falhas: 0,
          leadsCapturados: 0,
        });
        setShowVarreduraCard(true);
        startPolling(data.jobGroupId);
        setResults([]);
      } else {
        let fetchedResults = Array.isArray(data) ? data : (data.results || []);

        if (searchMode === 'osm') {
          if (apenasComTelefone) {
            fetchedResults = fetchedResults.filter((r: any) => !!r.telefone);
          }
          if (ocultarInstituicoes) {
            const excluded = ['escola', 'prefeitura', 'universidade', 'colégio', 'colegio', 'hospital', 'posto de saude', 'polícia', 'policia', 'igreja', 'instituto', 'governo'];
            fetchedResults = fetchedResults.filter((r: any) => !excluded.some(word => r.nome?.toLowerCase().includes(word)));
          }
          if (ocultarGrandesRedes) {
            const pmeExcluded = ['coco bambu', 'madero', 'outback', 'terraço jardins', 'seen', 'hotel', 'resort', 'fasano', 'rooftop', 'sheraton', 'tivoli', 'copacabana palace', 'franquia'];
            fetchedResults = fetchedResults.filter((r: any) => 
              !pmeExcluded.some(word => r.nome?.toLowerCase().includes(word) || r.endereco?.toLowerCase().includes(word))
            );
          }
          if (palavrasExcluir) {
            const words = palavrasExcluir.split(',').map(w => w.trim().toLowerCase()).filter(Boolean);
            if (words.length > 0) {
              fetchedResults = fetchedResults.filter((r: any) => !words.some(word => r.nome?.toLowerCase().includes(word)));
            }
          }
          if (palavrasObrigatorias) {
            const words = palavrasObrigatorias.split(',').map(w => w.trim().toLowerCase()).filter(Boolean);
            if (words.length > 0) {
              fetchedResults = fetchedResults.filter((r: any) => words.some(word => r.nome?.toLowerCase().includes(word)));
            }
          }
        }

        setResults(fetchedResults);
        setSelectedIds([]);
        setVisibleCount(50);
      }
    } catch (error) {
      console.error('Erro na busca:', error);
    } finally {
      if (progressInterval) clearInterval(progressInterval);
      setLoading(false);
      setProgress(null);
    }
  };

  const handleCancelVarredura = async () => {
    if (!varredura) return;
    try {
      await api.delete(`/leads/national-cancel?jobGroupId=${varredura.jobGroupId}`);
      setVarredura((prev) => (prev ? { ...prev, status: 'cancelado' } : null));
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    } catch (_) {}
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === results.length) setSelectedIds([]);
    else setSelectedIds(results.map((r) => r.id_google));
  };

  const handleSaveLeads = async () => {
    const selectedLeads = results.filter((r) => selectedIds.includes(r.id_google));
    if (selectedLeads.length === 0) return;
    const payload = selectedLeads.map((lead) => ({ ...lead, nicho, cidade }));
    const tag = `${searchMode === 'ecommerce' ? 'Online' : 'Físico'} - ${nicho} - ${cidade}`;
    try {
      const { data } = await api.post('/leads/batch', { leads: payload, tag });
      alert(`Sucesso! ${data.adicionados} leads salvos. ${data.duplicados} ignorados (duplicados).`);
      setSelectedIds([]);
    } catch (error) {
      console.error('Erro ao salvar leads:', error);
      alert('Erro ao salvar leads.');
    }
  };

  return (
    <div className="space-y-6">
      {showVarreduraCard && varredura && (
        <NationalProgressCard varredura={varredura} onCancel={handleCancelVarredura} onClose={() => setShowVarreduraCard(false)} />
      )}

      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Buscar Leads</h1>
        <p className="text-zinc-400 mt-2">Busque por empresas no mapa ou faça mineração online de E-commerces.</p>
      </div>

      {/* Toggle search mode */}
      <div className="flex gap-4">
        <Button
          onClick={() => {
            setSearchMode('osm');
            setResults([]);
          }}
          variant={searchMode === 'osm' ? 'default' : 'secondary'}
          className={searchMode === 'osm' ? 'bg-[#25D366] text-white hover:bg-[#1DA851]' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}
        >
          <MapPin className="mr-2" size={16} /> Busca Google Maps
        </Button>
        <Button
          onClick={() => {
            setSearchMode('ecommerce');
            setResults([]);
          }}
          variant={searchMode === 'ecommerce' ? 'default' : 'secondary'}
          className={searchMode === 'ecommerce' ? 'bg-[#25D366] text-white hover:bg-[#1DA851]' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}
        >
          <Globe className="mr-2" size={16} /> Busca E-commerce Online
        </Button>
        <Button
          onClick={() => {
            setSearchMode('platform');
            setResults([]);
          }}
          variant={searchMode === 'platform' ? 'default' : 'secondary'}
          className={searchMode === 'platform' ? 'bg-[#25D366] text-white hover:bg-[#1DA851]' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}
        >
          <Globe className="mr-2" size={16} /> Busca Por Plataforma
        </Button>
      </div>

      <Card className="bg-zinc-900 border-zinc-800 text-zinc-100">
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex gap-4 items-end">
              {/* Nicho field */}
              <div className="flex-1 space-y-2">
                <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                  <Briefcase size={16} /> Nicho ou Segmento
                </label>
                <Input
                  placeholder={searchMode === 'ecommerce' ? 'Ex: Moda infantil, Joias, Decoração' : 'Ex: Clínicas odontológicas'}
                  value={nicho}
                  onChange={(e) => setNicho(e.target.value)}
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>

              {/* Platform specific fields */}
              {searchMode === 'platform' && (
                <div className="grid grid-cols-3 gap-4 mt-2">
                  {/* Plataforma */}
                  <div className="flex-1 space-y-2">
                    <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                      <Briefcase size={16} /> Plataforma
                    </label>
                    <select
                      value={platform}
                      onChange={(e) => setPlatform(e.target.value as any)}
                      className="bg-zinc-800 border-zinc-700 h-8 text-sm"
                    >
                      <option value="Nuvemshop">Nuvemshop</option>
                      <option value="Shopify">Shopify</option>
                      <option value="Tray">Tray</option>
                      <option value="Loja Integrada">Loja Integrada</option>
                    </select>
                  </div>
                  {/* Segmento */}
                  <div className="flex-1 space-y-2">
                    <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                      <Briefcase size={16} /> Segmento
                    </label>
                    <Input
                      placeholder="Ex: Moda, Eletrônicos"
                      value={segment}
                      onChange={(e) => setSegment(e.target.value)}
                      className="bg-zinc-800 border-zinc-700 h-8 text-sm"
                    />
                  </div>
                  {/* Estado */}
                  <div className="flex-1 space-y-2">
                    <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                      <MapPin size={16} /> Estado
                    </label>
                    <select
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="bg-zinc-800 border-zinc-700 h-8 text-sm"
                    >
                      <option value="">Todos</option>
                      <option value="SP">SP</option>
                      <option value="SE">SE</option>
                      <option value="TO">TO</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Cidade & Nacional toggle */}
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                    <MapPin size={16} /> Cidade / Região
                    <span className="text-zinc-600 text-xs">(opcional)</span>
                  </label>
                  {/* Toggle "Todo o Brasil" */}
                  <button
                    type="button"
                    onClick={handleToggleNacional}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all duration-200 ${
                      modoNacional
                        ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                        : 'bg-zinc-800 border-zinc-600 text-zinc-400 hover:border-zinc-500'
                    }`}
                  >
                    <Flag size={11} />
                    {modoNacional ? '🇧🇷 Todo o Brasil' : 'Busca nacional'}
                  </button>
                </div>
                <Input
                  placeholder={modoNacional ? '🇧🇷 Varredura em todas as capitais' : 'Ex: São Paulo, SP'}
                  value={modoNacional ? '' : cidade}
                  onChange={(e) => {
                    if (!modoNacional) setCidade(e.target.value);
                  }}
                  disabled={modoNacional}
                  className={`border-zinc-700 transition-all ${
                    modoNacional
                      ? 'bg-blue-500/5 border-blue-500/30 text-blue-400/70 cursor-not-allowed'
                      : 'bg-zinc-800'
                  }`}
                />
              </div>
            </div>

            {/* Banner for national mode */}
            {modoNacional && (
              <div
                className="flex items-start gap-3 p-4 rounded-xl border"
                style={{
                  background: 'linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(139,92,246,0.08) 100%)',
                  borderColor: 'rgba(59,130,246,0.25)',
                }}
              >
                <span className="text-xl mt-0.5">🇧🇷</span>
                <div>
                  <p className="text-sm font-semibold text-blue-300">Varredura Nacional Ativa</p>
                  <p className="text-xs text-slate-400 mt-1">
                    O sistema irá buscar <strong className="text-slate-300">{nicho || 'seu nicho'}</strong> em{' '}
                    <strong className="text-slate-300">27 capitais e metrópoles</strong> do Brasil em segundo plano.
                    Os leads serão salvos automaticamente no seu CRM à medida que forem encontrados.
                    O processo pode levar alguns minutos.
                  </p>
                </div>
              </div>
            )}

            {/* Loading progress for e‑commerce */}
            {loading && progress && !modoNacional && searchMode === 'ecommerce' && (
              <div className="mt-4 p-4 border border-zinc-700 bg-zinc-800/50 rounded-lg">
                <div className="flex justify-between text-sm text-zinc-300 mb-2">
                  <span>{progress.status}</span>
                  {progress.total > 0 && <span>{progress.processados} / {progress.total}</span>}
                </div>
                {progress.total > 0 && (
                  <div className="w-full bg-zinc-700 rounded-full h-2">
                    <div
                      className="bg-[#25D366] h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.round((progress.processados / progress.total) * 100))}%` }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Advanced filters for OSM */}
            {searchMode === 'osm' && !modoNacional && (
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-zinc-800">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="phone-filter"
                      checked={apenasComTelefone}
                      onCheckedChange={(checked) => setApenasComTelefone(checked as boolean)}
                      className="border-zinc-500"
                    />
                    <label htmlFor="phone-filter" className="text-sm font-medium leading-none text-zinc-300 cursor-pointer">
                      Apenas com telefone
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="inst-filter"
                      checked={ocultarInstituicoes}
                      onCheckedChange={(checked) => setOcultarInstituicoes(checked as boolean)}
                      className="border-zinc-500"
                    />
                    <label htmlFor="inst-filter" className="text-sm font-medium leading-none text-zinc-300 cursor-pointer">
                      Ocultar instituições públicas/educacionais
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="pme-filter"
                      checked={ocultarGrandesRedes}
                      onCheckedChange={(checked) => setOcultarGrandesRedes(checked as boolean)}
                      className="border-zinc-500"
                    />
                    <label htmlFor="pme-filter" className="text-sm font-medium leading-none text-zinc-300 cursor-pointer">
                      Ocultar grandes redes e redes hoteleiras (Foco em PMEs)
                    </label>
                  </div>
                </div>
                <div className="space-y-3">
                  <Input
                    placeholder="Palavras a excluir (ex: buffet, escola)"
                    value={palavrasExcluir}
                    onChange={(e) => setPalavrasExcluir(e.target.value)}
                    className="bg-zinc-800 border-zinc-700 h-8 text-sm"
                  />
                  <Input
                    placeholder="Palavras obrigatórias (ex: gourmet, bistrô)"
                    value={palavrasObrigatorias}
                    onChange={(e) => setPalavrasObrigatorias(e.target.value)}
                    className="bg-zinc-800 border-zinc-700 h-8 text-sm"
                  />
                </div>
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full bg-[#25D366] hover:bg-[#1DA851] text-white">
              {loading ? <Loader2 className="mr-2 animate-spin" size={16} /> : <Search className="mr-2" size={16} />}
              {loading ? 'Carregando...' : 'Buscar'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Results table (local mode only) */}
      {results.length > 0 && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xl text-zinc-100">Resultados ({results.length})</CardTitle>
            <Button onClick={handleSaveLeads} disabled={selectedIds.length === 0} variant="secondary" className="bg-zinc-800 text-white hover:bg-zinc-700">
              <CheckSquare className="mr-2 h-4 w-4" /> Salvar Selecionados ({selectedIds.length})
            </Button>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-zinc-800">
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800 hover:bg-transparent">
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedIds.length === results.length && results.length > 0}
                        onCheckedChange={toggleSelectAll}
                        className="border-zinc-500"
                      />
                    </TableHead>
                    <TableHead className="text-zinc-400">Empresa</TableHead>
                    <TableHead className="text-zinc-400">Telefone</TableHead>
                    <TableHead className="text-zinc-400">Status</TableHead>
                    <TableHead className="text-zinc-400">E-mail</TableHead>
                    <TableHead className="text-zinc-400">Plataforma</TableHead>
                    <TableHead className="text-zinc-400">Site</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.slice(0, visibleCount).map((place) => (
                    <TableRow key={place.id_google} className="border-zinc-800 hover:bg-zinc-800/50">
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(place.id_google)}
                          onCheckedChange={() => toggleSelect(place.id_google)}
                          className="border-zinc-500"
                        />
                      </TableCell>
                      <TableCell className="font-medium text-zinc-200">
                        {place.nome}
                        <div className="text-xs text-zinc-500 font-normal mt-1 truncate max-w-xs">
                          {place.endereco || 'Loja Online'}
                        </div>
                      </TableCell>
                      <TableCell className="text-zinc-300">
                        {place.telefone ? <span>{place.telefone}</span> : <Badge variant="outline" className="text-zinc-500 border-zinc-700">Sem telefone</Badge>}
                      </TableCell>
                      <TableCell className="text-zinc-300">
                        {place.status_extracao ? <span className="text-xs whitespace-nowrap">{place.status_extracao}</span> : <span className="text-zinc-600">N/A</span>}
                      </TableCell>
                      <TableCell className="text-zinc-300 text-sm">
                        {place.email || <span className="text-zinc-600">N/A</span>}
                      </TableCell>
                      <TableCell className="text-zinc-300">
                        {place.plataforma ? <PlatformBadge platform={place.plataforma} /> : <span className="text-zinc-600">N/A</span>}
                      </TableCell>
                      <TableCell className="text-zinc-300">
                        {place.site ? (
                          <a href={place.site} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline inline-flex items-center gap-1 text-sm">
                            <Globe size={14} /> Site
                          </a>
                        ) : (
                          <span className="text-zinc-600 text-sm">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {visibleCount < results.length && (
                <div className="mt-6 flex justify-center">
                  <Button onClick={() => setVisibleCount((prev) => prev + 50)} variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                    Carregar mais ({results.length - visibleCount} restantes)
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default SearchLeads;
