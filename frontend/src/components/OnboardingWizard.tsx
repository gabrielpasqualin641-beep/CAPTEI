import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Smartphone, Search, Database, Send, CheckCircle2, 
  ArrowRight, ArrowLeft, Loader2, Sparkles, X, SmartphoneCharging 
} from 'lucide-react';

interface OnboardingWizardProps {
  onClose: () => void;
}

export function OnboardingWizard({ onClose }: OnboardingWizardProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Passo 1: Instâncias WhatsApp
  const [instances, setInstances] = useState<any[]>([]);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string>('');
  const [newInstanceName, setNewInstanceName] = useState('');
  const [qrCode, setQrCode] = useState<string | null>(null);

  // Passo 2: Google Maps Search
  const [nicho, setNicho] = useState('Restaurante');
  const [cidade, setCidade] = useState('São Paulo');
  const [foundLeads, setFoundLeads] = useState<any[]>([]);

  // Passo 4: Campanhas
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [campaignStarted, setCampaignStarted] = useState(false);

  useEffect(() => {
    fetchInstances();
    fetchTemplates();
  }, []);

  const fetchInstances = async () => {
    try {
      const { data } = await api.get('/instances');
      setInstances(data);
      const connected = data.find((inst: any) => inst.status === 'conectado' || inst.status === 'open');
      if (connected) {
        setSelectedInstanceId(connected.id);
      } else if (data.length > 0) {
        setSelectedInstanceId(data[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTemplates = async () => {
    try {
      const { data } = await api.get('/templates');
      setTemplates(data);
      if (data.length > 0) {
        setSelectedTemplateId(data[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ── Ações Passo 1 ──
  const handleCreateInstance = async () => {
    if (!newInstanceName) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post('/instances', { nome: newInstanceName });
      setNewInstanceName('');
      await fetchInstances();
      setSelectedInstanceId(data.id);
      
      // Busca QR Code
      const qrRes = await api.get(`/instances/${data.id}/qrcode`);
      if (qrRes.data.base64) {
        setQrCode(qrRes.data.base64);
      } else {
        setError('QR Code demorando para gerar. Atualize em instantes.');
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Erro ao criar instância.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshQr = async () => {
    if (!selectedInstanceId) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(`/instances/${selectedInstanceId}/qrcode`);
      if (data.base64) {
        setQrCode(data.base64);
      } else {
        setError('QR Code ainda não gerado pela Evolution API.');
      }
    } catch (err) {
      setError('Erro ao sincronizar QR Code.');
    } finally {
      setLoading(false);
    }
  };

  // ── Ações Passo 2 ──
  const handleSearchLeads = async () => {
    if (!nicho || !cidade) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post('/leads/search', {
        query: nicho,
        cidade: cidade
      });
      const results = (data.results || []).slice(0, 10); // Limita aos 10 primeiros
      setFoundLeads(results);
      if (results.length === 0) {
        setError('Nenhum lead encontrado com esta busca. Tente outro termo.');
      }
    } catch (err) {
      setError('Erro ao buscar leads no Google Maps.');
    } finally {
      setLoading(false);
    }
  };

  // ── Ações Passo 3 ──
  const handleImportLeads = async () => {
    if (foundLeads.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      await api.post('/leads/batch', {
        leads: foundLeads,
        tag: 'onboarding'
      });
      setStep(4);
    } catch (err) {
      setError('Erro ao importar leads para o CRM.');
    } finally {
      setLoading(false);
    }
  };

  // ── Ações Passo 4 ──
  const handleStartCampaign = async () => {
    if (!selectedInstanceId || !selectedTemplateId) {
      setError('Selecione uma instância WhatsApp e um template.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Simula a obtenção dos leads recém-importados
      const leadsRes = await api.get('/leads');
      const onboardingLeads = leadsRes.data.filter((l: any) => l.tags && l.tags.includes('onboarding'));
      const leadsIds = onboardingLeads.map((l: any) => l.id);

      if (leadsIds.length === 0) {
        throw new Error('Nenhum lead de onboarding encontrado no banco de dados.');
      }

      await api.post('/campaigns', {
        nome: `Onboarding Teste - ${nicho} em ${cidade}`,
        instancia_id: selectedInstanceId,
        template_id: selectedTemplateId,
        leads_ids: leadsIds,
        janela_inicio: '00:00',
        janela_fim: '23:59',
        dias_semana: [0, 1, 2, 3, 4, 5, 6],
        delay_min: 5,
        delay_max: 15
      });

      setCampaignStarted(true);
      localStorage.setItem('captei-onboarding-done', 'true');
    } catch (err: any) {
      setError(err?.message || 'Erro ao iniciar campanha de onboarding.');
    } finally {
      setLoading(false);
    }
  };

  const currentInstance = instances.find(i => i.id === selectedInstanceId);
  const isInstanceConnected = currentInstance?.status === 'conectado' || currentInstance?.status === 'open';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="relative w-full max-w-3xl bg-zinc-950 border border-zinc-800/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[500px]">
        
        {/* Painel Lateral do Wizard (Passos) */}
        <div className="w-full md:w-64 bg-zinc-900/40 border-b md:border-b-0 md:border-r border-zinc-800 p-6 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#25D366]/20 border border-[#25D366]/40">
                <Sparkles size={16} className="text-[#25D366]" />
              </span>
              <div>
                <h3 className="font-bold text-white text-sm">Captei</h3>
                <p className="text-[10px] text-zinc-500 font-semibold tracking-wider uppercase">Wizard de Onboarding</p>
              </div>
            </div>

            {/* Steps Indicator */}
            <div className="space-y-4">
              {[
                { num: 1, label: 'WhatsApp', icon: <Smartphone size={14} /> },
                { num: 2, label: 'Prospecção Maps', icon: <Search size={14} /> },
                { num: 3, label: 'Importação CRM', icon: <Database size={14} /> },
                { num: 4, label: 'Campanha Teste', icon: <Send size={14} /> },
              ].map((s) => (
                <div 
                  key={s.num} 
                  className={`flex items-center gap-3 p-2 rounded-lg transition-all ${
                    step === s.num 
                      ? 'bg-zinc-850 text-white font-medium shadow-sm border border-zinc-800' 
                      : step > s.num
                        ? 'text-emerald-400' 
                        : 'text-zinc-500'
                  }`}
                >
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs border ${
                    step === s.num
                      ? 'border-white bg-white text-zinc-950 font-bold'
                      : step > s.num
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                        : 'border-zinc-800 text-zinc-500 bg-transparent'
                  }`}>
                    {step > s.num ? <CheckCircle2 size={12} /> : s.num}
                  </span>
                  <span className="text-xs flex items-center gap-1.5">
                    {s.icon}
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 self-start mt-8"
          >
            Pular Onboarding
          </Button>
        </div>

        {/* Painel Principal do Conteúdo */}
        <div className="flex-1 p-8 flex flex-col justify-between relative">
          
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>

          {/* Área de Erro */}
          {error && (
            <div className="mb-4 p-3 bg-red-950/40 border border-red-800/60 rounded-lg text-xs text-red-300">
              ⚠️ {error}
            </div>
          )}

          {/* ── PASSO 1: WhatsApp ── */}
          {step === 1 && (
            <div className="space-y-5 flex-1 flex flex-col justify-center">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Smartphone className="text-[#25D366]" /> Passo 1: Conectar WhatsApp
                </h2>
                <p className="text-zinc-400 text-xs mt-1.5 leading-relaxed">
                  Para fazer disparos automáticos, precisamos de uma instância conectada. Escolha uma abaixo ou crie uma nova para escanear o QR Code.
                </p>
              </div>

              {instances.length > 0 && (
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Instâncias Ativas</label>
                  <div className="grid grid-cols-2 gap-2">
                    {instances.map(inst => (
                      <button
                        key={inst.id}
                        onClick={() => {
                          setSelectedInstanceId(inst.id);
                          setQrCode(null);
                        }}
                        className={`p-3 rounded-lg border text-left flex flex-col justify-between transition-all ${
                          selectedInstanceId === inst.id
                            ? 'border-[#25D366] bg-[#25D366]/5 shadow-sm'
                            : 'border-zinc-800 bg-zinc-900/20 hover:border-zinc-700'
                        }`}
                      >
                        <span className="text-xs font-bold text-zinc-200">{inst.nome}</span>
                        <span className={`text-[10px] mt-1.5 font-medium ${
                          inst.status === 'conectado' || inst.status === 'open'
                            ? 'text-emerald-400'
                            : 'text-zinc-500'
                        }`}>
                          {inst.status === 'conectado' || inst.status === 'open' ? '● Conectado' : '○ Desconectado'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Criar Nova / QR Code */}
              {!isInstanceConnected ? (
                <div className="p-4 border border-zinc-800/80 rounded-xl bg-zinc-900/20 space-y-4">
                  {!qrCode ? (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Nome da Instância (ex: Whatsapp_Teste)"
                        value={newInstanceName}
                        onChange={e => setNewInstanceName(e.target.value)}
                        className="bg-zinc-950 border-zinc-800 text-xs"
                      />
                      <Button 
                        onClick={handleCreateInstance} 
                        disabled={loading || !newInstanceName}
                        className="bg-[#25D366] hover:bg-[#1DA851] text-zinc-950 font-bold text-xs"
                      >
                        {loading ? <Loader2 className="animate-spin" size={14} /> : 'Gerar QR Code'}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <p className="text-[10px] text-zinc-400 font-bold text-center">Aponte a câmera do WhatsApp para conectar:</p>
                      <div className="bg-white p-1.5 rounded-lg">
                        <img src={qrCode} alt="WhatsApp QR Code" className="w-44 h-44" />
                      </div>
                      <div className="flex gap-2 w-full">
                        <Button variant="outline" size="sm" onClick={handleRefreshQr} disabled={loading} className="flex-1 text-xs border-zinc-800">
                          {loading ? <Loader2 className="animate-spin h-3.5 w-3.5" /> : 'Sincronizar Status'}
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => setQrCode(null)} className="text-xs">
                          Voltar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 border border-emerald-900/30 rounded-xl bg-emerald-950/10 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/30 shrink-0">
                    <SmartphoneCharging className="text-emerald-400" size={18} />
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-white">Instância Ativa & Conectada!</h4>
                    <p className="text-[10px] text-emerald-400/80 mt-0.5">O WhatsApp está pronto para realizar os disparos de testes.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── PASSO 2: Buscar Leads no Google Maps ── */}
          {step === 2 && (
            <div className="space-y-5 flex-1 flex flex-col justify-center">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Search className="text-[#25D366]" /> Passo 2: Prospectar no Google Maps
                </h2>
                <p className="text-zinc-400 text-xs mt-1.5 leading-relaxed">
                  Defina um nicho e uma cidade para varrer negócios locais em tempo real e extrair telefones.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Nicho / Segmento</label>
                  <Input 
                    value={nicho} 
                    onChange={e => setNicho(e.target.value)} 
                    placeholder="Ex: Clinica de Estetica" 
                    className="bg-zinc-950 border-zinc-800 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Cidade</label>
                  <Input 
                    value={cidade} 
                    onChange={e => setCidade(e.target.value)} 
                    placeholder="Ex: São Paulo" 
                    className="bg-zinc-950 border-zinc-800 text-xs"
                  />
                </div>
              </div>

              <Button 
                onClick={handleSearchLeads} 
                disabled={loading || !nicho || !cidade}
                className="w-full bg-[#25D366] hover:bg-[#1DA851] text-zinc-950 font-extrabold text-xs py-5"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={16} /> Capturando leads do Google Maps (aguarde)...
                  </>
                ) : (
                  'Buscar Empresas de Teste 🚀'
                )}
              </Button>

              {foundLeads.length > 0 && (
                <div className="border border-zinc-800 bg-zinc-950 rounded-lg p-3 max-h-[160px] overflow-y-auto space-y-1">
                  <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block mb-2">Primeiras 10 empresas encontradas</label>
                  {foundLeads.map((l, i) => (
                    <div key={i} className="flex justify-between items-center text-[10px] py-1 border-b border-zinc-900 last:border-0">
                      <span className="font-semibold text-zinc-300 truncate max-w-[200px]">{l.nome}</span>
                      <span className="text-zinc-500 font-mono text-[9px]">{l.telefone || 'Sem fone'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── PASSO 3: Importação CRM ── */}
          {step === 3 && (
            <div className="space-y-5 flex-1 flex flex-col justify-center">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Database className="text-[#25D366]" /> Passo 3: Importar para o CRM
                </h2>
                <p className="text-zinc-400 text-xs mt-1.5 leading-relaxed">
                  Temos **{foundLeads.length} leads** prontos para importação. O sistema criará cartões no funil CRM na coluna "Novo" e aplicará a tag de onboarding.
                </p>
              </div>

              <Card className="bg-zinc-900/20 border-zinc-800 p-4">
                <CardContent className="p-0 flex items-center gap-4 justify-between">
                  <div>
                    <span className="text-3xl font-extrabold text-white">{foundLeads.length}</span>
                    <span className="text-zinc-500 text-xs block mt-0.5">Leads Prospectados</span>
                  </div>
                  <ArrowRight className="text-zinc-700" size={20} />
                  <div className="text-right">
                    <span className="text-xs font-bold text-[#25D366] bg-[#25D366]/10 px-2 py-0.5 border border-[#25D366]/20 rounded-full">CRM Funil</span>
                    <span className="text-[10px] text-zinc-500 block mt-1">Status: Novo</span>
                  </div>
                </CardContent>
              </Card>

              <Button 
                onClick={handleImportLeads} 
                disabled={loading || foundLeads.length === 0}
                className="w-full bg-[#25D366] hover:bg-[#1DA851] text-zinc-950 font-extrabold text-xs py-5"
              >
                {loading ? <Loader2 className="animate-spin mr-2" size={16} /> : 'Importar Todos no CRM e Avançar 📥'}
              </Button>
            </div>
          )}

          {/* ── PASSO 4: Envio da Campanha de Teste ── */}
          {step === 4 && (
            <div className="space-y-5 flex-1 flex flex-col justify-center">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Send className="text-[#25D366]" /> Passo 4: Disparar Campanha de Teste
                </h2>
                <p className="text-zinc-400 text-xs mt-1.5 leading-relaxed">
                  Tudo pronto! Agora selecione um template de mensagem para enviar aos leads de onboarding importados.
                </p>
              </div>

              {campaignStarted ? (
                <div className="p-6 border border-emerald-800/40 bg-emerald-950/10 rounded-2xl text-center space-y-3">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/30">
                    <CheckCircle2 className="text-emerald-400" size={24} />
                  </span>
                  <h3 className="font-bold text-white text-sm">Campanha Iniciada com Sucesso!</h3>
                  <p className="text-[10px] text-zinc-400 leading-relaxed max-w-sm mx-auto">
                    Os disparos estão na fila do BullMQ com delays dinâmicos. Você já pode fechar este wizard e conferir o CRM ou a página de campanhas para ver o progresso!
                  </p>
                  <Button onClick={onClose} className="bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold text-xs mt-2 w-full">
                    Concluir e Ir para Painel
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {templates.length > 0 ? (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Escolha o Script / Template</label>
                      <select
                        value={selectedTemplateId}
                        onChange={e => setSelectedTemplateId(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-lg p-2.5 text-xs focus:ring-[#25D366] focus:border-[#25D366]"
                      >
                        {templates.map(temp => (
                          <option key={temp.id} value={temp.id}>{temp.nome} ({temp.nicho || 'Geral'})</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="p-3 bg-yellow-950/20 border border-yellow-800/40 rounded-lg text-[10px] text-yellow-300">
                      ⚠️ Nenhum template cadastrado. Vá até a aba "Templates" após concluir para criar seu script.
                    </div>
                  )}

                  <Button 
                    onClick={handleStartCampaign} 
                    disabled={loading || !selectedInstanceId || templates.length === 0}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-extrabold text-xs py-5"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="animate-spin mr-2" size={16} /> Iniciando disparos...
                      </>
                    ) : (
                      'Disparar Primeira Campanha! 🚀'
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* ── Navegação Base ── */}
          {!campaignStarted && (
            <div className="flex justify-between border-t border-zinc-900 pt-5 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep(prev => Math.max(1, prev - 1))}
                disabled={step === 1 || loading}
                className="text-xs border-zinc-800 text-zinc-400"
              >
                <ArrowLeft size={14} className="mr-1" /> Voltar
              </Button>

              {step < 3 && (
                <Button
                  onClick={() => {
                    if (step === 1 && !isInstanceConnected) {
                      setError('Por favor, conecte uma instância WhatsApp para prosseguir.');
                      return;
                    }
                    if (step === 2 && foundLeads.length === 0) {
                      setError('Por favor, faça uma busca e capture leads para prosseguir.');
                      return;
                    }
                    setError(null);
                    setStep(prev => prev + 1);
                  }}
                  disabled={loading}
                  className="bg-[#25D366] hover:bg-[#1DA851] text-zinc-950 font-bold text-xs"
                >
                  Avançar <ArrowRight size={14} className="ml-1" />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
