/**
 * Tipos TypeScript que espelham exatamente a estrutura exportada pelo
 * @xyflow/react no frontend (WorkflowJSON em WorkflowBuilder.tsx).
 *
 * Este arquivo é a "fonte da verdade" para o backend — usado tanto
 * na rota de salvamento quanto no worker de execução.
 */

// ─── Nós (Nodes) ─────────────────────────────────────────────────────────────

/** Tipos de nós suportados pelo motor de execução */
export type FlowNodeType = 'sendNode' | 'aiNode' | 'crmFilterNode' | 'delayNode';

export interface FlowPosition {
  x: number;
  y: number;
}

// ── Dados por tipo de nó ──────────────────────────────────────────────────────

export interface SendNodeData {
  label: string;
  /** Mensagem com variáveis dinâmicas: {{nome}}, {{cidade}}, {{nicho}}, etc. */
  message: string;
  variables?: string[];
  /** Delay em segundos antes de executar este nó (0 = imediato) */
  delaySeconds?: number;
  mediaType?: 'text' | 'image' | 'audio' | 'document';
  mediaUrl?: string;
  buttons?: Array<{ id: string; text: string }>;
}

export interface AINodeData {
  label: string;
  systemPrompt: string;
  model?: string;
  dataSources?: Array<'google_places' | 'cnpj' | 'ecommerce'>;
}

export interface CRMFilterNodeData {
  label: string;
  /** Condição textual (ex: "lead respondeu à mensagem") */
  condition: string;
  trueStatus?: string;
}

export interface DelayNodeData {
  label: string;
  amount: number;
  unit: 'minutes' | 'hours' | 'days' | 'comercial';
}

export type FlowNodeData = SendNodeData | AINodeData | CRMFilterNodeData | DelayNodeData;

/** Nó genérico do React Flow */
export interface FlowNode {
  id: string;
  type: FlowNodeType | string;
  position: FlowPosition;
  data: FlowNodeData & Record<string, unknown>;
}

// ─── Arestas (Edges) ──────────────────────────────────────────────────────────

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  /** 'output' | 'true' | 'false' — ID do Handle de saída no nó origem */
  sourceHandle?: string | null;
  targetHandle?: string | null;
  label?: string;
}

// ─── Payload do Workflow ──────────────────────────────────────────────────────

export interface WorkflowPayload {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

/** Valida que um objeto desconhecido tem a estrutura mínima de WorkflowPayload */
export function isValidWorkflowPayload(obj: unknown): obj is WorkflowPayload {
  if (typeof obj !== 'object' || obj === null) return false;
  const p = obj as Record<string, unknown>;
  return Array.isArray(p.nodes) && Array.isArray(p.edges);
}

// ─── Job Data (BullMQ) ────────────────────────────────────────────────────────

/** Dados transmitidos para cada job na workflowQueue */
export interface WorkflowJobData {
  /** ID da execução no banco (WorkflowExecucao.id) */
  execucaoId: string;
  workflowId: string;
  leadId: string;
  currentNodeId: string;
  /** Handle de origem para nós condicionais (ex: 'true' | 'false') */
  incomingHandle?: string;
}

/** Chave Redis usada para rastrear jobs ativos de um lead */
export const LEAD_ACTIVE_JOBS_KEY = (leadId: string) =>
  `workflow:lead:${leadId}:active_jobs`;
