import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '@/lib/api';
import { AlertTriangle, AlertOctagon, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PlanDetails {
  nome: string;
}

interface UserPlanInfo {
  plano: string;
  limites: PlanDetails;
  usoCota?: {
    total: number;
    limite: number;
    porcentagem: number;
    status: 'normal' | 'alerta' | 'esgotado';
  };
}

export function BannerLimite() {
  const navigate = useNavigate();
  const location = useLocation();
  const [planInfo, setPlanInfo] = useState<UserPlanInfo | null>(null);

  const fetchUsage = async () => {
    try {
      const res = await api.get('/pagamentos/meu-plano');
      setPlanInfo(res.data);
    } catch (e) {
      // Ignorar erros silenciosamente para não quebrar a UX
    }
  };

  useEffect(() => {
    fetchUsage();
    // Poll a cada 30 segundos
    const interval = setInterval(fetchUsage, 30000);
    return () => clearInterval(interval);
  }, [location.pathname]); // Atualiza também ao navegar entre páginas

  if (!planInfo || !planInfo.usoCota) return null;

  const { status, porcentagem, limite } = planInfo.usoCota;

  // Não exibe nada se o status for normal ou se o plano for ilimitado (-1)
  if (status === 'normal' || limite === -1) return null;

  // Não exibe se o usuário já estiver na própria página de planos
  if (location.pathname === '/planos') return null;

  if (status === 'alerta') {
    return (
      <div className="w-full bg-amber-500/10 border border-amber-500/30 text-amber-200 px-6 py-3.5 rounded-xl mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in slide-in-from-top duration-300">
        <div className="flex items-center gap-3 text-sm">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
          <span>
            ⚠️ Atenção: Você já utilizou <strong>{porcentagem}%</strong> dos disparos do seu plano{' '}
            <strong className="capitalize">{planInfo.plano}</strong>. Faça um upgrade para o plano Pro agora para garantir que suas campanhas não sejam interrompidas!
          </span>
        </div>
        <Button
          size="sm"
          onClick={() => navigate('/planos')}
          className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold shrink-0 flex items-center gap-1.5 transition-all duration-200"
        >
          Fazer Upgrade
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  if (status === 'esgotado') {
    return (
      <div className="w-full bg-red-500/10 border border-red-500/30 text-red-200 px-6 py-3.5 rounded-xl mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in slide-in-from-top duration-300">
        <div className="flex items-center gap-3 text-sm">
          <AlertOctagon className="w-5 h-5 text-red-500 shrink-0 animate-bounce" />
          <span>
            🚨 Limite Atingido: Seus disparos mensais acabaram. Suas novas campanhas e envios estão pausados.
          </span>
        </div>
        <Button
          size="sm"
          onClick={() => navigate('/planos')}
          className="bg-red-600 hover:bg-red-700 text-white font-bold shrink-0 flex items-center gap-1.5 transition-all duration-200"
        >
          Migrar para Pro
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return null;
}
export default BannerLimite;
