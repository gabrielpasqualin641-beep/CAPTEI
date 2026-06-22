import { Send, Sparkles, GitFork, GripVertical, Clock } from 'lucide-react';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface NodeTemplate {
  type: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  accentClass: string;
  badgeClass: string;
  badgeLabel: string;
  /** Dados iniciais que o nó recebe ao ser arrastado para o canvas */
  defaultData: Record<string, unknown>;
}

// ─── Templates de blocos disponíveis ─────────────────────────────────────────

const NODE_TEMPLATES: NodeTemplate[] = [
  {
    type: 'sendNode',
    label: 'Mensagem WhatsApp',
    description: 'Envia mensagem com variáveis dinâmicas do scraping',
    icon: <Send size={15} className="text-emerald-400" />,
    accentClass: 'border-emerald-700/40 bg-emerald-950/20 hover:border-emerald-600/60 hover:bg-emerald-950/40',
    badgeClass: 'bg-emerald-900/50 text-emerald-400 border border-emerald-700/40',
    badgeLabel: 'WhatsApp',
    defaultData: {
      label: 'Mensagem WhatsApp',
      message: 'Olá {{nome_empresa}}! Vi que vocês atuam em {{cidade}} e gostaria de apresentar uma solução...',
      variables: ['nome_empresa', 'cidade'],
      mediaType: 'text',
      mediaUrl: '',
      buttons: [],
    },
  },
  {
    type: 'aiNode',
    label: 'Assistente de IA',
    description: 'Bot alimentado com dados do Google Places e CNPJ',
    icon: <Sparkles size={15} className="text-violet-400" />,
    accentClass: 'border-violet-700/40 bg-violet-950/20 hover:border-violet-600/60 hover:bg-violet-950/40',
    badgeClass: 'bg-violet-900/50 text-violet-400 border border-violet-700/40',
    badgeLabel: 'IA / Llama',
    defaultData: {
      label: 'Assistente de IA',
      systemPrompt: 'Você é um assistente de vendas especialista em {{nicho}}. Use os dados do lead para personalizar a abordagem.',
      model: 'llama-3',
      dataSources: ['google_places', 'cnpj'],
    },
  },
  {
    type: 'crmFilterNode',
    label: 'Condicional de CRM',
    description: 'Ramifica o fluxo baseado no status do funil',
    icon: <GitFork size={15} className="text-amber-400" />,
    accentClass: 'border-amber-700/40 bg-amber-950/20 hover:border-amber-600/60 hover:bg-amber-950/40',
    badgeClass: 'bg-amber-900/50 text-amber-400 border border-amber-700/40',
    badgeLabel: 'Condição',
    defaultData: {
      label: 'Condicional de CRM',
      condition: 'Lead respondeu à mensagem (webhook Evolution API)',
      trueStatus: 'Respondeu',
    },
  },
  {
    type: 'delayNode',
    label: 'Esperar',
    description: 'Pausa o fluxo por tempo definido ou até horário comercial',
    icon: <Clock size={15} className="text-indigo-400" />,
    accentClass: 'border-indigo-700/40 bg-indigo-950/20 hover:border-indigo-600/60 hover:bg-indigo-950/40',
    badgeClass: 'bg-indigo-900/50 text-indigo-400 border border-indigo-700/40',
    badgeLabel: 'Espera',
    defaultData: {
      label: 'Esperar',
      amount: 1,
      unit: 'hours',
    },
  },
];

// ─── Componente ───────────────────────────────────────────────────────────────

interface NodeSidebarProps {
  /** Callback chamado quando o usuário começa a arrastar um bloco */
  onDragStart: (event: React.DragEvent, nodeType: string, defaultData: Record<string, unknown>) => void;
}

export function NodeSidebar({ onDragStart }: NodeSidebarProps) {
  return (
    <aside className="absolute left-4 top-1/2 z-10 flex -translate-y-1/2 flex-col gap-2 rounded-2xl border border-slate-700/60 bg-slate-900/95 p-3 shadow-2xl backdrop-blur-xl w-[220px]">
      {/* Header */}
      <div className="mb-1 px-1">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
          Blocos do Fluxo
        </p>
        <p className="text-[10px] text-slate-600 mt-0.5">Arraste para o canvas</p>
      </div>

      {/* Lista de blocos arrastáveis */}
      {NODE_TEMPLATES.map((tpl) => (
        <div
          key={tpl.type}
          draggable
          onDragStart={(e) => onDragStart(e, tpl.type, tpl.defaultData)}
          className={`
            group flex cursor-grab items-center gap-2.5 rounded-xl border p-2.5
            active:cursor-grabbing select-none transition-all duration-150
            ${tpl.accentClass}
          `}
          title={`Arrastar: ${tpl.label}`}
        >
          {/* Ícone de arrasto */}
          <GripVertical size={13} className="shrink-0 text-slate-600 group-hover:text-slate-400 transition-colors" />

          {/* Ícone do bloco */}
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-800/80 border border-slate-700/50">
            {tpl.icon}
          </span>

          {/* Textos */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-slate-200">{tpl.label}</p>
            <p className="truncate text-[10px] text-slate-500 leading-tight mt-0.5">
              {tpl.description}
            </p>
          </div>
        </div>
      ))}

      {/* Divisor */}
      <hr className="border-slate-800" />

      {/* Legenda de handles */}
      <div className="space-y-1.5 px-1">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-600">Conexões</p>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-600 border-2 border-slate-500" />
          <span className="text-[10px] text-slate-500">Entrada / Saída simples</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-700 border-2 border-emerald-500" />
          <span className="text-[10px] text-slate-500">Verdadeiro (Condicional)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-800 border-2 border-rose-600" />
          <span className="text-[10px] text-slate-500">Falso (Condicional)</span>
        </div>
      </div>
    </aside>
  );
}
