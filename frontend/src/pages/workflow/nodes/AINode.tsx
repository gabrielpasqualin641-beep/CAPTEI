import { memo } from 'react';
import { Handle, Position, type NodeProps, useReactFlow } from '@xyflow/react';
import { Sparkles, Database, Cpu, Trash2 } from 'lucide-react';

// ─── Tipo dos dados internos do nó ───────────────────────────────────────────

export interface AINodeData extends Record<string, unknown> {
  label: string;
  /** Prompt / instruções de contexto do assistente */
  systemPrompt: string;
  /** Modelo configurado (ex: 'llama-3', 'gpt-4o') */
  model?: string;
  /** Quais fontes de dados o bot usa */
  dataSources?: Array<'google_places' | 'cnpj' | 'ecommerce'>;
}

// ─── Labels das fontes de dados ──────────────────────────────────────────────

const DATA_SOURCE_LABELS: Record<NonNullable<AINodeData['dataSources']>[number], string> = {
  google_places: 'Google Places',
  cnpj: 'CNPJ / Receita Federal',
  ecommerce: 'Scraping E-commerce',
};

// ─── Componente ───────────────────────────────────────────────────────────────

export const AINode = memo(({ id, data, selected }: NodeProps) => {
  const { setNodes, setEdges } = useReactFlow();

  if (!data) {
    return (
      <div className="p-4 bg-slate-900 border border-red-500 text-red-400 rounded-xl text-[10px] text-center font-bold shadow-xl">
        Erro de carregamento do bloco
      </div>
    );
  }

  const nodeData = data as AINodeData;

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((edge) => edge.source !== id && edge.target !== id));
  };
  const sources = nodeData?.dataSources ?? ['google_places'];
  const model = nodeData?.model ?? 'llama-3';

  return (
    <div
      className={`
        min-w-[280px] max-w-[320px] rounded-xl border bg-slate-900 shadow-xl
        transition-all duration-200
        ${selected
          ? 'border-violet-500 shadow-violet-900/40 shadow-2xl ring-2 ring-violet-500/20'
          : 'border-slate-700/70 hover:border-slate-600'
        }
      `}
    >
      {/* ── Handle de entrada (topo) ─────────────────────────────────────── */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-slate-600 !border-2 !border-slate-500 hover:!bg-violet-500 hover:!border-violet-400 transition-colors"
      />

      {/* ── Cabeçalho com gradiente ───────────────────────────────────────── */}
      <div className="relative flex items-center gap-2.5 overflow-hidden rounded-t-xl border-b border-slate-700/60 px-3.5 py-2.5">
        {/* Gradiente de fundo */}
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-20"
          style={{
            background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 50%, #0ea5e9 100%)',
          }}
        />

        <span className="relative flex h-7 w-7 items-center justify-center rounded-lg bg-violet-600/30 border border-violet-500/40">
          <Sparkles size={13} className="text-violet-300" />
        </span>
        <span className="relative text-xs font-semibold text-slate-200">Assistente de IA</span>

        {/* Badge modelo */}
        <span className="relative ml-auto flex items-center gap-1 rounded-full bg-violet-950/80 border border-violet-700/50 px-2 py-0.5 text-[10px] font-bold text-violet-300">
          <Cpu size={9} />
          {model}
        </span>
        <button 
          onClick={handleDelete} 
          className="relative ml-2 text-slate-500 hover:text-red-400 transition-colors flex-shrink-0 z-10"
          title="Excluir bloco"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* ── Corpo ────────────────────────────────────────────────────────── */}
      <div className="px-3.5 py-3 space-y-3">
        {/* Instruções de contexto */}
        <div>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Contexto do assistente
          </p>
          <div className="min-h-[52px] rounded-lg border border-slate-700/60 bg-slate-950/60 px-3 py-2.5 text-xs leading-relaxed text-slate-400">
            {nodeData?.systemPrompt || (
              <span className="italic text-slate-600">Defina as instruções do bot...</span>
            )}
          </div>
        </div>

        {/* Badge de fontes de dados integradas */}
        <div className="rounded-lg border border-indigo-800/40 bg-indigo-950/30 px-3 py-2.5">
          <div className="mb-2 flex items-center gap-1.5">
            <Database size={10} className="text-indigo-400" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">
              Dados Integrados (Scraping)
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            {sources.map((src) => (
              <span
                key={src}
                className="rounded-full border border-indigo-700/40 bg-indigo-900/40 px-2 py-0.5 text-[10px] font-medium text-indigo-300"
              >
                {DATA_SOURCE_LABELS[src]}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Handle de saída (base) ───────────────────────────────────────── */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="output"
        className="!w-3 !h-3 !bg-slate-600 !border-2 !border-slate-500 hover:!bg-violet-500 hover:!border-violet-400 transition-colors"
      />
    </div>
  );
});

AINode.displayName = 'AINode';
