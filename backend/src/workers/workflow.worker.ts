/**
 * workflow.worker.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Motor de execução assíncrona dos fluxos visuais de automação.
 *
 * Cada job representa UM step (nó) do workflow para UM lead específico.
 * O worker processa, executa a ação do nó e enfileira o próximo step
 * com o delay adequado — até o fim do fluxo ou até pausa por webhook.
 *
 * Arquitetura de segurança:
 *  - Verifica WorkflowExecucao.status antes de executar (mecanismo de pausa)
 *  - Registra bullmq_job_id no DB para cancelamento por webhook
 *  - Registra toda interação na tabela `interacoes` do lead
 */

import { Worker, type Job } from 'bullmq';
import { connection } from '../lib/queue';
import { prisma, bypassTenantIsolation, tenantStorage } from '../lib/prisma';
import { evolutionApi } from '../lib/evolution';
import { parseSpintax } from '../lib/spintax';
import { AIService } from '../services/aiService';
import {
  WORKFLOW_QUEUE_NAME,
  enqueueNextStep,
  randomJitter,
} from '../queues/workflow.queue';
import {
  type WorkflowJobData,
  type WorkflowPayload,
  type FlowNode,
  type FlowEdge,
  type SendNodeData,
  type AINodeData,
  type CRMFilterNodeData,
  isValidWorkflowPayload,
  LEAD_ACTIVE_JOBS_KEY,
} from '../types/workflow.types';

// ─── Constantes ───────────────────────────────────────────────────────────────

/** Delay base entre steps normais (ms) — soma-se ao delaySeconds do nó */
const BASE_STEP_DELAY_MS = 2_000;

/** Faixa de jitter para follow-ups (humaniza cadências) */
const JITTER_MIN_MS = 10_000;  //  10 segundos
const JITTER_MAX_MS = 90_000;  //  90 segundos

/** Delay padrão para follow-up quando o nó não configura um customizado */
const DEFAULT_FOLLOWUP_DELAY_MS = 30 * 60 * 1000; // 30 minutos

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length >= 12) return digits;
  if (digits.length === 10 || digits.length === 11) return '55' + digits;
  return digits;
}

/**
 * Injeta dinamicamente os dados do lead nos placeholders {{variavel}} da mensagem.
 * Suporta todas as variáveis extraídas pelo scraping do Google Maps / e-commerce.
 */
function renderMessage(
  template: string,
  lead: Record<string, unknown>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const value = lead[key];
    return typeof value === 'string' || typeof value === 'number'
      ? String(value)
      : '';
  });
}

/**
 * Encontra o próximo nó conectado à saída de um nó atual.
 * Para nós condicionais, filtra pelo sourceHandle correto ('true' | 'false').
 */
function findNextNode(
  currentNodeId: string,
  edges: FlowEdge[],
  nodes: FlowNode[],
  sourceHandle?: string
): FlowNode | null {
  const edge = edges.find(
    (e) =>
      e.source === currentNodeId &&
      (!sourceHandle || e.sourceHandle === sourceHandle)
  );

  if (!edge) return null;
  return nodes.find((n) => n.id === edge.target) ?? null;
}

// ─── Handlers por tipo de nó ──────────────────────────────────────────────────

/**
 * Processa o nó "sendNode" — Mensagem WhatsApp.
 *
 * 1. Renderiza o template com dados do lead
 * 2. Envia via Evolution API
 * 3. Registra a interação
 * 4. Avança status do lead (Novo → Contatado)
 * 5. Retorna o handle de saída (sempre 'output')
 */
