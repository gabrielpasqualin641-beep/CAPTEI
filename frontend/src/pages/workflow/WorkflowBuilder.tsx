import { useCallback, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  type Connection,
  type Edge,
  type Node,
  type NodeTypes,
  type OnConnect,
  type ReactFlowInstance,
} from '@xyflow/react';

// ── Importação OBRIGATÓRIA do CSS base do React Flow ─────────────────────────
import '@xyflow/react/dist/style.css';

import { NodeSidebar } from './NodeSidebar';
import { SendNode } from './nodes/SendNode';
import { AINode } from './nodes/AINode';
import { CRMFilterNode } from './nodes/CRMFilterNode';
import { DelayNode } from './nodes/DelayNode';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Save, Play, Zap, MessageSquareCode, Sparkles, Trash2 } from 'lucide-react';

const NODE_TYPES: NodeTypes = {
  sendNode: SendNode,
  aiNode: AINode,
  crmFilterNode: CRMFilterNode,
  delayNode: DelayNode,
};

// ─── Tipos do JSON exportado para a API ──────────────────────────────────────

export interface WorkflowJSON {
  /** ID único do workflow (gerado pelo frontend, persistido no backend) */
  id: string;
  name: string;
  /** ISO timestamp da última modificação */
  updatedAt: string;
  nodes: Array<{
    id: string;
    type: string;
    position: { x: number; y: number };
    data: Record<string, unknown>;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    sourceHandle?: string | null;
    targetHandle?: string | null;
    label?: string;
  }>;
}

// ─── Componente Principal ─────────────────────────────────────────────────────

interface WorkflowBuilderProps {
  workflowId?: string;
  workflowName?: string;
}

