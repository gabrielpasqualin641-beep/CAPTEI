import { useState, useEffect } from 'react';
import { Users, Send, MessageCircleReply, CheckCircle2, TrendingUp, TrendingDown, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { OnboardingWizard } from '../components/OnboardingWizard';

const mockChartData = [
  { name: 'Seg', envios: 20, respostas: 5 },
  { name: 'Ter', envios: 45, respostas: 12 },
  { name: 'Qua', envios: 28, respostas: 8 },
  { name: 'Qui', envios: 80, respostas: 25 },
  { name: 'Sex', envios: 95, respostas: 30 },
  { name: 'Sáb', envios: 35, respostas: 10 },
  { name: 'Dom', envios: 15, respostas: 2 },
];

export function Dashboard() {
  const [metrics, setMetrics] = useState({
    totalLeads: 0,
    enviadasHoje: 0,
    taxaResposta: 0,
    fechados: 0
  });
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    // Abre onboarding automaticamente no primeiro login se não tiver finalizado
    const onboardingDone = localStorage.getItem('captei-onboarding-done') === 'true';
    if (!onboardingDone) {
      setShowOnboarding(true);
    }

    // Simulando fetch de métricas (na versão final, isso viria de uma rota GET /api/dashboard/metrics)
    setTimeout(() => {
      setMetrics({
        totalLeads: 124,
        enviadasHoje: 45,
        taxaResposta: 12.5,
        fechados: 3
      });
      setLoading(false);
    }, 1000);
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Dashboard</h1>
          <p className="text-zinc-400 mt-2">Visão geral da sua operação de prospecção.</p>
        </div>
        <Button 
          onClick={() => setShowOnboarding(true)} 
          className="bg-[#25D366] hover:bg-[#1DA851] text-zinc-950 font-bold self-start flex items-center gap-2 border-0"
        >
          <Sparkles size={15} className="fill-zinc-950 text-zinc-950" /> Guiar Configuração 🚀
        </Button>
      </div>

      {showOnboarding && (
        <OnboardingWizard onClose={() => setShowOnboarding(false)} />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-[#0A0A0A] border-zinc-800/60 shadow-lg hover:border-zinc-700/80 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Total de Leads</CardTitle>
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Users className="h-4 w-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{loading ? '-' : metrics.totalLeads}</div>
            <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-[#25D366]" /> +12% em relação a ontem
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[#0A0A0A] border-zinc-800/60 shadow-lg hover:border-zinc-700/80 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Mensagens Hoje</CardTitle>
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Send className="h-4 w-4 text-purple-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{loading ? '-' : metrics.enviadasHoje}</div>
            <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-[#25D366]" /> 4 campanhas ativas
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[#0A0A0A] border-zinc-800/60 shadow-lg hover:border-zinc-700/80 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Taxa de Resposta</CardTitle>
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <MessageCircleReply className="h-4 w-4 text-yellow-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{loading ? '-' : `${metrics.taxaResposta}%`}</div>
            <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
              <TrendingDown className="h-3 w-3 text-red-500" /> -2% em relação a ontem
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[#0A0A0A] border-zinc-800/60 shadow-lg hover:border-zinc-700/80 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Leads Fechados</CardTitle>
            <div className="p-2 bg-[#25D366]/10 rounded-lg">
              <CheckCircle2 className="h-4 w-4 text-[#25D366]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{loading ? '-' : metrics.fechados}</div>
            <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1 text-[#25D366]">
              Ótimo desempenho!
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-[#0A0A0A] border-zinc-800/60 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-white">Desempenho de Envios</CardTitle>
            <p className="text-sm text-zinc-400">Envios e respostas ao longo da semana.</p>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mockChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorEnvios" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#25D366" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#25D366" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorRespostas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="name" stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Area type="monotone" dataKey="envios" stroke="#25D366" strokeWidth={2} fillOpacity={1} fill="url(#colorEnvios)" name="Envios" />
                  <Area type="monotone" dataKey="respostas" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorRespostas)" name="Respostas" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#0A0A0A] border-zinc-800/60 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-white">Funil de Conversão</CardTitle>
            <p className="text-sm text-zinc-400">Eficiência de cada etapa da prospecção.</p>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="name" stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px', color: '#fff' }}
                    cursor={{fill: '#27272a'}}
                  />
                  <Bar dataKey="envios" fill="#a855f7" radius={[4, 4, 0, 0]} name="Envios Totais" />
                  <Bar dataKey="respostas" fill="#eab308" radius={[4, 4, 0, 0]} name="Interações" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