async function handleSendNode(
  node: FlowNode,
  lead: {
    id: string;
    nome: string;
    telefone: string;
    status: string;
    [key: string]: unknown;
  },
  instanciaKey: string
): Promise<{ outputHandle: string; delayMs: number }> {
  const data = node.data as SendNodeData;

  const textWithSpintax = parseSpintax(data.message || '');
  const mensagem = renderMessage(textWithSpintax, lead as Record<string, unknown>);
  const whatsappNumber = normalizePhone(lead.telefone);

  console.log(
    `[WorkflowWorker] 📤 sendNode "${data.label}" → Lead: ${lead.nome} (${whatsappNumber})`
  );
  console.log(`[WorkflowWorker]    Mensagem: "${mensagem.substring(0, 80)}..."`);

  const mediaType = data.mediaType ?? 'text';

  // ── Envio via Evolution API ───────────────────────────────────────────────
  if (mediaType !== 'text' && data.mediaUrl) {
    // Envia imagem, áudio ou documento com a legenda opcional
    await evolutionApi.sendMedia(
      instanciaKey,
      whatsappNumber,
      data.mediaUrl,
      mediaType,
      mensagem,
      1200
    );
  } else if (mediaType === 'text' && data.buttons && data.buttons.length > 0) {
    // Envia mensagem com botões interativos nativos do WhatsApp
    await evolutionApi.sendButtons(
      instanciaKey,
      whatsappNumber,
      mensagem,
      data.buttons,
      1200
    );
  } else {
    // Envio padrão de texto simples
    if (!mensagem) {
      throw new Error(`[sendNode:${node.id}] Nenhuma mensagem configurada para envio.`);
    }
    await evolutionApi.sendText(instanciaKey, whatsappNumber, mensagem, 1200);
  }

  // ── Atualiza status do lead ───────────────────────────────────────────────
  if (lead.status === 'Novo') {
    await prisma.lead.update({
      where: { id: lead.id },
      data: { status: 'Contatado' },
    });
    console.log(`[WorkflowWorker] 🔄 Lead "${lead.nome}" → Contatado`);
  }

  // ── Registra interação ────────────────────────────────────────────────────
  await prisma.interacao.create({
    data: {
      lead_id: lead.id,
      tipo: 'enviado',
      conteudo: mediaType !== 'text' ? `[Mídia: ${mediaType}] ${mensagem}` : mensagem,
    },
  });

  // ── Incrementa contador de disparos do mês ────────────────────────────────
  await prisma.usuario.updateMany({
    data: { disparos_mes: { increment: 1 } },
  });

  // Delay configurado no nó (ou zero para mensagens imediatas)
  const delayMs = (data.delaySeconds ?? 0) * 1000;

  return { outputHandle: 'output', delayMs };
}

/**
 * Processa o nó "aiNode" — Assistente de IA.
 *
 * Na fase atual, loga o contexto e simula a resposta.
 * TODO: integrar com Ollama / OpenAI quando disponível.
 */
async function handleAINode(
  node: FlowNode,
  lead: Record<string, unknown>
): Promise<{ outputHandle: string; delayMs: number }> {
  const data = node.data as AINodeData;

  console.log(
    `[WorkflowWorker] 🤖 aiNode "${data.label}" — Modelo: ${data.model ?? 'llama-3'}`
  );

  // Busca a última mensagem recebida do lead
  const lastIncomingInteraction = await prisma.interacao.findFirst({
    where: { lead_id: lead.id as string, tipo: 'recebido' },
    orderBy: { criado_em: 'desc' },
  });

  const textToClassify = lastIncomingInteraction?.conteudo || 'Olá, tenho interesse';
  console.log(`[WorkflowWorker]    Texto para classificação: "${textToClassify}"`);

  // Classifica usando a IA (OpenAI / Ollama / Fallback)
  const classification = await AIService.classifyResponse(textToClassify, data.systemPrompt);
  console.log(`[WorkflowWorker]    Classificação da IA:`, classification);

  // Salva a classificação no banco de dados do lead
  await prisma.lead.update({
    where: { id: lead.id as string },
    data: {
      ia_intencao: classification.intencao,
      ia_resumo: classification.resumo,
    },
  });

  return { outputHandle: 'output', delayMs: 0 };
}

/**
 * Processa o nó "crmFilterNode" — Condicional de CRM.
 *
 * Avalia o status atual do lead no CRM e retorna o handle de saída
 * ('true' se o status bate com trueStatus, 'false' caso contrário).
 */
