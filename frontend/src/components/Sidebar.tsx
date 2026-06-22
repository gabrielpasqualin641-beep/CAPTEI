import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Search, 
  Users, 
  Megaphone,
  MessageSquare,
  CalendarClock, 
  Settings,
  LogOut,
  Star,
  Workflow,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';

export function Sidebar() {
  const location = useLocation();
  const logout = useAuthStore(state => state.logout);
  const [usage, setUsage] = useState<{ disparos_mes: number; max_disparos: number } | null>(null);

  useEffect(() => {
    const fetchUsage = async () => {
      try {
        const res = await api.get('/pagamentos/meu-plano');
        setUsage({
          disparos_mes: res.data.uso.disparos_mes,
          max_disparos: res.data.limites.disparos_mes
        });
      } catch (e) {
        // Ignorar
      }
    };
    fetchUsage();
    // Poll a cada 30 segundos
    const interval = setInterval(fetchUsage, 30000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { label: 'Dashboard',      path: '/',           icon: LayoutDashboard },
    { label: 'Buscar Leads',   path: '/buscar',     icon: Search },
    { label: 'Leads (CRM)',    path: '/leads',      icon: Users },
    { label: 'Templates',      path: '/templates',  icon: MessageSquare },
    { label: 'Campanhas',      path: '/campanhas',  icon: Megaphone },
    { label: 'Automações',     path: '/automacoes', icon: Workflow },
    { label: 'Agendamentos',   path: '/agendamentos', icon: CalendarClock },
    { label: 'Planos & Preços',path: '/planos',     icon: Star },
    { label: 'Configurações',  path: '/configuracoes', icon: Settings },
  ];

  const hasReachedLimit = usage && usage.max_disparos !== -1 && usage.disparos_mes >= usage.max_disparos;

  return (
    <aside className="w-64 h-screen bg-[#0A0A0A] border-r border-zinc-800/60 flex flex-col fixed left-0 top-0 z-50 shadow-2xl">
      <div className="p-6">
        <div className="flex flex-col">
          <svg viewBox="0 0 120 36" width="120" height="36">
            <text x="0" y="28" fontFamily="Arial Black" fontSize="28" fontWeight="900" fill="#ffffff">Capt</text>
            <text x="67" y="28" fontFamily="Arial Black" fontSize="28" fontWeight="900" fill="#25D366">ei</text>
          </svg>
          <span className="text-[11px] text-zinc-500 font-medium tracking-wider uppercase mt-1">Prospecção Inteligente</span>
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-1.5 mt-2 overflow-y-auto">
        {navItems.map(item => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                isActive 
                  ? "bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/20 shadow-sm" 
                  : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100 border border-transparent"
              )}
            >
              <div className="flex items-center gap-3">
                <item.icon size={18} className={isActive ? "text-[#25D366]" : "text-zinc-500"} />
                {item.label}
              </div>
              
              {/* Renderiza badge de consumo no link de Planos */}
              {item.path === '/planos' && usage && (
                <span className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-full font-bold",
                  hasReachedLimit 
                    ? "bg-red-900/40 text-red-400 border border-red-800 animate-pulse" 
                    : "bg-zinc-800 text-zinc-300 border border-zinc-700"
                )}>
                  {hasReachedLimit ? 'Limite atingido' : `${usage.disparos_mes}/${usage.max_disparos === -1 ? '∞' : usage.max_disparos}`}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Uso Rápido abaixo do menu */}
      {usage && (
        <div className="mx-4 mb-4 p-4 rounded-xl bg-zinc-950 border border-zinc-900 flex flex-col gap-2">
          <div className="flex items-center justify-between text-[11px] font-bold">
            <span className="text-zinc-500 uppercase">Mensagens no Mês</span>
            <span className={hasReachedLimit ? 'text-red-400' : 'text-zinc-300'}>
              {usage.disparos_mes} / {usage.max_disparos === -1 ? 'Sem Limite' : usage.max_disparos}
            </span>
          </div>
          <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden">
            <div 
              className={cn(
                "h-full rounded-full transition-all duration-500",
                hasReachedLimit ? "bg-red-500" : "bg-emerald-500"
              )}
              style={{ width: `${usage.max_disparos === -1 ? 0 : Math.min((usage.disparos_mes / usage.max_disparos) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}

      <div className="p-4 border-t border-zinc-800/60 bg-[#0A0A0A]/50 backdrop-blur-sm">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-zinc-400 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20 border border-transparent transition-all duration-200"
        >
          <LogOut size={18} />
          Sair do Sistema
        </button>
      </div>
    </aside>
  );
}