export function WorkflowBuilder({
  workflowId = 'wf-draft-001',
  workflowName = 'Novo Workflow',
}: WorkflowBuilderProps) {
  // Inicializa com um nó padrão caso esteja vazio
  const defaultNodes: Node[] = [
    {
      id: 'start-node',
      type: 'default',
      position: { x: 250, y: 250 },
      data: { label: 'Início do Fluxo', message: '', systemPrompt: '', condition: '' },
      style: { backgroundColor: '#10b981', color: '#fff', border: 'none', fontWeight: 'bold' }
    }
  ];

  const [nodes, setNodes, onNodesChange] = useNodesState(defaultNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // ── Conectar dois nós ───────────────────────────────────────────────────────
  const onConnect: OnConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            animated: true,
            style: { stroke: '#475569', strokeWidth: 1.5 },
          } as Edge | Connection,
          eds
        ) as Edge[]
      ),
    [setEdges]
  );

  // ── Drag & Drop: início do arrasto a partir da Sidebar ──────────────────────
  const onDragStart = useCallback(
    (event: React.DragEvent, nodeType: string, defaultData: Record<string, unknown>) => {
      event.dataTransfer.setData('application/reactflow-type', nodeType);
      event.dataTransfer.setData('application/reactflow-data', JSON.stringify(defaultData));
      event.dataTransfer.effectAllowed = 'move';
    },
    []
  );

  // ── Drag & Drop: soltar no canvas ───────────────────────────────────────────
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const nodeType = event.dataTransfer.getData('application/reactflow-type');
      const rawData = event.dataTransfer.getData('application/reactflow-data');

      if (!nodeType || !rfInstance || !reactFlowWrapper.current) return;

      let data: Record<string, unknown> = rawData ? JSON.parse(rawData) : {};

      // Inicialização Segura: Garante que o objeto data possua todas as chaves esperadas para evitar crashes no painel
      if (nodeType === 'sendNode') {
        data = { message: '', variables: [], mediaType: 'text', mediaUrl: '', buttons: [], ...data };
      } else if (nodeType === 'aiNode') {
        data = { systemPrompt: '', model: 'llama-3', dataSources: ['google_places'], ...data };
      } else if (nodeType === 'crmFilterNode') {
        data = { condition: '', trueStatus: 'Respondeu', ...data };
      } else if (nodeType === 'delayNode') {
        data = { amount: 1, unit: 'hours', ...data };
      }

      // Converte coordenadas de tela para coordenadas do canvas React Flow
      const wrapperBounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = rfInstance.screenToFlowPosition({
        x: event.clientX - wrapperBounds.left,
        y: event.clientY - wrapperBounds.top,
      });

      const newNode: Node = {
        id: `${nodeType}-${Date.now()}`,
        type: nodeType,
        position,
        data,
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [rfInstance, setNodes]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // ── Salvar e exportar o workflow como JSON ──────────────────────────────────
  const handleSaveWorkflow = useCallback(async () => {
    if (!rfInstance) return;

    setIsSaving(true);

    // Captura o estado atual (inclui posições e dados de cada nó)
    const flowObject = rfInstance.toObject();

    const payload: WorkflowJSON = {
      id: workflowId,
      name: workflowName,
      updatedAt: new Date().toISOString(),
      nodes: flowObject.nodes.map((n) => ({
        id: n.id,
        type: n.type ?? 'default',
        position: n.position,
        data: n.data as Record<string, unknown>,
      })),
      edges: flowObject.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
        label: typeof e.label === 'string' ? e.label : undefined,
      })),
    };

    // ── LOG para debugging / integração com o backend ─────────────────────────
    console.group('💾 [WorkflowBuilder] handleSaveWorkflow — JSON para a API');
    console.log('Payload completo:', JSON.stringify(payload, null, 2));
    console.log('Total de nós:', payload.nodes.length);
    console.log('Total de conexões:', payload.edges.length);
    console.groupEnd();

    // ── Envio para o backend (descomentar quando a rota existir) ──────────────
    // try {
    //   await api.post(`/workflows/${workflowId}`, payload);
    // } catch (err) {
    //   console.error('Erro ao salvar workflow:', err);
    // }

    // Simula latência de rede
    await new Promise((r) => setTimeout(r, 600));

    setLastSaved(new Date().toLocaleTimeString('pt-BR'));
    setIsSaving(false);
  }, [rfInstance, workflowId, workflowName]);

  // ── Atualizar os dados do nó selecionado ────────────────────────────────────
  const updateNodeData = (key: string, value: any) => {
    if (!selectedNode) return;
    
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === selectedNode.id) {
          const updatedNode = { ...n, data: { ...n.data, [key]: value } };
          setSelectedNode(updatedNode); // Mantém a UI do painel sincronizada
          return updatedNode;
        }
        return n;
      })
    );
  };

  // ── Inject Tag na mensagem (para SendNode) ──────────────────────────────────
  const injectVariable = (tag: string) => {
    if (selectedNode?.type === 'sendNode') {
      const currentMessage = String(selectedNode?.data?.message || '');
      updateNodeData('message', currentMessage + `{{${tag}}} `);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="relative flex h-full w-full flex-col bg-slate-950">

      {/* ── Topbar do builder ─────────────────────────────────────────────── */}
      <div className="z-10 flex items-center justify-between border-b border-slate-800/60 bg-slate-900/90 px-5 py-3 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600/20 border border-indigo-600/30">
            <Zap size={13} className="text-indigo-400" />
          </span>
          <div>
            <h1 className="text-sm font-bold text-slate-100">{workflowName}</h1>
            <p className="text-[10px] text-slate-500">
              {nodes.length} bloco{nodes.length !== 1 ? 's' : ''} · {edges.length} conexão{edges.length !== 1 ? 'ões' : ''}
              {lastSaved && (
                <span className="ml-2 text-emerald-500">· Salvo às {lastSaved}</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Botão Salvar */}
          <button
            id="btn-save-workflow"
            onClick={handleSaveWorkflow}
            disabled={isSaving}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-1.5 text-xs font-semibold text-slate-300 transition-all hover:bg-slate-700 hover:text-white disabled:opacity-50"
          >
            <Save size={13} />
            {isSaving ? 'Salvando...' : 'Salvar'}
          </button>

          {/* Botão Testar */}
          <button
            id="btn-test-workflow"
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white transition-all hover:bg-emerald-500 shadow-md shadow-emerald-900/30"
          >
            <Play size={13} />
            Testar Fluxo
          </button>
        </div>
      </div>

      {/* ── Canvas principal ──────────────────────────────────────────────── */}
      <div ref={reactFlowWrapper} className="relative flex-1">

        {/* Sidebar flutuante de nós */}
        <NodeSidebar onDragStart={onDragStart} />

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={setRfInstance}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onNodeClick={(_, node) => setSelectedNode(node)}
          onPaneClick={() => setSelectedNode(null)}
          nodeTypes={NODE_TYPES}
          deleteKeyCode={['Backspace', 'Delete']}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.3}
          maxZoom={1.8}
          defaultEdgeOptions={{
            animated: true,
            style: { stroke: '#475569', strokeWidth: 1.5 },
          }}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#1e293b" />
          <Controls className="!border-slate-700/60 !bg-slate-900/90 !shadow-xl" showInteractive={false} />
          <MiniMap
            className="!border-slate-700/60 !bg-slate-900/90 !shadow-xl !rounded-xl overflow-hidden"
            nodeColor={(node) => {
              switch (node.type) {
                case 'sendNode':      return '#059669';
                case 'aiNode':       return '#7c3aed';
                case 'crmFilterNode':return '#d97706';
                default:             return '#475569';
              }
            }}
            maskColor="rgba(2, 6, 23, 0.75)"
            style={{ width: 160, height: 100 }}
          />
        </ReactFlow>

        {/* ── Painel Direito de Configuração do Nó (Drawer) ───────────────────── */}
        {selectedNode && selectedNode.type && (
          <aside className="absolute right-0 top-0 bottom-0 w-80 bg-slate-900 border-l border-slate-800 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right-10 duration-300">
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
               <div className="flex items-center gap-2">
                {selectedNode?.type === 'sendNode' && <MessageSquareCode size={18} className="text-emerald-400" />}
                {selectedNode?.type === 'aiNode' && <Sparkles size={18} className="text-purple-400" />}
                <h3 className="font-bold text-slate-100">Configurar Bloco</h3>
              </div>
              <button onClick={() => setSelectedNode(null)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              
              <div className="space-y-2">
                <Label className="text-slate-400 text-xs uppercase tracking-wider">Nome do Bloco</Label>
                <Input 
                  value={String(selectedNode?.data?.label ?? '')} 
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateNodeData('label', e.target.value)}
                  className="bg-slate-950 border-slate-800 focus-visible:ring-emerald-500 text-slate-100"
                />
              </div>

              {/* Opções específicas por Tipo */}
              {selectedNode?.type === 'sendNode' && (
                <div className="space-y-4">
                  {/* Abas de Mídia */}
                  <div className="space-y-2">
                    <Label className="text-slate-400 text-xs uppercase tracking-wider">Tipo de Envio</Label>
                    <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
                      {(['text', 'image', 'audio', 'document'] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => updateNodeData('mediaType', t)}
                          className={`flex-1 text-[10px] py-1 rounded font-semibold capitalize transition-all ${
                            (selectedNode?.data?.mediaType ?? 'text') === t
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {t === 'text' ? 'Texto' : t === 'image' ? 'Imagem' : t === 'audio' ? 'Áudio' : 'Doc'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Configurações dependendo da aba de mídia */}
                  {(selectedNode?.data?.mediaType ?? 'text') !== 'text' && (
                    <div className="space-y-3 p-3 rounded-lg bg-slate-950 border border-slate-800">
                      <Label className="text-slate-400 text-[10px] uppercase tracking-wider block">Arquivo / URL da Mídia</Label>
                      <Input
                        placeholder="https://exemplo.com/arquivo.jpg"
                        value={String(selectedNode?.data?.mediaUrl ?? '')}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateNodeData('mediaUrl', e.target.value)}
                        className="bg-slate-900 border-slate-800 text-xs text-slate-100 placeholder:text-slate-600"
                      />
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[9px] text-slate-500">ou faça upload local</span>
                        <input
                          type="file"
                          id="media-upload"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              // Simulador de upload: cria uma URL de upload fictícia local
                              updateNodeData('mediaUrl', `/uploads/${file.name}`);
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => document.getElementById('media-upload')?.click()}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] rounded border border-slate-700 font-semibold"
                        >
                          Selecionar Arquivo
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-slate-400 text-xs uppercase tracking-wider">Mensagem / Legenda</Label>
                    <Textarea 
                      rows={6}
                      value={String(selectedNode?.data?.message ?? '')} 
                      onChange={(e) => updateNodeData('message', e.target.value)}
                      className="bg-slate-950 border-slate-800 text-slate-100 focus-visible:ring-emerald-500 font-mono text-xs resize-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-400 text-xs uppercase tracking-wider">Tags Dinâmicas</Label>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => injectVariable('nome_empresa')} className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded border border-slate-700 transition-colors">
                        {"{{nome_empresa}}"}
                      </button>
                      <button onClick={() => injectVariable('cidade')} className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded border border-slate-700 transition-colors">
                        {"{{cidade}}"}
                      </button>
                    </div>
                  </div>

                  {/* Botões Interativos (Apenas se mediaType for text) */}
                  {(selectedNode?.data?.mediaType ?? 'text') === 'text' && (
                    <div className="space-y-2 pt-2 border-t border-slate-800/80">
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-slate-400 text-xs uppercase tracking-wider">Botões Rápidos</Label>
                        {((selectedNode?.data?.buttons as any[])?.length ?? 0) < 3 && (
                          <button
                            type="button"
                            onClick={() => {
                              const currentButtons = (selectedNode?.data?.buttons as any[]) ?? [];
                              updateNodeData('buttons', [...currentButtons, { id: `btn-${Date.now()}`, text: `Botão ${currentButtons.length + 1}` }]);
                            }}
                            className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold"
                          >
                            + Adicionar Botão
                          </button>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        {((selectedNode?.data?.buttons as any[]) ?? []).map((btn, index) => (
                          <div key={btn.id} className="flex gap-2 items-center">
                            <Input
                              value={btn.text}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                const currentButtons = [...((selectedNode?.data?.buttons as any[]) ?? [])];
                                currentButtons[index].text = e.target.value;
                                updateNodeData('buttons', currentButtons);
                              }}
                              className="bg-slate-950 border-slate-800 text-xs flex-1 text-slate-100"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const currentButtons = ((selectedNode?.data?.buttons as any[]) ?? []).filter((b) => b.id !== btn.id);
                                updateNodeData('buttons', currentButtons);
                              }}
                              className="text-slate-500 hover:text-red-400 transition-colors p-1"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {selectedNode?.type === 'aiNode' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-slate-400 text-xs uppercase tracking-wider">Prompt de Contexto</Label>
                    <Textarea 
                      rows={12}
                      value={String(selectedNode?.data?.systemPrompt ?? '')} 
                      onChange={(e) => updateNodeData('systemPrompt', e.target.value)}
                      className="bg-slate-950 border-purple-900/30 text-slate-100 focus-visible:ring-purple-500 font-mono text-xs resize-none"
                    />
                    <p className="text-[10px] text-slate-500 leading-tight mt-1">
                      Instrua a inteligência artificial sobre como ela deve analisar as respostas e direcionar o lead.
                    </p>
                  </div>
                </div>
              )}

              {selectedNode?.type === 'crmFilterNode' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-slate-400 text-xs uppercase tracking-wider">Condição</Label>
                    <Input 
                      value={String(selectedNode?.data?.condition ?? '')} 
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateNodeData('condition', e.target.value)}
                      className="bg-slate-950 border-slate-800 text-slate-100 focus-visible:ring-emerald-500"
                    />
                  </div>
                </div>
              )}

              {selectedNode?.type === 'delayNode' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-slate-400 text-xs uppercase tracking-wider">Tipo de Espera</Label>
                    <select
                      value={String(selectedNode?.data?.unit ?? 'hours')}
                      onChange={(e) => {
                        updateNodeData('unit', e.target.value);
                        if (e.target.value === 'comercial') {
                          updateNodeData('amount', 0);
                        }
                      }}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg p-2.5 text-xs focus:ring-[#25D366] focus:border-[#25D366]"
                    >
                      <option value="minutes">Minuto(s)</option>
                      <option value="hours">Hora(s)</option>
                      <option value="days">Dia(s)</option>
                      <option value="comercial">Até Horário Comercial (09:00)</option>
                    </select>
                  </div>

                  {(selectedNode?.data?.unit ?? 'hours') !== 'comercial' && (
                    <div className="space-y-2">
                      <Label className="text-slate-400 text-xs uppercase tracking-wider">Tempo</Label>
                      <Input
                        type="number"
                        min={1}
                        value={Number(selectedNode?.data?.amount ?? 1)}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateNodeData('amount', Number(e.target.value))}
                        className="bg-slate-950 border-slate-800 text-slate-100 focus-visible:ring-emerald-500"
                      />
                    </div>
                  )}
                </div>
              )}

            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
