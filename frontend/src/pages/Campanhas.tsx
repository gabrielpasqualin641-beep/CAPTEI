import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { Megaphone, Plus, Play, Pause, Square, X, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function Campanhas() {
  const [campanhas, setCampanhas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingId, setStartingId] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nome, setNome] = useState('');
  const [instanciaId, setInstanciaId] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [delayMin, setDelayMin] = useState('30');
  const [delayMax, setDelayMax] = useState('120');
  const [janelaInicio, setJanelaInicio] = useState('09:00');
  const [janelaFim, setJanelaFim] = useState('18:00');
  
  // Selection
  const [selectedNicho, setSelectedNicho] = useState('Todos');
  const [availableNichos, setAvailableNichos] = useState<string[]>([]);
  const [allLeads, setAllLeads] = useState<any[]>([]);

  // Dropdowns
  const [instancias, setInstancias] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);

  // Auto-refresh polling
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  // Auto-refresh: when any campaign is "Ativa", poll every 5s
  useEffect(() => {
    const hasActive = campanhas.some(c => c.status === 'Ativa');

    if (hasActive && !pollingRef.current) {
      pollingRef.current = setInterval(async () => {
        try {
          const { data } = await api.get('/campaigns');
          setCampanhas(data);

          // Stop polling if no active campaigns left
          const stillActive = data.some((c: any) => c.status === 'Ativa');
          if (!stillActive && pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
        } catch (_) {}
      }, 5000);
    }

    if (!hasActive && pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [campanhas]);

  async function fetchData() {
    try {
      const [campRes, instRes, tempRes, leadsRes] = await Promise.all([
        api.get('/campaigns'),
        api.get('/instances'),
        api.get('/templates'),
        api.get('/leads')
      ]);
      
      setCampanhas(campRes.data);
      setInstancias(instRes.data); 
      setTemplates(tempRes.data);
      setAllLeads(leadsRes.data);

      const nichos = Array.from(new Set(leadsRes.data.map((l: any) => l.nicho).filter(Boolean))) as string[];
      setAvailableNichos(nichos);

    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleCreate = async () => {
    if (!nome || !instanciaId || !templateId) {
      alert("Preencha Nome, Instância e Template!");
      return;
    }

    const leadsToInclude = selectedNicho === 'Todos' 
      ? allLeads 
      : allLeads.filter(l => l.nicho === selectedNicho);

    if (leadsToInclude.length === 0) {
      alert("Nenhum lead encontrado para este nicho.");
      return;
    }

    const leadsIds = leadsToInclude.map(l => l.id);

    try {
      await api.post('/campaigns', {
        nome,
        instancia_id: instanciaId,
        template_id: templateId,
        leads_ids: leadsIds,
        janela_inicio: janelaInicio,
        janela_fim: janelaFim,
        delay_min: parseInt(delayMin) || 30,
        delay_max: parseInt(delayMax) || 120,
        dias_semana: [1,2,3,4,5] // Default: Dias úteis
      });

      setIsModalOpen(false);
      fetchData(); 
      
      setNome('');
      setInstanciaId('');
      setTemplateId('');
      setSelectedNicho('Todos');
      
    } catch (error) {
      console.error('Erro ao iniciar campanha:', error);
      alert("Erro ao iniciar campanha");
    }
  };

  const handleStart = async (id: string) => {
    setStartingId(id);
    try {
      const { data } = await api.post(`/campaigns/${id}/start`);
      // Refresh to get updated status
      await fetchData();
      if (data.progresso) {
        console.log(`[Campanha] Iniciada: ${data.progresso.pendentes} envios pendentes`);
      }
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Erro ao iniciar campanha.';
      alert(msg);
    } finally {
      setStartingId(null);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await api.patch(`/campaigns/${id}/status`, { status: newStatus });
      fetchData();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      alert('Erro ao atualizar status da campanha.');
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'Ativa': return <Badge className="bg-[#25D366] text-white">Ativa</Badge>;
      case 'Pausada': return <Badge className="bg-yellow-500 text-white">Pausada</Badge>;
      case 'Concluida': return <Badge className="bg-blue-500 text-white">Concluída</Badge>;
      case 'Cancelada': return <Badge className="bg-red-500 text-white">Cancelada</Badge>;
      default: return <Badge className="bg-zinc-600 text-white">{status}</Badge>;
    }
  };

  const leadsCount = selectedNicho === 'Todos' ? allLeads.length : allLeads.filter(l => l.nicho === selectedNicho).length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Campanhas</h1>
          <p className="text-zinc-400 mt-2">Gerencie seus disparos em massa e sequências automáticas.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="bg-[#25D366] hover:bg-[#1DA851] text-white">
          <Plus className="mr-2" size={18} />
          Nova Campanha
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="text-zinc-500">Carregando...</div>
        ) : campanhas.length === 0 ? (
          <div className="col-span-full py-12 text-center border-2 border-dashed border-zinc-800 rounded-lg text-zinc-500">
            <Megaphone className="mx-auto h-12 w-12 mb-4 opacity-20" />
            <p>Nenhuma campanha criada ainda.</p>
            <p className="text-sm">Clique em "Nova Campanha" para selecionar seus leads e agendar o envio.</p>
          </div>
        ) : (
          campanhas.map((campanha) => {
            const total = campanha.progresso?.total || 0;
            const enviados = campanha.progresso?.enviados || 0;
            const perc = total > 0 ? (enviados / total) * 100 : 0;
            const isStarting = startingId === campanha.id;

            return (
              <Card key={campanha.id} className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl font-bold text-zinc-100">{campanha.nome}</h3>
                        {getStatusBadge(campanha.status)}
                        {campanha.status === 'Ativa' && (
                          <div className="flex items-center gap-1.5 text-xs text-emerald-400/80">
                            <RefreshCw size={12} className="animate-spin" />
                            <span>ao vivo</span>
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-zinc-400 mt-1">
                        Instância: {campanha.instancia?.nome} • Template: {campanha.template?.nome}
                      </p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Janela: {campanha.janela_inicio} – {campanha.janela_fim} • Delay: {campanha.delay_min}s – {campanha.delay_max}s
                      </p>
                    </div>
                    
                    <div className="flex gap-2">
                      {/* ▶ Iniciar — para campanhas pausadas ou recém-criadas */}
                      {(campanha.status === 'Pausada') && (
                        <Button 
                          size="icon" 
                          variant="outline" 
                          className="border-[#25D366]/30 text-[#25D366] hover:text-white hover:bg-[#25D366] transition-all duration-200"
                          onClick={() => handleStart(campanha.id)}
                          disabled={isStarting}
                          title="Iniciar campanha"
                        >
                          {isStarting ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : (
                            <Play size={18} />
                          )}
                        </Button>
                      )}
                      {/* ⏸ Pausar — para campanhas ativas */}
                      {campanha.status === 'Ativa' && (
                        <Button 
                          size="icon" 
                          variant="outline" 
                          className="border-zinc-700 text-yellow-500 hover:text-yellow-400 hover:bg-zinc-800"
                          onClick={() => handleUpdateStatus(campanha.id, 'Pausada')}
                          title="Pausar campanha"
                        >
                          <Pause size={18} />
                        </Button>
                      )}
                      {/* ⏹ Cancelar */}
                      {campanha.status !== 'Cancelada' && campanha.status !== 'Concluida' && (
                        <Button 
                          size="icon" 
                          variant="outline" 
                          className="border-zinc-700 text-red-500 hover:text-red-400 hover:bg-zinc-800"
                          onClick={() => {
                            if (window.confirm('Tem certeza que deseja cancelar esta campanha? Todos os envios pendentes serão cancelados.')) {
                              handleUpdateStatus(campanha.id, 'Cancelada');
                            }
                          }}
                          title="Cancelar campanha"
                        >
                          <Square size={18} />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Barra de progresso */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-zinc-400">
                      <span>
                        Progresso do Envio ({enviados} de {total})
                        {campanha.status === 'Ativa' && total > 0 && enviados < total && (
                          <span className="text-emerald-400 ml-2 text-xs">processando...</span>
                        )}
                      </span>
                      <span className={perc >= 100 ? 'text-emerald-400 font-semibold' : ''}>
                        {Math.round(perc)}%
                      </span>
                    </div>
                    <Progress value={perc} className="h-2 bg-zinc-800" />
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg w-full max-w-xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-4 border-b border-zinc-800">
              <h2 className="text-xl font-bold text-white">Nova Campanha</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              <div className="space-y-2">
                <label className="text-sm text-zinc-400">Nome da Campanha</label>
                <Input 
                  placeholder="Ex: Oferta de Carnaval" 
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="bg-zinc-950 border-zinc-800 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-zinc-400">Instância WhatsApp</label>
                  <Select value={instanciaId} onValueChange={(val) => setInstanciaId(val || '')}>
                    <SelectTrigger className="bg-zinc-950 border-zinc-800 text-zinc-200">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      {instancias.map(i => (
                        <SelectItem key={i.id} value={i.id}>{i.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-zinc-400">Template</label>
                  <Select value={templateId} onValueChange={(val) => setTemplateId(val || '')}>
                    <SelectTrigger className="bg-zinc-950 border-zinc-800 text-zinc-200">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      {templates.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-zinc-400 flex justify-between">
                  <span>Público Alvo (Leads)</span>
                  <span className="text-blue-400">{leadsCount} leads selecionados</span>
                </label>
                <Select value={selectedNicho} onValueChange={(val) => setSelectedNicho(val || 'Todos')}>
                  <SelectTrigger className="bg-zinc-950 border-zinc-800 text-zinc-200">
                    <SelectValue placeholder="Selecione um nicho..." />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    <SelectItem value="Todos">Todos os Leads na Base</SelectItem>
                    {availableNichos.map(n => (
                      <SelectItem key={n} value={n}>Nicho: {n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-zinc-400">Delay Mínimo (seg)</label>
                  <Input 
                    type="number"
                    value={delayMin}
                    onChange={(e) => setDelayMin(e.target.value)}
                    className="bg-zinc-950 border-zinc-800 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-zinc-400">Delay Máximo (seg)</label>
                  <Input 
                    type="number"
                    value={delayMax}
                    onChange={(e) => setDelayMax(e.target.value)}
                    className="bg-zinc-950 border-zinc-800 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-zinc-400">Horário de Início</label>
                  <Input 
                    type="time"
                    value={janelaInicio}
                    onChange={(e) => setJanelaInicio(e.target.value)}
                    className="bg-zinc-950 border-zinc-800 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-zinc-400">Horário de Fim</label>
                  <Input 
                    type="time"
                    value={janelaFim}
                    onChange={(e) => setJanelaFim(e.target.value)}
                    className="bg-zinc-950 border-zinc-800 text-white"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-zinc-800 flex justify-end gap-2 bg-zinc-900 rounded-b-lg">
              <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="text-zinc-300 hover:text-white">
                Cancelar
              </Button>
              <Button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700 text-white">
                <Play size={16} className="mr-2"/> Iniciar Campanha
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
