import { memo } from 'react';
import { Handle, Position, type NodeProps, useReactFlow } from '@xyflow/react';
import { Send, ChevronDown, Trash2 } from 'lucide-react';

// ─── Tipo dos dados internos do nó ───────────────────────────────────────────

export interface SendNodeData extends Record<string, unknown> {
  label: string;
  message: string;
  /** Variáveis detectadas no texto (ex: ["nome_empresa", "cidade"]) */
  variables?: string[];
}

// ─── Regex para detectar e colorir variáveis {{...}} ─────────────────────────

function renderMessageWithVariables(text: string) {
  if (!text) return <span className="text-slate-500 italic">Nenhuma mensagem configurada...</span>;

  const parts = text.split(/({{[^}]+}})/g);
  return parts.map((part, i) => {
    if (/^{{.+}}$/.test(part)) {
      return (
        <span
          key={i}
          className="inline-flex items-center rounded-md bg-emerald-950/70 border border-emerald-700/50 px-1.5 py-0.5 text-[11px] font-mono font-semibold text-emerald-300 mx-0.5"
        >
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

// ─── Componente ───────────────────────────────────────────────────────────────

export const SendNode = memo(({ id, data, selected }: NodeProps) => {
  const { setNodes, setEdges } = useReactFlow();

  if (!data) {
    return (
      <div className="p-4 bg-slate-900 border border-red-500 text-red-400 rounded-xl text-[10px] text-center font-bold shadow-xl">
        Erro de carregamento do bloco
      </div>
    );
  }

  const nodeData = data as SendNodeData;

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((edge) => edge.source !== id && edge.target !== id));
  };

  return (
    <div
      className={`
        min-w-[260px] max-w-[300px] rounded-xl border bg-slate-900 shadow-xl
        transition-all duration-200
        ${selected
          ? 'border-emerald-500 shadow-emerald-900/40 shadow-2xl ring-2 ring-emerald-500/20'
          : 'border-slate-700/70 hover:border-slate-600'
        }
      `}
    >
      {/* ── Handle de entrada (topo) ─────────────────────────────────────── */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-slate-600 !border-2 !border-slate-500 hover:!bg-emerald-500 hover:!border-emerald-400 transition-colors"
      />

      {/* ── Cabeçalho ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2.5 rounded-t-xl border-b border-slate-700/60 bg-slate-800/80 px-3.5 py-2.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600/20 border border-emerald-600/30">
          <Send size={13} className="text-emerald-400" />
        </span>
        <span className="text-xs font-semibold text-slate-200">Mensagem WhatsApp</span>
        <span className="ml-auto rounded-full bg-emerald-600/20 border border-emerald-600/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
          WhatsApp
        </span>
        <button 
          onClick={handleDelete} 
          className="ml-2 text-slate-500 hover:text-red-400 transition-colors flex-shrink-0"
          title="Excluir bloco"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* ── Corpo ────────────────────────────────────────────────────────── */}
      <div className="px-3.5 py-3 space-y-2.5">
        {/* Label do nó */}
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
          Mensagem enviada
        </p>

        {/* Preview da mensagem com variáveis destacadas */}
        <div className="min-h-[56px] rounded-lg border border-slate-700/60 bg-slate-950/60 px-3 py-2.5 text-xs leading-relaxed text-slate-300">
          {renderMessageWithVariables(nodeData?.message || '')}
        </div>

        {/* Variáveis detectadas */}
        {nodeData?.variables && nodeData.variables.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {nodeData.variables.map((v) => (
              <span
                key={v}
                className="inline-flex items-center gap-1 rounded-full bg-slate-800 border border-slate-700 px-2 py-0.5 text-[10px] text-slate-400"
              >
                <ChevronDown size={9} className="text-slate-500" />
                {v}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Handle de saída (base) ───────────────────────────────────────── */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="output"
        className="!w-3 !h-3 !bg-slate-600 !border-2 !border-slate-500 hover:!bg-emerald-500 hover:!border-emerald-400 transition-colors"
      />
    </div>
  );
});

SendNode.displayName = 'SendNode';
