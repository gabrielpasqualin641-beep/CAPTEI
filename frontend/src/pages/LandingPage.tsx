import { useState, useId } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  MapPin,
  MessageCircle,
  BarChart3,
  Zap,
  Shield,
  Sparkles,
  Crown,
  ArrowRight,
  Bot,
  Target,
  Users,
  Star,
  ChevronRight,
  Loader2,
  // ── Ícones de features dos planos
  Send,
  Smartphone,
  LayoutTemplate,
  History,
  ShoppingBag,
  Building2,
  Headphones,
  Compass,
  Lock,
  type LucideProps,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useUIStore } from '@/store/authStore';

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface RegisterPayload {
  nome: string;
  email: string;
  senha: string;
}

/** Ícone contextual por funcionalidade + disponibilidade por plano */
interface PlanFeature {
  /** Texto descritivo do recurso */
  text: string;
  /** Componente Lucide que representa semanticamente a funcionalidade */
  icon: React.ForwardRefExoticComponent<LucideProps & React.RefAttributes<SVGSVGElement>>;
  /** Se o recurso está disponível neste plano */
  available: boolean;
}

interface PlanCard {
  key: string;
  label: string;
  tagline: string;
  price: string;
  priceNote: string;
  badge?: string;
  badgeColor?: string;
  /** Cor Tailwind para ícones de features ativas deste plano (ex: 'text-emerald-400') */
  accentColor: string;
  icon: React.ReactNode;
  cta: string;
  features: PlanFeature[];
  highlight: boolean;
}

// ─── Dados dos Planos ─────────────────────────────────────────────────────────

// Features reutilizáveis — definidas uma única vez, compartilhadas entre planos
const F = {
  disparos:   (text: string): Omit<PlanFeature, 'available'> => ({ text, icon: Send }),
  instancia:  (text: string): Omit<PlanFeature, 'available'> => ({ text, icon: Smartphone }),
  leads:      (text: string): Omit<PlanFeature, 'available'> => ({ text, icon: Users }),
  buscas:     (text: string): Omit<PlanFeature, 'available'> => ({ text, icon: Compass }),
  templates:  (text: string): Omit<PlanFeature, 'available'> => ({ text, icon: LayoutTemplate }),
  followup:   (text: string): Omit<PlanFeature, 'available'> => ({ text, icon: History }),
  ecommerce:  (text: string): Omit<PlanFeature, 'available'> => ({ text, icon: ShoppingBag }),
  cnpj:       (text: string): Omit<PlanFeature, 'available'> => ({ text, icon: Building2 }),
  suporte:    (text: string): Omit<PlanFeature, 'available'> => ({ text, icon: Headphones }),
} satisfies Record<string, (t: string) => Omit<PlanFeature, 'available'>>;

