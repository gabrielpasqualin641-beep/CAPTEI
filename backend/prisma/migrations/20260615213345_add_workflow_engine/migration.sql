-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "endereco" TEXT,
    "cidade" TEXT,
    "nicho" TEXT,
    "site" TEXT,
    "email" TEXT,
    "plataforma" TEXT,
    "status_extracao" TEXT,
    "avaliacao" DOUBLE PRECISION,
    "total_reviews" INTEGER,
    "instagram" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Novo',
    "qualidade" TEXT,
    "tags" TEXT[],
    "notas" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "templates" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "nicho" TEXT,
    "conteudo" TEXT NOT NULL,
    "variaveis" TEXT[],
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "followup_sequencias" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "conteudo" TEXT NOT NULL,
    "dias_apos_anterior" INTEGER NOT NULL,

    CONSTRAINT "followup_sequencias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instancias" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "numero" TEXT,
    "status" TEXT NOT NULL DEFAULT 'desconectado',
    "evolution_instance_key" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "instancias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campanhas" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "instancia_id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pausada',
    "janela_inicio" TEXT NOT NULL,
    "janela_fim" TEXT NOT NULL,
    "dias_semana" INTEGER[],
    "delay_min" INTEGER NOT NULL DEFAULT 30,
    "delay_max" INTEGER NOT NULL DEFAULT 120,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "campanhas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "envios" (
    "id" TEXT NOT NULL,
    "campanha_id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "followup_sequencia_id" TEXT,
    "conteudo_renderizado" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Agendado',
    "agendado_para" TIMESTAMP(3) NOT NULL,
    "enviado_em" TIMESTAMP(3),
    "erro" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "envios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interacoes" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "conteudo" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'Operador',
    "plano" TEXT NOT NULL DEFAULT 'free',
    "disparos_mes" INTEGER NOT NULL DEFAULT 0,
    "data_renovacao" TIMESTAMP(3),
    "mp_subscription_id" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "varredura_jobs" (
    "id" TEXT NOT NULL,
    "jobGroupId" TEXT NOT NULL,
    "nicho" TEXT NOT NULL,
    "modo" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'processando',
    "totalCidades" INTEGER NOT NULL,
    "concluidas" INTEGER NOT NULL DEFAULT 0,
    "falhas" INTEGER NOT NULL DEFAULT 0,
    "leadsCapturados" INTEGER NOT NULL DEFAULT 0,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "varredura_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflows" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ativo',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_execucoes" (
    "id" TEXT NOT NULL,
    "workflow_id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "node_atual_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "bullmq_job_id" TEXT,
    "erro" TEXT,
    "iniciado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_execucoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "leads_telefone_key" ON "leads"("telefone");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "varredura_jobs_jobGroupId_key" ON "varredura_jobs"("jobGroupId");

-- CreateIndex
CREATE INDEX "workflows_userId_idx" ON "workflows"("userId");

-- CreateIndex
CREATE INDEX "workflow_execucoes_workflow_id_idx" ON "workflow_execucoes"("workflow_id");

-- CreateIndex
CREATE INDEX "workflow_execucoes_lead_id_idx" ON "workflow_execucoes"("lead_id");

-- AddForeignKey
ALTER TABLE "followup_sequencias" ADD CONSTRAINT "followup_sequencias_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campanhas" ADD CONSTRAINT "campanhas_instancia_id_fkey" FOREIGN KEY ("instancia_id") REFERENCES "instancias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campanhas" ADD CONSTRAINT "campanhas_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "envios" ADD CONSTRAINT "envios_campanha_id_fkey" FOREIGN KEY ("campanha_id") REFERENCES "campanhas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "envios" ADD CONSTRAINT "envios_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "envios" ADD CONSTRAINT "envios_followup_sequencia_id_fkey" FOREIGN KEY ("followup_sequencia_id") REFERENCES "followup_sequencias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interacoes" ADD CONSTRAINT "interacoes_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_execucoes" ADD CONSTRAINT "workflow_execucoes_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "workflows"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_execucoes" ADD CONSTRAINT "workflow_execucoes_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
