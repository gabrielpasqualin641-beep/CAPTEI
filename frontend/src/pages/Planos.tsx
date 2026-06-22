import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Check, X, Star, Loader2, Sparkles, Zap, Shield, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface PlanDetails {
  nome: string;
  preco: number;
  disparos_mes: number;
  instancias: number;
  leads: number;
  buscas_dia: number;
  templates: number;
  campanhas: number;
  followups: boolean;
  busca_plataforma: boolean;
  enriquecimento: boolean;
  ia: boolean;
  usuarios: number;
  suporte: string;
}

interface UserPlanInfo {
  plano: string;
  data_renovacao: string | null;
  mp_subscription_id: string | null;
  limites: PlanDetails;
  uso: {
    disparos_mes: number;
    instancias: number;
    campanhas: number;
    leads: number;
    templates: number;
  };
}

export default function Planos() {
  const [loading, setLoading] = useState(true);
  const [subscribingKey, setSubscribingKey] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [isAnual, setIsAnual] = useState(false);
  const [planInfo, setPlanInfo] = useState<UserPlanInfo | null>(null);

  const fetchPlanInfo = async () => {
    try {
      const res = await api.get('/pagamentos/meu-plano');
      setPlanInfo(res.data);
    } catch (error) {
      console.error('Erro ao carregar dados do plano:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlanInfo();
  }, []);

  const handleSubscribe = async (planoKey: string) => {
    try {
      setSubscribingKey(planoKey);
      const res = await api.post('/pagamentos/assinar', { planoKey, isAnual });
      
      if (res.data.checkoutUrl) {
        window.location.href = res.data.checkoutUrl;
      } else {
        // Se for free, atualiza plano local
        await fetchPlanInfo();
      }
    } catch (error) {
      console.error('Erro ao iniciar assinatura:', error);
      alert('Não foi possível iniciar a assinatura. Tente novamente.');
    } finally {
      setSubscribingKey(null);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Tem certeza de que deseja cancelar sua assinatura? Você perderá acesso aos limites extras ao final do ciclo.')) {
      return;
    }
    try {
      setCancelling(true);
      await api.post('/pagamentos/cancelar');
      await fetchPlanInfo();
      alert('Assinatura cancelada com sucesso.');
    } catch (error) {
      console.error('Erro ao cancelar assinatura:', error);
      alert('Erro ao cancelar assinatura. Entre em contato com o suporte.');
    } finally {
      setCancelling(false);
    }
  };

  const formatPrice = (priceCents: number) => {
    let preco = priceCents;
    if (isAnual) {
      preco = Math.round(preco * 12 * 0.8); // 20% desconto
    }
    const valorMensalEquivalente = isAnual ? preco / 12 : preco;
    
    return (valorMensalEquivalente / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const planosData = [
    {
      key: 'free',
      icon: <Shield className="w-6 h-6 text-zinc-400" />,
      tagline: 'Para quem está começando',
      features: [
        { name: '100 disparos por mês', active: true },
        { name: '1 instância conectada', active: true },
        { name: 'Até 200 leads cadastrados', active: true },
        { name: '3 buscas locais por dia', active: true },
        { name: '2 templates de mensagem', active: true },
        { name: '1 campanha ativa', active: true },
        { name: 'Mensagens de followup', active: false },
        { name: 'Busca direta em plataformas', active: false },
        { name: 'Enriquecimento de CNPJ', active: false },
        { name: 'Inteligência Artificial', active: false },
        { name: 'Suporte via Comunidade', active: true },
      ]
    },
    {
      key: 'starter',
      icon: <Zap className="w-6 h-6 text-emerald-400" />,
      tagline: 'Ideal para profissionais autônomos',
      features: [
        { name: '1.000 disparos por mês', active: true },
        { name: '1 instância conectada', active: true },
        { name: 'Até 2.000 leads cadastrados', active: true },
        { name: '20 buscas locais por dia', active: true },
        { name: '10 templates de mensagem', active: true },
        { name: '3 campanhas ativas', active: true },
        { name: 'Mensagens de followup', active: true },
        { name: 'Busca direta em plataformas', active: false },
        { name: 'Enriquecimento de CNPJ', active: false },
        { name: 'Inteligência Artificial', active: false },
        { name: 'Suporte por E-mail', active: true },
      ]
    },
    {
      key: 'pro',
      icon: <Sparkles className="w-6 h-6 text-indigo-400 animate-pulse" />,
      tagline: 'O mais popular e completo',
      isPopular: true,
      features: [
        { name: '5.000 disparos por mês', active: true },
        { name: '3 instâncias conectadas', active: true },
        { name: 'Até 10.000 leads cadastrados', active: true },
        { name: '100 buscas locais por dia', active: true },
        { name: 'Templates ilimitados', active: true },
        { name: '10 campanhas ativas', active: true },
        { name: 'Mensagens de followup', active: true },
        { name: 'Busca direta em plataformas', active: true },
        { name: 'Enriquecimento de CNPJ', active: true },
        { name: 'Inteligência Artificial', active: true },
        { name: 'Suporte Prioritário', active: true },
      ]
    },
    {
      key: 'enterprise',
      icon: <Crown className="w-6 h-6 text-amber-400" />,
      tagline: 'Para grandes operações e agências',
      features: [
        { name: '20.000 disparos por mês', active: true },
        { name: '10 instâncias conectadas', active: true },
        { name: 'Leads ilimitados', active: true },
        { name: 'Buscas diárias ilimitadas', active: true },
        { name: 'Templates ilimitados', active: true },
        { name: 'Campanhas ilimitadas', active: true },
        { name: 'Mensagens de followup', active: true },
        { name: 'Busca direta em plataformas', active: true },
        { name: 'Enriquecimento de CNPJ', active: true },
        { name: 'Inteligência Artificial', active: true },
        { name: 'Suporte Dedicado', active: true },
      ]
    }
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
        <p className="text-zinc-400 text-sm">Carregando planos e limites...</p>
      </div>
    );
  }

  const planoAtalKey = planInfo?.plano || 'free';

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl animate-in fade-in duration-300">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold text-white mb-4 tracking-tight">
          Escolha o Plano Perfeito para o seu Negócio
        </h1>
        <p className="text-zinc-400 max-w-2xl mx-auto mb-8">
          Acelere sua prospecção com automações completas, buscas ilimitadas e IA inteligente integrada.
        </p>

        {/* Toggle Mensal/Anual */}
        <div className="flex items-center justify-center gap-4">
          <span className={`text-sm font-medium ${!isAnual ? 'text-white' : 'text-zinc-400'}`}>Mensal</span>
          <button
            onClick={() => setIsAnual(!isAnual)}
            className="relative w-14 h-7 bg-zinc-800 rounded-full p-1 transition-colors duration-300 focus:outline-none border border-zinc-700"
          >
            <div
              className={`w-5 h-5 bg-emerald-500 rounded-full shadow-md transform transition-transform duration-300 ${
                isAnual ? 'translate-x-7' : 'translate-x-0'
              }`}
            />
          </button>
          <span className={`text-sm font-medium flex items-center gap-2 ${isAnual ? 'text-white' : 'text-zinc-400'}`}>
            Anual
            <Badge variant="outline" className="bg-emerald-950/50 text-emerald-400 border-emerald-800 text-[10px] py-0 px-2 font-semibold animate-pulse">
              Economize 20%
            </Badge>
          </span>
        </div>
      </div>

      {/* Info Plano Atual */}
      {planInfo && (
        <Card className="mb-12 bg-zinc-950 border border-zinc-800/80 shadow-2xl overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-emerald-500 to-indigo-500" />
          <CardContent className="p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-zinc-400 text-sm">Seu Plano Atual:</span>
                <Badge className="bg-emerald-900/40 text-emerald-400 border border-emerald-800 px-3 py-1 font-semibold uppercase tracking-wider text-xs">
                  {planInfo.plano}
                </Badge>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Consumo Geral do Período
              </h2>
              {planInfo.data_renovacao && (
                <p className="text-zinc-500 text-xs">
                  Sua assinatura renova em: <strong className="text-zinc-300">{new Date(planInfo.data_renovacao).toLocaleDateString('pt-BR')}</strong>
                </p>
              )}
            </div>

            {/* Progresso de Disparos */}
            <div className="w-full md:w-80 flex flex-col gap-2">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-zinc-400">Mensagens Disparadas</span>
                <span className="text-white">
                  {planInfo.uso.disparos_mes} / {planInfo.limites.disparos_mes === -1 ? 'Sem limite' : planInfo.limites.disparos_mes}
                </span>
              </div>
              <div className="w-full bg-zinc-900 rounded-full h-3 border border-zinc-800 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-indigo-500 h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${
                      planInfo.limites.disparos_mes === -1
                        ? 0
                        : Math.min((planInfo.uso.disparos_mes / planInfo.limites.disparos_mes) * 100, 100)
                    }%`,
                  }}
                />
              </div>
              {planInfo.uso.disparos_mes >= planInfo.limites.disparos_mes && planInfo.limites.disparos_mes !== -1 && (
                <span className="text-xs text-red-400 font-semibold flex items-center gap-1">
                  ⚠️ Limite de disparos atingido neste mês!
                </span>
              )}
            </div>

            {/* Cancelar Assinatura se aplicável */}
            {planInfo.mp_subscription_id && (
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={cancelling}
                className="text-xs text-zinc-400 hover:text-red-400 hover:bg-zinc-900/50 border-zinc-800 hover:border-red-900/50 transition-colors"
              >
                {cancelling ? 'Cancelando...' : 'Cancelar Assinatura'}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Grid de Planos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {planosData.map((plano) => {
          const rawPrice = {
            free: 0,
            starter: 4990,
            pro: 12990,
            enterprise: 29990,
          }[plano.key] || 0;

          const isCurrent = planoAtalKey === plano.key;
          const isPro = plano.isPopular;

          return (
            <Card
              key={plano.key}
              className={`flex flex-col relative bg-zinc-950 border transition-all duration-300 overflow-hidden hover:translate-y-[-4px] ${
                isCurrent
                  ? 'border-emerald-600 shadow-emerald-950/20 shadow-2xl'
                  : isPro
                  ? 'border-indigo-500 shadow-indigo-950/20 shadow-2xl'
                  : 'border-zinc-800/80 hover:border-zinc-700'
              }`}
            >
              {/* Highlight Popular (Pro) */}
              {isPro && (
                <div className="absolute top-0 right-0 left-0 bg-gradient-to-r from-indigo-600 to-indigo-500 text-center py-1.5 text-xs font-bold text-white uppercase tracking-wider flex items-center justify-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-white" /> Recomendado
                </div>
              )}

              {/* Corpo do plano */}
              <div className={`p-6 flex flex-col flex-grow ${isPro ? 'pt-10' : ''}`}>
                <div className="flex items-center justify-between mb-4">
                  <span className="p-2.5 bg-zinc-900 rounded-xl border border-zinc-800 shadow-inner">
                    {plano.icon}
                  </span>
                  {isCurrent && (
                    <Badge className="bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] uppercase font-bold py-0.5 px-2">
                      Seu Plano
                    </Badge>
                  )}
                </div>

                <h3 className="text-xl font-bold text-white capitalize">{plano.key}</h3>
                <p className="text-zinc-400 text-xs mt-1.5 min-h-[32px]">{plano.tagline}</p>

                {/* Preço */}
                <div className="my-6">
                  {rawPrice === 0 ? (
                    <span className="text-3xl font-extrabold text-white">Grátis</span>
                  ) : (
                    <div>
                      <span className="text-3xl font-extrabold text-white">
                        {formatPrice(rawPrice)}
                      </span>
                      <span className="text-zinc-500 text-xs font-medium ml-1">/mês</span>
                    </div>
                  )}
                  {isAnual && rawPrice > 0 && (
                    <p className="text-zinc-500 text-[10px] mt-1.5">
                      Cobrado anualmente (total {((rawPrice * 12 * 0.8) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})
                    </p>
                  )}
                </div>

                {/* Botão de Ação */}
                <div className="mb-6">
                  {isCurrent ? (
                    <Button disabled className="w-full bg-zinc-900 border border-zinc-800 text-zinc-500 cursor-not-allowed">
                      Plano Ativo
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleSubscribe(plano.key)}
                      disabled={subscribingKey !== null}
                      className={`w-full transition-all duration-300 ${
                        isPro
                          ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-950/40'
                          : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                      }`}
                    >
                      {subscribingKey === plano.key ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : rawPrice === 0 ? (
                        'Mudar para Grátis'
                      ) : (
                        'Assinar Agora'
                      )}
                    </Button>
                  )}
                </div>

                {/* Lista de Recursos */}
                <ul className="space-y-3.5 border-t border-zinc-900 pt-6">
                  {plano.features.map((feat, index) => (
                    <li key={index} className="flex items-start gap-2.5 text-xs text-zinc-300">
                      {feat.active ? (
                        <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <X className="w-4 h-4 text-zinc-600 shrink-0 mt-0.5" />
                      )}
                      <span className={feat.active ? 'text-zinc-300' : 'text-zinc-500 line-through'}>
                        {feat.name}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
