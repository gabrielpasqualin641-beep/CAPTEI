import { useState, useEffect, useMemo } from 'react';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Eye, Trash2, X, Globe, Zap, Loader2 } from 'lucide-react';

export function Leads() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [searchName, setSearchName] = useState('');
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [filterNicho, setFilterNicho] = useState('');
  const [filterCidade, setFilterCidade] = useState('');
  const [filterQualidade, setFilterQualidade] = useState('Todos');

  // Detalhes do Lead (Drawer/Modal)
  const [selectedLead, setSelectedLead] = useState<any | null>(null);

  // Enriquecimento
  const [showEnrichModal, setShowEnrichModal] = useState(false);
  const [enrichingLeadId, setEnrichingLeadId] = useState<string | null>(null);
  const [enrichingLeadName, setEnrichingLeadName] = useState('');
  const [cnpjInput, setCnpjInput] = useState('');
  const [enrichingLoading, setEnrichingLoading] = useState(false);
  const [orderByEnriched, setOrderByEnriched] = useState(false);

  // Toast local (Shadcn style)
  const [toast, setToast] = useState<{ message: string; visible: boolean; type: 'success' | 'error' }>({
    message: '',
    visible: false,
    type: 'success'
  });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, visible: true, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 4000);
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 700) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20';
    if (score >= 500) return 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20';
    return 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20';
  };

  const handleOpenEnrichModal = (id: string, name: string) => {
    setEnrichingLeadId(id);
    setEnrichingLeadName(name);
    setCnpjInput('');
    setShowEnrichModal(true);
  };

  const handleCloseEnrichModal = () => {
    if (enrichingLoading) return;
    setShowEnrichModal(false);
    setEnrichingLeadId(null);
    setEnrichingLeadName('');
    setCnpjInput('');
  };

  const handleRunEnrichment = async () => {
    if (!enrichingLeadId) return;
    setEnrichingLoading(true);
    try {
      const { data } = await api.post(`/enrichment/${enrichingLeadId}`, {
        cnpj: cnpjInput || undefined
      });

      if (data.success) {
        const updatedFields = data.enrichedFields;
        setLeads(leads.map(l => l.id === enrichingLeadId ? { ...l, ...updatedFields } : l));
        
        if (selectedLead?.id === enrichingLeadId) {
          setSelectedLead((prev: any) => ({ ...prev, ...updatedFields }));
        }

        showToast(`Lead "${enrichingLeadName}" enriquecido com sucesso! (${data.source === 'brasilapi' ? 'BrasilAPI' : 'Mock/Fallback'})`);
        setShowEnrichModal(false);
      } else {
        showToast('Erro ao enriquecer lead.', 'error');
      }
    } catch (error) {
      console.error('Erro ao enriquecer lead:', error);
      showToast('Erro de conexão ou falha ao enriquecer lead.', 'error');
    } finally {
      setEnrichingLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [orderByEnriched]);

  async function fetchLeads() {
    try {
      setLoading(true);
      const url = orderByEnriched ? '/leads?orderByEnriched=true' : '/leads';
      const { data } = await api.get(url);
      setLeads(data);
    } catch (error) {
      console.error('Erro ao buscar leads:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await api.patch(`/leads/${id}/status`, { status: newStatus });
      setLeads(leads.map(l => l.id === id ? { ...l, status: newStatus } : l));
    } catch (error) {
      console.error('Erro ao atualizar status', error);
      alert('Erro ao atualizar status do lead.');
    }
  };

  const handleDeleteLead = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este lead?')) return;
    try {
      await api.delete(`/leads/${id}`);
      setLeads(leads.filter(l => l.id !== id));
      if (selectedLead?.id === id) setSelectedLead(null);
    } catch (error) {
      console.error('Erro ao excluir lead', error);
      alert('Erro ao excluir lead.');
    }
  };

  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const matchName = lead.nome.toLowerCase().includes(searchName.toLowerCase());
      const matchStatus = filterStatus === 'Todos' || lead.status === filterStatus;
      const matchNicho = !filterNicho || (lead.nicho || '').toLowerCase().includes(filterNicho.toLowerCase());
      const matchCidade = !filterCidade || (lead.cidade || '').toLowerCase().includes(filterCidade.toLowerCase());
      const matchQualidade = filterQualidade === 'Todos' || lead.qualidade === filterQualidade;
      return matchName && matchStatus && matchNicho && matchCidade && matchQualidade;
    });
  }, [leads, searchName, filterStatus, filterNicho, filterCidade, filterQualidade]);

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Novo': return 'text-blue-500';
      case 'Contatado': return 'text-yellow-500';
      case 'Respondeu': return 'text-purple-500';
      case 'Proposta Enviada': return 'text-orange-500';
      case 'Fechado': return 'text-[#25D366]';
      case 'Perdido': return 'text-red-500';
      default: return 'text-zinc-300';
    }
  };

  const getQualidadeBadge = (qualidade: string) => {
    switch(qualidade) {
      case 'Alta': return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-0">Alta Qualidade</Badge>;
      case 'Média': return <Badge className="bg-blue-500 text-white hover:bg-blue-600 border-0">Média Qualidade</Badge>;
      case 'Baixa': return <Badge className="bg-zinc-600 text-zinc-100 hover:bg-zinc-700 border-0">Baixa Qualidade</Badge>;
      default: return <span className="text-zinc-600 text-sm">N/A</span>;
    }
  };

  return (
    <div className="space-y-6 relative">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Leads e CRM</h1>
        <p className="text-zinc-400 mt-2">Gerencie seus leads, atualize o status e acompanhe seu pipeline.</p>
      </div>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-xl text-zinc-100 flex items-center justify-between">
            <span>Pipeline de Vendas ({filteredLeads.length})</span>
          </CardTitle>
          <div className="flex flex-wrap gap-4 mt-4">
            <Input 
              placeholder="Buscar por nome..." 
              value={searchName} 
              onChange={e => setSearchName(e.target.value)}
              className="max-w-xs bg-zinc-950 border-zinc-800 text-zinc-200"
            />
            <Select value={filterStatus} onValueChange={(val) => setFilterStatus(val || 'Todos')}>
              <SelectTrigger className="w-[180px] bg-zinc-950 border-zinc-800 text-zinc-200">
                <SelectValue placeholder="Filtrar por Status" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-200">
                <SelectItem value="Todos" className="focus:bg-zinc-800 focus:text-white">Todos os Status</SelectItem>
                <SelectItem value="Novo" className="focus:bg-zinc-800 focus:text-white text-blue-400">Novo</SelectItem>
                <SelectItem value="Contatado" className="focus:bg-zinc-800 focus:text-white text-yellow-400">Contatado</SelectItem>
                <SelectItem value="Respondeu" className="focus:bg-zinc-800 focus:text-white text-purple-400">Respondeu</SelectItem>
                <SelectItem value="Proposta Enviada" className="focus:bg-zinc-800 focus:text-white text-orange-400">Proposta Enviada</SelectItem>
                <SelectItem value="Fechado" className="focus:bg-zinc-800 focus:text-white text-[#25D366]">Fechado</SelectItem>
                <SelectItem value="Perdido" className="focus:bg-zinc-800 focus:text-white text-red-400">Perdido</SelectItem>
              </SelectContent>
            </Select>
            <Input 
              placeholder="Nicho/Segmento..." 
              value={filterNicho} 
              onChange={e => setFilterNicho(e.target.value)}
              className="max-w-[150px] bg-zinc-950 border-zinc-800 text-zinc-200"
            />
            <Input 
              placeholder="Cidade..." 
              value={filterCidade} 
              onChange={e => setFilterCidade(e.target.value)}
              className="max-w-[150px] bg-zinc-950 border-zinc-800 text-zinc-200"
            />
            <Select value={filterQualidade} onValueChange={(val) => setFilterQualidade(val || 'Todos')}>
              <SelectTrigger className="w-[180px] bg-zinc-950 border-zinc-800 text-zinc-200">
                <SelectValue placeholder="Tamanho/Qualidade" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-200">
                <SelectItem value="Todos" className="focus:bg-zinc-800 focus:text-white">Todas as Qualidades</SelectItem>
                <SelectItem value="Alta" className="focus:bg-zinc-800 focus:text-white text-emerald-400">Alta (PME Ideal)</SelectItem>
                <SelectItem value="Média" className="focus:bg-zinc-800 focus:text-white text-blue-400">Média</SelectItem>
                <SelectItem value="Baixa" className="focus:bg-zinc-800 focus:text-white text-zinc-400">Baixa (Enterprise)</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant={orderByEnriched ? "default" : "outline"}
              onClick={() => setOrderByEnriched(!orderByEnriched)}
              className={`h-10 border-zinc-800 text-xs font-semibold flex items-center gap-2 ${
                orderByEnriched 
                  ? 'bg-amber-500 hover:bg-amber-600 text-zinc-950 border-0' 
                  : 'bg-transparent text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              <Zap size={14} className={orderByEnriched ? "fill-zinc-950 text-zinc-950" : ""} />
              {orderByEnriched ? "Ordenado por Enriquecidos" : "Ordenar por Enriquecidos"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-zinc-800">
            <Table className="table-fixed w-full">
              <TableHeader>
                <TableRow className="border-zinc-800 hover:bg-transparent">
                  <TableHead className="text-zinc-400 w-auto">Nome</TableHead>
                  <TableHead className="text-zinc-400 w-[90px]">Cidade</TableHead>
                  <TableHead className="text-zinc-400 w-[90px]">Nicho</TableHead>
                  <TableHead className="text-zinc-400 w-[120px]">CPF Sócio</TableHead>
                  <TableHead className="text-zinc-400 w-[110px]">Qualidade</TableHead>
                  <TableHead className="text-zinc-400 w-[80px]">Score</TableHead>
                  <TableHead className="text-zinc-400 w-[120px]">Status</TableHead>
                  <TableHead className="text-zinc-400 w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-zinc-500">
                      Carregando leads...
                    </TableCell>
                  </TableRow>
                ) : filteredLeads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-zinc-500">
                      Nenhum lead encontrado.
                    </TableCell>
                  </TableRow>
                ) : filteredLeads.map((lead) => (
                  <TableRow key={lead.id} className={`border-zinc-800 hover:bg-zinc-800/50 ${lead.optOut ? 'opacity-55 bg-red-950/5' : ''}`}>
                    <TableCell className="font-medium text-zinc-200 truncate" title={lead.nome}>
                      <div className="flex items-center gap-2">
                        <span className={lead.optOut ? 'line-through text-zinc-500 font-normal' : ''}>{lead.nome}</span>
                        {lead.optOut && (
                          <Badge variant="outline" className="border-red-500/30 bg-red-500/10 text-red-400 text-[9px] font-bold px-1.5 py-0 shrink-0">
                            Opt-out
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-zinc-300 truncate" title={lead.cidade || ''}>
                      {lead.cidade || <span className="text-zinc-600">-</span>}
                    </TableCell>
                    <TableCell className="truncate" title={lead.nicho || ''}>
                      {lead.nicho ? (
                        <Badge variant="outline" className="border-zinc-700 text-zinc-400 bg-zinc-800/50 truncate max-w-[80px]">
                          {lead.nicho}
                        </Badge>
                      ) : (
                        <span className="text-zinc-600">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-zinc-300 truncate font-mono text-xs" title={lead.cpf || ''}>
                      {lead.cpf || <span className="text-zinc-600">-</span>}
                    </TableCell>
                    <TableCell>
                      {getQualidadeBadge(lead.qualidade)}
                    </TableCell>
                    <TableCell>
                      {lead.score !== undefined && lead.score !== null ? (
                        <Badge variant="outline" className={getScoreBadgeColor(lead.score)}>
                          {lead.score}
                        </Badge>
                      ) : (
                        <span className="text-zinc-600">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Select 
                        value={lead.status} 
                        onValueChange={(val) => handleUpdateStatus(lead.id, val || lead.status)}
                      >
                        <SelectTrigger className={`w-[110px] h-8 text-xs bg-zinc-950 border-zinc-800 ${getStatusColor(lead.status)} font-medium`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-800">
                          <SelectItem value="Novo" className="focus:bg-zinc-800 text-blue-400">Novo</SelectItem>
                          <SelectItem value="Contatado" className="focus:bg-zinc-800 text-yellow-400">Contatado</SelectItem>
                          <SelectItem value="Respondeu" className="focus:bg-zinc-800 text-purple-400">Respondeu</SelectItem>
                          <SelectItem value="Proposta Enviada" className="focus:bg-zinc-800 text-orange-400">Proposta Enviada</SelectItem>
                          <SelectItem value="Fechado" className="focus:bg-zinc-800 text-[#25D366]">Fechado</SelectItem>
                          <SelectItem value="Perdido" className="focus:bg-zinc-800 text-red-400">Perdido</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                          onClick={() => setSelectedLead(lead)}
                          title="Ver Detalhes"
                        >
                          <Eye size={16} />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          disabled={enrichingLeadId === lead.id}
                          className="h-8 w-8 text-amber-400 hover:text-amber-300 hover:bg-amber-400/10"
                          onClick={() => handleOpenEnrichModal(lead.id, lead.nome)}
                          title="Enriquecer Lead"
                        >
                          {enrichingLeadId === lead.id ? (
                            <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
                          ) : (
                            <Zap size={16} />
                          )}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-red-400/70 hover:text-red-400 hover:bg-red-400/10"
                          onClick={() => handleDeleteLead(lead.id)}
                          title="Excluir"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Drawer / Modal de Detalhes */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-all">
          <div className="w-full max-w-md h-full bg-zinc-950 border-l border-zinc-800 p-6 shadow-2xl overflow-y-auto animate-in slide-in-from-right">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Detalhes do Lead</h2>
              <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white" onClick={() => setSelectedLead(null)}>
                <X size={20} />
              </Button>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Empresa</label>
                <div className="text-lg font-medium text-zinc-100">{selectedLead.nome}</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Telefone</label>
                  <div className="text-zinc-200 mt-1">
                    {selectedLead.telefone && !selectedLead.telefone.startsWith('SEM_FONE') ? selectedLead.telefone : 'N/A'}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">E-mail</label>
                  <div className="text-zinc-200 mt-1 break-all">
                    {selectedLead.email || 'N/A'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Site / Link</label>
                  <div className="mt-1">
                    {selectedLead.site ? (
                      <a href={selectedLead.site} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline flex items-center gap-1">
                        <Globe size={14} /> {selectedLead.site}
                      </a>
                    ) : 'N/A'}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Instagram</label>
                  <div className="mt-1">
                    {selectedLead.instagram ? (
                      <a href={`https://instagram.com/${selectedLead.instagram.replace('@', '')}`} target="_blank" rel="noreferrer" className="text-pink-400 hover:underline">
                        {selectedLead.instagram}
                      </a>
                    ) : 'N/A'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Nicho / Segmento</label>
                  <div className="text-zinc-200 mt-1">{selectedLead.nicho || 'N/A'}</div>
                </div>
                <div>
                  <label className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Cidade</label>
                  <div className="text-zinc-200 mt-1">{selectedLead.cidade || 'N/A'}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">CPF do Sócio</label>
                  <div className="text-zinc-200 mt-1 font-mono text-sm">{selectedLead.cpf || <span className="text-zinc-600">Não enriquecido</span>}</div>
                </div>
                <div>
                  <label className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Score de Crédito</label>
                  <div className="mt-1">
                    {selectedLead.score !== undefined && selectedLead.score !== null ? (
                      <Badge variant="outline" className={getScoreBadgeColor(selectedLead.score)}>
                        {selectedLead.score}
                      </Badge>
                    ) : (
                      <span className="text-zinc-600">Não enriquecido</span>
                    )}
                  </div>
                </div>
              </div>

              {selectedLead.nomeSocio && (
                <div>
                  <label className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Nome do Sócio</label>
                  <div className="text-zinc-200 mt-1 font-medium">{selectedLead.nomeSocio}</div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Plataforma</label>
                  <div className="mt-1">
                    {selectedLead.plataforma ? (
                      <Badge variant="outline" className="border-indigo-500/50 text-indigo-400 bg-indigo-500/10">
                        {selectedLead.plataforma}
                      </Badge>
                    ) : 'N/A'}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Qualidade</label>
                  <div className="mt-1">
                    {getQualidadeBadge(selectedLead.qualidade)}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Data de Captura</label>
                <div className="text-zinc-300 mt-1">
                  {format(new Date(selectedLead.criado_em), "dd 'de' MMMM 'de' yyyy, 'às' HH:mm", { locale: ptBR })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Enriquecimento */}
      {showEnrichModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm transition-all animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-zinc-950 border border-zinc-800 p-6 rounded-xl shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Zap className="text-amber-400 h-5 w-5 fill-amber-400/10" /> Enriquecer Lead
              </h3>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-zinc-400 hover:text-white h-8 w-8 hover:bg-zinc-900" 
                onClick={handleCloseEnrichModal} 
                disabled={enrichingLoading}
              >
                <X size={18} />
              </Button>
            </div>
            
            <p className="text-sm text-zinc-400 mb-4">
              Informe o CNPJ da empresa <strong className="text-zinc-200">{enrichingLeadName}</strong> para buscar dados oficiais da BrasilAPI. Deixe em branco para usar o gerador automático (fallback).
            </p>

            <div className="space-y-4">
              <Input
                placeholder="Ex: 00.000.000/0001-91"
                value={cnpjInput}
                onChange={e => setCnpjInput(e.target.value)}
                disabled={enrichingLoading}
                className="bg-zinc-900 border-zinc-800 text-zinc-100 placeholder-zinc-600 focus-visible:ring-amber-500"
              />

              <div className="flex justify-end gap-3 pt-2">
                <Button 
                  variant="outline" 
                  onClick={handleCloseEnrichModal} 
                  disabled={enrichingLoading}
                  className="border-zinc-800 text-zinc-300 bg-transparent hover:bg-zinc-900"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleRunEnrichment} 
                  disabled={enrichingLoading}
                  className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-semibold flex items-center gap-2 border-0"
                >
                  {enrichingLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Processando...
                    </>
                  ) : (
                    'Confirmar'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast de Sucesso/Erro (Shadcn style) */}
      {toast.visible && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg border shadow-xl flex items-center gap-3 animate-in slide-in-from-bottom duration-300 ${
          toast.type === 'success' 
            ? 'bg-zinc-950 border-emerald-500/30 text-zinc-100' 
            : 'bg-zinc-950 border-rose-500/30 text-zinc-100'
        }`}>
          <div className={`h-2 w-2 rounded-full animate-pulse ${
            toast.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'
          }`} />
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}
    </div>
  );
}
