import { memo } from 'react';
import { Handle, Position, type NodeProps, useReactFlow } from '@xyflow/react';
import { Clock, Trash2 } from 'lucide-react';

export interface DelayNodeData extends Record<string, unknown> {
  label: string;
  amount: number;
  unit: 'minutes' | 'hours' | 'days' | 'comercial';
}

export const DelayNode = memo(({ id, data, selected }: NodeProps) => {
  const { setNodes, setEdges } = useReactFlow();

  if (!data) {
    return (
      <div className="p-4 bg-slate-900 border border-red-500 text-red-400 rounded-xl text-[10px] text-center font-bold shadow-xl">
        Erro de carregamento do bloco
      </div>
    );
  }

  const nodeData = data as DelayNodeData;

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((edge) => edge.source !== id && edge.target !== id));
  };

  const amount = nodeData?.amount ?? 1;
  const unit = nodeData?.unit ?? 'hours';

  let displayTime = '';
  if (unit === 'comercial') {
    displayTime = 'Até horário comercial (09:00)';
  } else {
    const unitMap = { minutes: 'minuto(s)', hours: 'hora(s)', days: 'dia(s)' };
    displayTime = `Aguardar por ${amount} ${unitMap[unit as keyof typeof unitMap]}`;
  }

  return (
    <div
      className={`
        min-w-[240px] max-w-[280px] rounded-xl border bg-slate-900 shadow-xl
        transition-all duration-200
        ${selected
          ? 'border-indigo-500 shadow-indigo-900/40 shadow-2xl ring-2 ring-indigo-500/20'
          : 'border-slate-700/70 hover:border-slate-600'
        }
      `}
    >
      {/* Handle entrada */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-slate-600 !border-2 !border-slate-500 hover:!bg-indigo-500 hover:!border-indigo-400 transition-colors"
      />

      {/* Cabeçalho */}
      <div className="flex items-center gap-2.5 rounded-t-xl border-b border-slate-700/60 bg-slate-800/80 px-3.5 py-2.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600/20 border border-indigo-600/30">
          <Clock size={13} className="text-indigo-400" />
        </span>
        <span className="text-xs font-semibold text-slate-200">Aguardar (Delay)</span>
        <button 
          onClick={handleDelete} 
          className="ml-auto text-slate-500 hover:text-red-400 transition-colors flex-shrink-0"
          title="Excluir bloco"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Corpo */}
      <div className="px-3.5 py-3 space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
          Tempo de Espera
        </p>
        <div className="rounded-lg border border-slate-700/60 bg-slate-950/60 px-3 py-2 text-xs text-slate-300 font-medium">
          {displayTime}
        </div>
      </div>

      {/* Handle saída */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="output"
        className="!w-3 !h-3 !bg-slate-600 !border-2 !border-slate-500 hover:!bg-indigo-500 hover:!border-indigo-400 transition-colors"
      />
    </div>
  );
});

DelayNode.displayName = 'DelayNode';