async function handleCRMFilterNode(
  node: FlowNode,
  lead: { status: string; ia_intencao?: string | null }
): Promise<{ outputHandle: 'true' | 'false'; delayMs: number }> {
  const data = node.data as CRMFilterNodeData;
  const targetStatus = data.trueStatus ?? 'Respondeu';

  console.log(
    `[WorkflowWorker] 🔀 crmFilterNode "${data.label}" | Status do lead: "${lead.status}" | IA Intenção: "${lead.ia_intencao}" | Alvo: "${targetStatus}"`
  );

  // Condição é atendida se o status bate, ou se o alvo é "Respondeu" e a intenção da IA foi classificada como positivo
  const conditionMet = 
    lead.status === targetStatus || 
    (targetStatus === 'Respondeu' && lead.ia_intencao === 'positivo');

  console.log(
    `[WorkflowWorker]    Resultado: ${conditionMet ? '✅ Verdadeiro' : '❌ Falso'}`
  );

  return {
    outputHandle: conditionMet ? 'true' : 'false',
    delayMs: 0,
  };
}

// ─── Processador principal do Worker ─────────────────────────────────────────

async function processWorkflowStep(job: Job<WorkflowJobData>): Promise<void> {
  const { execucaoId, workflowId, leadId, currentNodeId, incomingHandle } =
    job.data;

  console.log(
    `\n[WorkflowWorker] ▶ Processando job ${job.id} — Execução: ${execucaoId} | Nó: ${currentNodeId} | Lead: ${leadId}`
  );

  // ── 1. Verificação de pausa (mecanismo de interrupção via webhook) ──────────
  const execucao = await bypassTenantIsolation(() =>
    prisma.workflowExecucao.findUnique({
      where: { id: execucaoId },
    })
  );

  if (!execucao) {
    console.warn(`[WorkflowWorker] ⚠️  Execução ${execucaoId} não encontrada. Abortando.`);
    return;
  }

  // Executa toda a lógica subsequente do step de workflow sob o contexto do tenant dono da execução
  return tenantStorage.run({ userId: execucao.userId, isSystem: false }, async () => {
    if (execucao.status === 'pausado' || execucao.status === 'concluido') {
      console.log(
        `[WorkflowWorker] ⏸ Execução ${execucaoId} está "${execucao.status}". Job ignorado.`
      );
      return;
    }

  // ── 2. Marca execução como "executando" e registra job ID ──────────────────
  await prisma.workflowExecucao.update({
    where: { id: execucaoId },
    data: {
      status: 'executando',
      node_atual_id: currentNodeId,
      bullmq_job_id: job.id,
    },
  });

  // ── 3. Carrega workflow e lead ─────────────────────────────────────────────
  const [workflow, lead] = await Promise.all([
    prisma.workflow.findUnique({ where: { id: workflowId } }),
    prisma.lead.findUnique({ where: { id: leadId } }),
  ]);

  if (!workflow) throw new Error(`Workflow ${workflowId} não encontrado.`);
  if (!lead) throw new Error(`Lead ${leadId} não encontrado.`);

  // ── 3.1. Verifica Opt-out do Lead (aborta execução se ativo) ───────────────
  if (lead.optOut) {
    console.log(`[WorkflowWorker] 🚫 Lead "${lead.nome}" com Opt-out ativo. Abortando execução.`);
    await prisma.workflowExecucao.update({
      where: { id: execucaoId },
      data: { status: 'concluido', bullmq_job_id: null },
    });
    await removeLeadActiveJob(leadId, job.id!);
    return;
  }

  // ── 4. Valida e extrai o payload ───────────────────────────────────────────
  if (!isValidWorkflowPayload(workflow.payload)) {
    throw new Error(`Workflow ${workflowId} tem payload inválido (nodes/edges ausentes).`);
  }

  const { nodes, edges } = workflow.payload as WorkflowPayload;

  // ── 5. Encontra o nó atual ─────────────────────────────────────────────────
  const currentNode = nodes.find((n) => n.id === currentNodeId);
  if (!currentNode) {
    throw new Error(`Nó "${currentNodeId}" não encontrado no workflow ${workflowId}.`);
  }

  console.log(
    `[WorkflowWorker] 🧩 Nó tipo "${currentNode.type}" — "${(currentNode.data as { label?: string }).label ?? '—'}"`
  );

  // ── 6. Executa a lógica do nó ──────────────────────────────────────────────

  // Busca a instância WhatsApp ativa (reutiliza lógica do queue.ts existente)
  const instancia = await prisma.instancia.findFirst({
    where: { status: 'conectado' },
  });

  const instanciaKey = instancia?.nome ?? process.env.EVOLUTION_DEFAULT_INSTANCE ?? 'default';

  let outputHandle: string = 'output';
  let nodeDelayMs = 0;

  switch (currentNode.type) {
    case 'sendNode': {
      const result = await handleSendNode(
        currentNode,
        lead as Parameters<typeof handleSendNode>[1],
        instanciaKey
      );
      outputHandle = result.outputHandle;
      nodeDelayMs = result.delayMs;
      break;
    }

    case 'aiNode': {
      const result = await handleAINode(currentNode, lead as Record<string, unknown>);
      outputHandle = result.outputHandle;
      nodeDelayMs = result.delayMs;
      break;
    }

    case 'crmFilterNode': {
      // Busca status ATUALIZADO do lead (pode ter mudado por webhook)
      const freshLead = await prisma.lead.findUnique({
        where: { id: leadId },
        select: { status: true, ia_intencao: true },
      });
      const result = await handleCRMFilterNode(
        currentNode,
        freshLead ?? { status: lead.status, ia_intencao: lead.ia_intencao }
      );
      
      // Se a intenção foi classificada como positivo, atualizamos o status no CRM
      if (freshLead?.ia_intencao === 'positivo' && freshLead.status !== 'Respondeu') {
        await prisma.lead.update({
          where: { id: leadId },
          data: { status: 'Respondeu' }
        });
        console.log(`[WorkflowWorker] 🚀 Mover de funil automático: status do lead "${lead.nome}" atualizado para "Respondeu" via IA`);
      }
      
      outputHandle = result.outputHandle;
      nodeDelayMs = result.delayMs;
      break;
    }

    case 'delayNode': {
      const data = currentNode.data as any;
      const amount = data.amount ?? 1;
      const unit = data.unit ?? 'hours';

      let calculatedMs = 0;
      if (unit === 'minutes') {
        calculatedMs = amount * 60 * 1000;
      } else if (unit === 'hours') {
        calculatedMs = amount * 60 * 60 * 1000;
      } else if (unit === 'days') {
        calculatedMs = amount * 24 * 60 * 60 * 1000;
      } else if (unit === 'comercial') {
        // Espera até o próximo horário comercial (09:00) do dia atual ou de amanhã
        const now = new Date();
        const target = new Date();
        target.setHours(9, 0, 0, 0);

        if (now.getHours() >= 9) {
          // Já passou das 09h hoje, espera até amanhã às 09h
          target.setDate(target.getDate() + 1);
        }

        calculatedMs = target.getTime() - now.getTime();
      }

      console.log(`[WorkflowWorker] ⏳ delayNode "${data.label}" configurado para aguardar ${Math.round(calculatedMs / 1000)}s`);
      outputHandle = 'output';
      nodeDelayMs = calculatedMs;
      break;
    }

    default: {
      console.warn(
        `[WorkflowWorker] ⚠️  Tipo de nó desconhecido: "${currentNode.type}". Pulando.`
      );
      outputHandle = 'output';
      break;
    }
  }

  // ── 7. Descobre próximo nó ─────────────────────────────────────────────────
  const nextNode = findNextNode(currentNodeId, edges, nodes, outputHandle);

  if (!nextNode) {
    // Fim do fluxo — não há próximo nó
    console.log(
      `[WorkflowWorker] 🏁 Fim do fluxo para lead ${lead.nome}. Execução concluída.`
    );

    await prisma.workflowExecucao.update({
      where: { id: execucaoId },
      data: { status: 'concluido', bullmq_job_id: null },
    });

    // Remove o job da lista ativa no Redis
    await removeLeadActiveJob(leadId, job.id!);
    return;
  }

  // ── 8. Calcula delay inteligente (anti-bloqueio) ───────────────────────────
  const isFollowUp = nextNode.type === 'sendNode';

  const baseDelay = isFollowUp
    ? Math.max(nodeDelayMs, DEFAULT_FOLLOWUP_DELAY_MS)
    : BASE_STEP_DELAY_MS + nodeDelayMs;

  const jitter = isFollowUp
    ? randomJitter(JITTER_MIN_MS, JITTER_MAX_MS)
    : randomJitter(500, 3_000); // jitter curto para steps rápidos

  const totalDelay = baseDelay + jitter;

  console.log(
    `[WorkflowWorker] ⏭  Próximo nó: "${nextNode.id}" (${nextNode.type}) | Delay: ${Math.round(totalDelay / 1000)}s (base: ${Math.round(baseDelay / 1000)}s + jitter: ${Math.round(jitter / 1000)}s)`
  );

  // ── 9. Enfileira próximo step ──────────────────────────────────────────────
  const nextJobData: WorkflowJobData = {
    execucaoId,
    workflowId,
    leadId,
    currentNodeId: nextNode.id,
  };

  const nextJobId = await enqueueNextStep({
    jobData: nextJobData,
    delayMs: baseDelay,
    jitterMs: jitter,
  });

  // ── 10. Rastreia o job ativo no Redis (para cancelamento via webhook) ───────
  await trackLeadActiveJob(leadId, nextJobId);

  // ── 11. Atualiza execução com o novo node e job ────────────────────────────
  await prisma.workflowExecucao.update({
    where: { id: execucaoId },
    data: {
      node_atual_id: nextNode.id,
      bullmq_job_id: nextJobId,
      status: 'pendente',
    },
  });

  console.log(`[WorkflowWorker] ✅ Step concluído. Próximo job: ${nextJobId}`);
  });
}