const PLANS: PlanCard[] = [
  {
    key: 'free',
    label: 'Free',
    tagline: 'Para quem está começando',
    price: 'Grátis',
    priceNote: 'Para sempre',
    accentColor: 'text-zinc-400',
    icon: <Shield className="w-5 h-5 text-zinc-400" />,
    cta: 'Começar Grátis',
    highlight: false,
    features: [
      { ...F.disparos('100 disparos por mês'),      available: true },
      { ...F.instancia('1 instância WhatsApp'),      available: true },
      { ...F.leads('Até 200 leads no CRM'),          available: true },
      { ...F.buscas('3 buscas locais por dia'),      available: true },
      { ...F.templates('2 templates de mensagem'),   available: true },
      { ...F.followup('Mensagens de follow-up'),     available: false },
      { ...F.ecommerce('Busca em e-commerces'),      available: false },
      { ...F.cnpj('Enriquecimento de CNPJ'),         available: false },
    ],
  },
  {
    key: 'starter',
    label: 'Starter',
    tagline: 'Para profissionais autônomos',
    price: 'R$ 49',
    priceNote: '/mês',
    accentColor: 'text-emerald-400',
    icon: <Zap className="w-5 h-5 text-emerald-400" />,
    cta: 'Assinar Starter',
    highlight: false,
    features: [
      { ...F.disparos('1.000 disparos por mês'),     available: true },
      { ...F.instancia('1 instância WhatsApp'),      available: true },
      { ...F.leads('Até 2.000 leads no CRM'),        available: true },
      { ...F.buscas('20 buscas locais por dia'),     available: true },
      { ...F.templates('10 templates de mensagem'),  available: true },
      { ...F.followup('Mensagens de follow-up'),     available: true },
      { ...F.ecommerce('Busca em e-commerces'),      available: false },
      { ...F.cnpj('Enriquecimento de CNPJ'),         available: false },
    ],
  },
  {
    key: 'pro',
    label: 'Pro',
    tagline: 'O mais completo e popular',
    price: 'R$ 129',
    priceNote: '/mês',
    badge: '⭐ Mais Popular',
    badgeColor: 'bg-indigo-600',
    accentColor: 'text-indigo-400',
    icon: <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />,
    cta: 'Assinar Pro',
    highlight: true,
    features: [
      { ...F.disparos('5.000 disparos por mês'),     available: true },
      { ...F.instancia('3 instâncias WhatsApp'),     available: true },
      { ...F.leads('Até 10.000 leads no CRM'),       available: true },
      { ...F.buscas('100 buscas locais por dia'),    available: true },
      { ...F.templates('Templates ilimitados'),      available: true },
      { ...F.followup('Mensagens de follow-up'),     available: true },
      { ...F.ecommerce('Busca em e-commerces'),      available: true },
      { ...F.cnpj('Enriquecimento de CNPJ'),         available: true },
    ],
  },
  {
    key: 'enterprise',
    label: 'Enterprise',
    tagline: 'Para grandes agências',
    price: 'R$ 299',
    priceNote: '/mês',
    accentColor: 'text-amber-400',
    icon: <Crown className="w-5 h-5 text-amber-400" />,
    cta: 'Falar com Vendas',
    highlight: false,
    features: [
      { ...F.disparos('20.000 disparos por mês'),    available: true },
      { ...F.instancia('10 instâncias WhatsApp'),    available: true },
      { ...F.leads('Leads ilimitados'),              available: true },
      { ...F.buscas('Buscas diárias ilimitadas'),    available: true },
      { ...F.templates('Templates ilimitados'),      available: true },
      { ...F.followup('Mensagens de follow-up'),     available: true },
      { ...F.ecommerce('Busca em e-commerces'),      available: true },
      { ...F.suporte('Suporte dedicado 24/7'),       available: true },
    ],
  },
];

// ─── Sub-componentes ──────────────────────────────────────────────────────────

/** Logotipo SVG inline em vez de img tag para zero-dependency */
function CapteiLogo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: [90, 27], md: [120, 36], lg: [160, 48] };
  const [w, h] = sizes[size];
  const fontSize = size === 'sm' ? 19 : size === 'md' ? 26 : 35;
  return (
    <svg viewBox="0 0 120 36" width={w} height={h} aria-label="Captei">
      <text x="0" y="28" fontFamily="Arial Black, Arial" fontSize={fontSize} fontWeight="900" fill="#ffffff">Capt</text>
      <text x="67" y="28" fontFamily="Arial Black, Arial" fontSize={fontSize} fontWeight="900" fill="#25D366">ei</text>
    </svg>
  );
}

