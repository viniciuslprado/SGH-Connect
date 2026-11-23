-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "agendamento";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "atendimento";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "corpo_clinico";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "faturamento";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "identidade";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "internacao";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "notificacoes";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "pacientes";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "relatorios";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "shared";

-- CreateTable
CREATE TABLE "shared"."OutboxEvento" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processadoEm" TIMESTAMP(3),
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "ultimoErro" TEXT,

    CONSTRAINT "OutboxEvento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shared"."RegistroAuditoria" (
    "id" TEXT NOT NULL,
    "atorId" TEXT,
    "atorEmail" TEXT,
    "acao" TEXT NOT NULL,
    "entidade" TEXT NOT NULL,
    "entidadeId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegistroAuditoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identidade"."Usuario" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "perfil" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pacientes"."Paciente" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "nascimento" DATE NOT NULL,
    "telefone" TEXT,
    "email" TEXT,
    "convenio" TEXT NOT NULL,
    "numeroCarteirinha" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Paciente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corpo_clinico"."Profissional" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "registro" TEXT NOT NULL,
    "especialidade" TEXT NOT NULL,
    "usuarioId" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Profissional_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agendamento"."Consulta" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "profissionalId" TEXT NOT NULL,
    "inicio" TIMESTAMP(3) NOT NULL,
    "fim" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "sala" TEXT,
    "observacao" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Consulta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "atendimento"."Atendimento" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "profissionalId" TEXT NOT NULL,
    "consultaId" TEXT,
    "status" TEXT NOT NULL,
    "inicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fim" TIMESTAMP(3),

    CONSTRAINT "Atendimento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "atendimento"."Triagem" (
    "id" TEXT NOT NULL,
    "atendimentoId" TEXT NOT NULL,
    "classificacaoRisco" TEXT NOT NULL,
    "queixaPrincipal" TEXT NOT NULL,
    "pressaoArterial" TEXT,
    "temperatura" DOUBLE PRECISION,
    "frequenciaCardiaca" INTEGER,
    "saturacao" INTEGER,
    "registradaPor" TEXT NOT NULL,
    "registradaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Triagem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "atendimento"."RegistroClinico" (
    "id" TEXT NOT NULL,
    "atendimentoId" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,
    "anamnese" TEXT,
    "cid" TEXT,
    "conduta" TEXT NOT NULL,
    "prescricao" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegistroClinico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "internacao"."Leito" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "ala" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "versao" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Leito_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "internacao"."Internacao" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "leitoId" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "inicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "alta" TIMESTAMP(3),

    CONSTRAINT "Internacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faturamento"."Conta" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "convenio" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "abertaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechadaEm" TIMESTAMP(3),

    CONSTRAINT "Conta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faturamento"."ItemConta" (
    "id" TEXT NOT NULL,
    "contaId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "valorUnitario" DECIMAL(12,2) NOT NULL,
    "origemEventoId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemConta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faturamento"."EventoProcessadoFaturamento" (
    "eventId" TEXT NOT NULL,
    "processadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventoProcessadoFaturamento_pkey" PRIMARY KEY ("eventId")
);

-- CreateTable
CREATE TABLE "notificacoes"."Notificacao" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "canal" TEXT NOT NULL,
    "destino" TEXT NOT NULL,
    "assunto" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "enviadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notificacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "relatorios"."ProjecaoConsultas" (
    "consultaId" TEXT NOT NULL,
    "profissionalId" TEXT NOT NULL,
    "inicio" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjecaoConsultas_pkey" PRIMARY KEY ("consultaId")
);

-- CreateTable
CREATE TABLE "relatorios"."ProjecaoProducao" (
    "atendimentoId" TEXT NOT NULL,
    "profissionalId" TEXT NOT NULL,
    "profissionalNome" TEXT NOT NULL,
    "finalizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjecaoProducao_pkey" PRIMARY KEY ("atendimentoId")
);

-- CreateTable
CREATE TABLE "relatorios"."ProjecaoOcupacao" (
    "internacaoId" TEXT NOT NULL,
    "leitoCodigo" TEXT NOT NULL,
    "ala" TEXT NOT NULL,
    "tipoLeito" TEXT NOT NULL,
    "inicio" TIMESTAMP(3) NOT NULL,
    "alta" TIMESTAMP(3),

    CONSTRAINT "ProjecaoOcupacao_pkey" PRIMARY KEY ("internacaoId")
);

-- CreateIndex
CREATE INDEX "OutboxEvento_processadoEm_criadoEm_idx" ON "shared"."OutboxEvento"("processadoEm", "criadoEm");

-- CreateIndex
CREATE INDEX "RegistroAuditoria_criadoEm_idx" ON "shared"."RegistroAuditoria"("criadoEm");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "identidade"."Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Paciente_cpf_key" ON "pacientes"."Paciente"("cpf");

-- CreateIndex
CREATE INDEX "Paciente_nome_idx" ON "pacientes"."Paciente"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "Profissional_registro_key" ON "corpo_clinico"."Profissional"("registro");

-- CreateIndex
CREATE UNIQUE INDEX "Profissional_usuarioId_key" ON "corpo_clinico"."Profissional"("usuarioId");

-- CreateIndex
CREATE INDEX "Consulta_profissionalId_inicio_idx" ON "agendamento"."Consulta"("profissionalId", "inicio");

-- CreateIndex
CREATE INDEX "Atendimento_status_idx" ON "atendimento"."Atendimento"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Triagem_atendimentoId_key" ON "atendimento"."Triagem"("atendimentoId");

-- CreateIndex
CREATE UNIQUE INDEX "Leito_codigo_key" ON "internacao"."Leito"("codigo");

-- CreateIndex
CREATE INDEX "Internacao_leitoId_status_idx" ON "internacao"."Internacao"("leitoId", "status");

-- CreateIndex
CREATE INDEX "Internacao_pacienteId_status_idx" ON "internacao"."Internacao"("pacienteId", "status");

-- CreateIndex
CREATE INDEX "Conta_pacienteId_status_idx" ON "faturamento"."Conta"("pacienteId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Notificacao_eventId_key" ON "notificacoes"."Notificacao"("eventId");

-- AddForeignKey
ALTER TABLE "atendimento"."Triagem" ADD CONSTRAINT "Triagem_atendimentoId_fkey" FOREIGN KEY ("atendimentoId") REFERENCES "atendimento"."Atendimento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atendimento"."RegistroClinico" ADD CONSTRAINT "RegistroClinico_atendimentoId_fkey" FOREIGN KEY ("atendimentoId") REFERENCES "atendimento"."Atendimento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faturamento"."ItemConta" ADD CONSTRAINT "ItemConta_contaId_fkey" FOREIGN KEY ("contaId") REFERENCES "faturamento"."Conta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Defesa em profundidade (conascência temporal, documento seção 7.8):
-- além do controle otimista por versão no Leito, o banco impede duas internações
-- ATIVAS no mesmo leito ou para o mesmo paciente. Prisma não expressa índice parcial.
CREATE UNIQUE INDEX "Internacao_leito_ativa_unique" ON "internacao"."Internacao"("leitoId") WHERE "status" = 'ATIVA';
CREATE UNIQUE INDEX "Internacao_paciente_ativa_unique" ON "internacao"."Internacao"("pacienteId") WHERE "status" = 'ATIVA';