// ─── Redis: rastreamento de jobs ativos por lead ──────────────────────────────

import { connection as redisConnection } from '../lib/queue';

/**
 * Adiciona um job ID ao Set Redis de jobs ativos do lead.
 * TTL de 7 dias para limpeza automática.
 */
async function trackLeadActiveJob(leadId: string, jobId: string): Promise<void> {
  const key = LEAD_ACTIVE_JOBS_KEY(leadId);
  await redisConnection.sadd(key, jobId);
  await redisConnection.expire(key, 7 * 24 * 60 * 60); // 7 dias
}

/**
 * Remove um job ID do Set Redis de jobs ativos do lead.
 */
async function removeLeadActiveJob(leadId: string, jobId: string): Promise<void> {
  const key = LEAD_ACTIVE_JOBS_KEY(leadId);
  await redisConnection.srem(key, jobId);
}

// ─── Instância do Worker ──────────────────────────────────────────────────────

export const workflowWorker = new Worker<WorkflowJobData>(
  WORKFLOW_QUEUE_NAME,
  processWorkflowStep,
  {
    connection,
    /** Processa até 3 leads em paralelo (cada lead em série via sua própria execução) */
    concurrency: 3,
    /** Limpa jobs completados do worker automaticamente */
    removeOnComplete: { count: 200 },
    removeOnFail: { count: 100 },
  }
);

// ─── Event listeners ──────────────────────────────────────────────────────────

workflowWorker.on('completed', (job) => {
  console.log(`[WorkflowWorker] ✅ Job ${job.id} finalizado com sucesso.`);
});

workflowWorker.on('failed', async (job, err) => {
  console.error(`[WorkflowWorker] ❌ Job ${job?.id} falhou após ${job?.attemptsMade} tentativa(s):`, err.message);

  if (job?.data?.execucaoId) {
    await bypassTenantIsolation(() =>
      prisma.workflowExecucao
        .update({
          where: { id: job.data.execucaoId },
          data: {
            status: 'erro',
            erro: err.message,
            bullmq_job_id: null,
          },
        })
    ).catch((dbErr) => {
      console.error('[WorkflowWorker] Falha ao registrar erro no DB:', dbErr);
    });
  }
});

workflowWorker.on('error', (err) => {
  console.error('[WorkflowWorker] Erro no worker:', err);
});

console.log('[WorkflowWorker] 🚀 Worker iniciado e aguardando jobs...');