/** Card de feature da seção de recursos */
function FeatureCard({
  icon,
  title,
  description,
  accent,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  accent: string;
}) {
  return (
    <div className={`relative rounded-2xl border border-zinc-800/80 bg-zinc-950 p-6 flex flex-col gap-4 hover:border-zinc-700 transition-all duration-300 hover:-translate-y-1 group overflow-hidden`}>
      {/* Glow de fundo no hover */}
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${accent} blur-2xl -z-10`} />
      <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-zinc-900 border border-zinc-800">
        {icon}
      </span>
      <h3 className="text-lg font-bold text-white">{title}</h3>
      <p className="text-sm text-zinc-400 leading-relaxed">{description}</p>
    </div>
  );
}

/** Card de plano — Premium SaaS com ícones contextuais e psicologia de upgrade */
function PlanCardComponent({
  plan,
  onCtaClick,
}: {
  plan: PlanCard;
  onCtaClick: (key: string) => void;
}) {
  return (
    <div
      className={`relative flex flex-col rounded-2xl border overflow-hidden transition-all duration-300 hover:-translate-y-1 ${
        plan.highlight
          ? 'border-indigo-500 shadow-2xl shadow-indigo-950/30'
          : 'border-zinc-800/80 hover:border-zinc-700'
      } bg-zinc-950`}
    >
      {/* Badge popular */}
      {plan.badge && (
        <div
          className={`${plan.badgeColor} py-1.5 text-center text-xs font-bold text-white uppercase tracking-widest`}
        >
          {plan.badge}
        </div>
      )}

      <div className="p-6 flex flex-col flex-grow gap-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <span className="p-2 rounded-lg bg-zinc-900 border border-zinc-800">
            {plan.icon}
          </span>
          <div>
            <p className="text-xs text-zinc-500 font-medium">{plan.tagline}</p>
            <h3 className="text-lg font-bold text-white capitalize">{plan.label}</h3>
          </div>
        </div>

        {/* Preço */}
        <div>
          <span className="text-3xl font-extrabold text-white">{plan.price}</span>
          <span className="text-zinc-500 text-sm ml-1">{plan.priceNote}</span>
        </div>

        {/* CTA */}
        <button
          id={`cta-plan-${plan.key}`}
          onClick={() => onCtaClick(plan.key)}
          className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${
            plan.highlight
              ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/40'
              : plan.key === 'free'
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
              : 'bg-zinc-800 hover:bg-zinc-700 text-white'
          }`}
        >
          {plan.cta}
        </button>

        {/* Divider */}
        <hr className="border-zinc-800" />

        {/* ── Lista de Features — Premium UX ────────────────────────────── */}
        <ul className="flex flex-col gap-2.5" role="list" aria-label={`Recursos do plano ${plan.label}`}>
          {plan.features.map((feat) => {
            const FeatureIcon = feat.icon;
            return (
              <li
                key={feat.text}
                className={`flex items-center gap-2.5 text-xs transition-opacity ${
                  feat.available
                    ? 'opacity-100'
                    : 'opacity-35'
                }`}
              >
                {/* Ícone contextual ou cadeado */}
                <span
                  className={`shrink-0 ${
                    feat.available
                      ? plan.accentColor
                      : 'text-slate-600'
                  }`}
                  aria-hidden="true"
                >
                  {feat.available ? (
                    <FeatureIcon size={14} strokeWidth={2} />
                  ) : (
                    <Lock size={14} strokeWidth={2} />
                  )}
                </span>

                {/* Texto limpo — sem risco, sem poluição visual */}
                <span
                  className={`leading-snug ${
                    feat.available ? 'text-zinc-300' : 'text-slate-500'
                  }`}
                >
                  {feat.text}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

/** Formulário de cadastro */
function RegisterForm() {
  const formId = useId();
  const navigate = useNavigate();
  const setJustRegistered = useUIStore((state) => state.setJustRegistered);

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (senha.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    setLoading(true);
    setError(null);

    const payload: RegisterPayload = { nome, email, senha };

    try {
      await api.post('/auth/register', payload);
      // Sinaliza globalmente que o cadastro foi concluído
      setJustRegistered(true);
      // Redireciona para o login imediatamente
      navigate('/login', { replace: true });
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
            'Erro ao criar sua conta. Tente novamente.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      id="cadastro"
      onSubmit={handleSubmit}
      aria-label="Formulário de cadastro"
      className="flex flex-col gap-4"
    >
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-400"
        >
          {error}
        </div>
      )}

      {/* Nome */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${formId}-nome`} className="text-sm font-medium text-zinc-300">
          Seu nome
        </label>
        <input
          id={`${formId}-nome`}
          type="text"
          autoComplete="name"
          required
          placeholder="João Silva"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
        />
      </div>

      {/* E-mail */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${formId}-email`} className="text-sm font-medium text-zinc-300">
          E-mail profissional
        </label>
        <input
          id={`${formId}-email`}
          type="email"
          autoComplete="email"
          required
          placeholder="nome@empresa.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
        />
      </div>

      {/* Senha */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${formId}-senha`} className="text-sm font-medium text-zinc-300">
          Senha
        </label>
        <input
          id={`${formId}-senha`}
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          placeholder="Mínimo 6 caracteres"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
        />
      </div>

      <button
        id="btn-criar-conta"
        type="submit"
        disabled={loading}
        className="mt-1 flex items-center justify-center gap-2 rounded-lg bg-emerald-600 py-3 text-sm font-bold text-white transition-all duration-300 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-emerald-900/40"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Criando sua conta...
          </>
        ) : (
          <>
            Criar Conta Grátis
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>

      <p className="text-center text-xs text-zinc-500">
        Ao cadastrar, você concorda com nossos{' '}
        <span className="text-zinc-400 underline underline-offset-2 cursor-pointer hover:text-zinc-200 transition-colors">
          Termos de Uso
        </span>
        . Sem cartão de crédito.
      </p>
    </form>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────

export function LandingPage() {
  const navigate = useNavigate();

  const handlePlanCta = (key: string) => {
    if (key === 'enterprise') {
      // Abre WhatsApp de suporte
      window.open('https://wa.me/5511999999999?text=Olá!%20Tenho%20interesse%20no%20plano%20Enterprise%20do%20Captei.', '_blank');
    } else {
      // Leva para o formulário de cadastro
      document.getElementById('cadastro')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const scrollToCadastro = () => {
    document.getElementById('cadastro')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 antialiased font-sans selection:bg-emerald-500/30">

      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <CapteiLogo size="md" />

          <div className="hidden md:flex items-center gap-8 text-sm text-zinc-400">
            <a href="#recursos" className="hover:text-zinc-100 transition-colors">Recursos</a>
            <a href="#planos" className="hover:text-zinc-100 transition-colors">Planos</a>
            <a href="#cadastro" className="hover:text-zinc-100 transition-colors">Começar</a>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              Entrar
            </Link>
            <button
              onClick={scrollToCadastro}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 transition-all duration-300 shadow-lg shadow-emerald-900/40"
            >
              Começar Grátis
            </button>
          </div>
        </nav>
      </header>

      {/* ── Hero Section ───────────────────────────────────────────────────── */}
      <section
        aria-labelledby="hero-headline"
        className="relative overflow-hidden px-6 pb-20 pt-24 md:pt-32"
      >
        {/* Gradiente radial de fundo */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(37,211,102,0.13) 0%, transparent 70%)',
          }}
        />
        {/* Grid decorativo */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        <div className="relative mx-auto max-w-4xl text-center">
          {/* Pill badge */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-emerald-800/60 bg-emerald-950/50 px-4 py-1.5 text-xs font-semibold text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            Automatize sua prospecção no WhatsApp
          </div>

          <h1
            id="hero-headline"
            className="mb-6 text-4xl font-extrabold leading-tight tracking-tight text-white md:text-6xl"
          >
            Encontre clientes no{' '}
            <span className="bg-gradient-to-r from-emerald-400 to-emerald-300 bg-clip-text text-transparent">
              Google Maps
            </span>{' '}
            e feche negócios pelo{' '}
            <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
              WhatsApp
            </span>
            , no piloto automático.
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-zinc-400">
            O <strong className="text-zinc-200">Captei</strong> extrai contatos de negócios do Google Maps, organiza seu CRM em funil e dispara mensagens personalizadas com cadência inteligente — tudo em uma única plataforma.
          </p>

          {/* CTAs */}
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <button
              id="hero-cta-primary"
              onClick={scrollToCadastro}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-7 py-3.5 text-base font-bold text-white transition-all duration-300 hover:bg-emerald-500 hover:shadow-xl hover:shadow-emerald-900/40 hover:-translate-y-0.5"
            >
              Criar Conta Grátis
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              id="hero-cta-secondary"
              onClick={() => navigate('/login')}
              className="flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/50 px-7 py-3.5 text-base font-semibold text-zinc-300 transition-all duration-300 hover:border-zinc-600 hover:bg-zinc-800/60 hover:text-white"
            >
              Já tenho conta
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Social proof micro */}
          <div className="mt-10 flex items-center justify-center gap-1.5 text-sm text-zinc-500">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
            ))}
            <span className="ml-2">
              <strong className="text-zinc-300">+2.400</strong> agências e autônomos já prospectam com o Captei
            </span>
          </div>
        </div>
      </section>

      {/* ── Métricas ───────────────────────────────────────────────────────── */}
      <section aria-label="Métricas de impacto" className="border-y border-zinc-800/60 bg-zinc-900/30">
        <div className="mx-auto grid max-w-5xl grid-cols-2 divide-x divide-zinc-800/60 md:grid-cols-4">
          {[
            { value: '+2.400', label: 'Usuários ativos' },
            { value: '+4M', label: 'Leads prospectados' },
            { value: '+12M', label: 'Mensagens disparadas' },
            { value: '98%', label: 'Uptime garantido' },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col items-center gap-1 px-6 py-8">
              <span className="text-2xl font-extrabold text-emerald-400 md:text-3xl">{stat.value}</span>
              <span className="text-xs text-zinc-500">{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Recursos ───────────────────────────────────────────────────────── */}
      <section
        id="recursos"
        aria-labelledby="recursos-title"
        className="relative mx-auto max-w-7xl px-6 py-24"
      >
        <div className="mb-14 text-center">
          <h2 id="recursos-title" className="text-3xl font-extrabold text-white md:text-4xl">
            Tudo que você precisa para{' '}
            <span className="text-emerald-400">prospectar e fechar</span>
          </h2>
          <p className="mt-4 text-zinc-400">
            Três módulos poderosos que trabalham juntos para você.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <FeatureCard
            icon={<MapPin className="w-5 h-5 text-emerald-400" />}
            title="Busca Inteligente no Google Maps"
            description="Informe um nicho e uma cidade — o Captei varre o Google Maps e extrai nome, telefone, endereço, avaliação e site de dezenas de negócios automaticamente. Também importa lojas de plataformas de e-commerce."
            accent="bg-emerald-500/5"
          />
          <FeatureCard
            icon={<BarChart3 className="w-5 h-5 text-indigo-400" />}
            title="CRM em Funil Visual"
            description="Organize cada lead em etapas: Novo → Contatado → Respondeu → Proposta Enviada → Fechado. Filtre por nicho, status ou qualidade e mantenha seu pipeline sempre atualizado."
            accent="bg-indigo-500/5"
          />
          <FeatureCard
            icon={<MessageCircle className="w-5 h-5 text-teal-400" />}
            title="Motor de Cadência para WhatsApp"
            description="Crie campanhas com janelas de horário, dias da semana e delays randômicos para máxima entregabilidade. Disparos via Evolution API. Se o lead responder, o envio pausa automaticamente via webhook."
            accent="bg-teal-500/5"
          />
        </div>

        {/* Features secundárias */}
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <FeatureCard
            icon={<Bot className="w-5 h-5 text-violet-400" />}
            title="Templates com Variáveis Dinâmicas"
            description="Crie scripts de mensagem com {{nome}}, {{cidade}}, {{nicho}} e deixe cada disparo parecer personalizado, mesmo em escala."
            accent="bg-violet-500/5"
          />
          <FeatureCard
            icon={<Target className="w-5 h-5 text-rose-400" />}
            title="Enriquecimento de CNPJ"
            description="Cruze os leads com dados da Receita Federal para descobrir CNPJ, data de abertura, porte e segmento — qualificando sua lista antes de prospectar."
            accent="bg-rose-500/5"
          />
          <FeatureCard
            icon={<Users className="w-5 h-5 text-amber-400" />}
            title="Multi-instância & Multi-usuário"
            description="Conecte múltiplos números de WhatsApp e adicione membros da equipe com papéis distintos (Admin, Operador, Visualizador)."
            accent="bg-amber-500/5"
          />
        </div>
      </section>

      {/* ── Planos ─────────────────────────────────────────────────────────── */}
      <section
        id="planos"
        aria-labelledby="planos-title"
        className="bg-zinc-900/30 px-6 py-24"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mb-14 text-center">
            <h2 id="planos-title" className="text-3xl font-extrabold text-white md:text-4xl">
              Planos para cada etapa do seu negócio
            </h2>
            <p className="mt-4 text-zinc-400">
              Comece grátis e escale conforme sua operação crescer. Sem surpresas.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {PLANS.map((plan) => (
              <PlanCardComponent
                key={plan.key}
                plan={plan}
                onCtaClick={handlePlanCta}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── Formulário de Cadastro ─────────────────────────────────────────── */}
      <section
        id="cadastro"
        aria-labelledby="cadastro-title"
        className="relative overflow-hidden px-6 py-24"
      >
        {/* Glow de fundo */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 60% 50% at 50% 100%, rgba(37,211,102,0.10) 0%, transparent 70%)',
          }}
        />

        <div className="relative mx-auto max-w-md">
          {/* Card de cadastro */}
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950 p-8 shadow-2xl">
            <div className="mb-8 text-center">
              <CapteiLogo size="md" />
              <h2 id="cadastro-title" className="mt-4 text-2xl font-extrabold text-white">
                Comece agora, é grátis
              </h2>
              <p className="mt-2 text-sm text-zinc-400">
                Crie sua conta em segundos e comece a prospectar hoje.
              </p>
            </div>

            <RegisterForm />

            <p className="mt-6 text-center text-sm text-zinc-500">
              Já tem uma conta?{' '}
              <Link
                to="/login"
                className="text-emerald-400 font-semibold hover:text-emerald-300 transition-colors"
              >
                Fazer login
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="border-t border-zinc-800/60 px-6 py-10 text-center">
        <CapteiLogo size="sm" />
        <p className="mt-3 text-xs text-zinc-600">
          © {new Date().getFullYear()} Captei. Prospecção Inteligente.
        </p>
      </footer>
    </div>
  );
}
