import { memo } from 'react';
import { Handle, Position, type NodeProps, useReactFlow } from '@xyflow/react';
import { GitFork, CheckCircle2, XCircle, Trash2 } from 'lucide-react';

// ─── Tipo dos dados internos do nó ───────────────────────────────────────────

export type CRMStatus =
  | 'Novo'
  | 'Contatado'
  | 'Respondeu'
  | 'Proposta Enviada'
  | 'Fechado'
  | 'Perdido';

export interface CRMFilterNodeData extends Record<string, unknown> {
  label: string;
  /** Condição avaliada: qual evento ou status do CRM dispara o desvio */
  condition: string;
  /** Status do CRM que representa o caminho "verdadeiro" */
  trueStatus?: CRMStatus;
}

// ─── Mapa de cores por status do CRM ─────────────────────────────────────────

const STATUS_COLORS: Record<CRMStatus, { bg: string; text: string; border: string }> = {
  Novo:              { bg: 'bg-slate-800',    text: 'text-slate-300',  border: 'border-slate-600' },
  Contatado:         { bg: 'bg-blue-950/60',  text: 'text-blue-300',   border: 'border-blue-700/50' },
  Respondeu:         { bg: 'bg-amber-950/60', text: 'text-amber-300',  border: 'border-amber-700/50' },
  'Proposta Enviada':{ bg: 'bg-indigo-950/60',text: 'text-indigo-300', border: 'border-indigo-700/50' },
  Fechado:           { bg: 'bg-emerald-950/60',text: 'text-emerald-300',border: 'border-emerald-700/50' },
  Perdido:           { bg: 'bg-red-950/60',   text: 'text-red-400',    border: 'border-red-700/50' },
};

// ─── Componente ───────────────────────────────────────────────────────────────

export const CRMFilterNode = memo(({ id, data, selected }: NodeProps) => {
  const { setNodes, setEdges } = useReactFlow();

  if (!data) {
    return (
      <div className="p-4 bg-slate-900 border border-red-500 text-red-400 rounded-xl text-[10px] text-center font-bold shadow-xl">
        Erro de carregamento do bloco
      </div>
    );
  }

  const nodeData = data as CRMFilterNodeData;

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((edge) => edge.source !== id && edge.target !== id));
  };
  const trueStatus = nodeData?.trueStatus ?? 'Respondeu';
  const colors = STATUS_COLORS[trueStatus];

  return (
    <div
      className={`
        min-w-[280px] max-w-[320px] rounded-xl border bg-slate-900 shadow-xl
        transition-all duration-200
        ${selected
          ? 'border-amber-500 shadow-amber-900/40 shadow-2xl ring-2 ring-amber-500/20'
          : 'border-slate-700/70 hover:border-slate-600'
        }
      `}
    >
      {/* ── Handle de entrada (topo — único) ─────────────────────────────── */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-slate-600 !border-2 !border-slate-500 hover:!bg-amber-500 hover:!border-amber-400 transition-colors"
      />

      {/* ── Cabeçalho ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2.5 rounded-t-xl border-b border-slate-700/60 bg-slate-800/80 px-3.5 py-2.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-600/20 border border-amber-600/30">
          <GitFork size={13} className="text-amber-400" />
        </span>
        <span className="text-xs font-semibold text-slate-200">Condicional de CRM</span>
        <span className="ml-auto rounded-full bg-amber-600/20 border border-amber-600/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-400">
          Condição
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
      <div className="px-3.5 py-3 space-y-3">
        {/* Condição avaliada */}
        <div>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Condição avaliada
          </p>
          <div className="rounded-lg border border-slate-700/60 bg-slate-950/60 px-3 py-2 text-xs text-slate-300">
            {nodeData?.condition || (
              <span className="italic text-slate-600">Defina a condição de desvio...</span>
            )}
          </div>
        </div>

        {/* Status alvo */}
        <div>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Status alvo no CRM
          </p>
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${colors.bg} ${colors.text} ${colors.border}`}
          >
            {trueStatus}
          </span>
        </div>

        {/* Legenda das saídas */}
        <div className="grid grid-cols-2 gap-2 rounded-lg border border-slate-800/60 bg-slate-950/40 p-2.5">
          {/* Saída True */}
          <div className="flex items-center gap-1.5">
            <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
            <div>
              <p className="text-[10px] font-bold text-emerald-400">Verdadeiro</p>
              <p className="text-[9px] text-slate-500 leading-tight">Condição atendida</p>
            </div>
          </div>
          {/* Saída False */}
          <div className="flex items-center gap-1.5">
            <XCircle size={12} className="text-rose-400 shrink-0" />
            <div>
              <p className="text-[10px] font-bold text-rose-400">Falso</p>
              <p className="text-[9px] text-slate-500 leading-tight">Condição não atendida</p>
            </div>
          </div>
        </div>

        {/* Nota sobre webhook */}
        <p className="text-[10px] leading-relaxed text-slate-600">
          ⚡ Integrado ao webhook da Evolution API — pausa campanhas automaticamente quando o lead responde.
        </p>
      </div>

      {/* ── Handles de saída dupla (base) ────────────────────────────────── */}
      {/*
        Posicionamento: left-[33%] = Verdadeiro | left-[67%] = Falso
        Os IDs são usados pelo React Flow para identificar a origem da aresta.
      */}
      <div className="relative flex items-end justify-between px-4 pb-1.5 pt-0">
        {/* Label Verdadeiro */}
        <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-500">
          Verdadeiro
        </span>
        {/* Label Falso */}
        <span className="text-[9px] font-bold uppercase tracking-wider text-rose-500">
          Falso
        </span>
      </div>

      {/* Handle saída VERDADEIRO — posicionado à esquerda */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="true"
        style={{ left: '33%' }}
        className="!w-3 !h-3 !bg-emerald-700 !border-2 !border-emerald-500 hover:!bg-emerald-500 hover:!border-emerald-300 transition-colors"
      />

      {/* Handle saída FALSO — posicionado à direita */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="false"
        style={{ left: '67%' }}
        className="!w-3 !h-3 !bg-rose-800 !border-2 !border-rose-600 hover:!bg-rose-500 hover:!border-rose-300 transition-colors"
      />
    </div>
  );
});

CRMFilterNode.displayName = 'CRMFilterNode';
