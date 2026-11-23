# Fluxos principais (Mermaid)

Diagramas conferidos com o código. Cada participante aponta para o arquivo que o implementa.

## 1. Sequência — agendamento de consulta

Arquivos: `agendamento/api/consultas.controller.ts` → `agendamento/application/casos-de-uso.ts` (`AgendarConsultaUseCase`)
→ `agendamento/domain/consulta.ts` → `agendamento/infrastructure/prisma-consulta.repositorio.ts`.

```mermaid
sequenceDiagram
  autonumber
  actor R as Recepcionista (web)
  participant C as ConsultasController
  participant U as AgendarConsultaUseCase
  participant P as PacientesApi (contrato)
  participant M as CorpoClinicoApi (contrato)
  participant D as Consulta (domínio)
  participant DB as Repositório + PostgreSQL
  participant O as Outbox
  R->>C: POST /api/consultas {pacienteId, profissionalId, inicio ISO 8601, duracaoMin}
  C->>C: ValidationPipe (400 se inválido)
  C->>U: executar(AgendarConsultaCommand)
  U->>P: buscarResumo(pacienteId)
  U->>M: buscarProfissional(profissionalId)
  U->>D: Consulta.agendar(...) (valida futuro e duração)
  rect rgb(235,242,250)
    note over U,O: uma única transação
    U->>DB: pg_advisory_xact_lock(profissional)
    U->>DB: listarAgendadasNoIntervalo
    U->>D: garantirSemConflito(agenda)
    alt sobreposição
      D-->>C: ConflitoError → HTTP 409
    else livre
      U->>DB: salvar(consulta)
      U->>O: adicionar(ConsultaAgendada)
      U->>DB: auditoria CONSULTA_AGENDADA
    end
  end
  U-->>R: 201 ConsultaDto
  O-->>O: após o commit, OutboxWorker entrega o evento
  O-)Notificações: ConsultaAgendada → e-mail de confirmação
  O-)Relatórios: ConsultaAgendada → ProjecaoConsultas
```

## 2. Fluxo — internação e alta

Arquivos: `internacao/application/internar-paciente.use-case.ts` e `internacao/application/casos-de-uso.ts` (`RegistrarAltaUseCase`),
`internacao/domain/leito.ts`, `internacao/domain/internacao.ts`, `internacao/infrastructure/repositorios.ts`.

```mermaid
flowchart TD
  A([POST /api/internacoes]) --> B{Paciente existe e ativo?<br/>PacientesApi}
  B -- não --> X1[404 / 422]
  B -- sim --> T[[Início da transação]]
  T --> C{Paciente já tem<br/>internação ATIVA?}
  C -- sim --> X2[409]
  C -- não --> D[leito.ocupar]
  D -- status ≠ LIVRE --> X3[409 LeitoIndisponivelError]
  D -- ok --> E[Internacao.iniciar]
  E --> F[leitos.salvar<br/>UPDATE ... WHERE versao = lida]
  F -- 0 linhas: outra transação venceu --> X4[409 concorrência]
  F -- ok --> G[internacoes.salvar<br/>índice único parcial: 1 ATIVA por leito]
  G --> H[outbox: PacienteInternado + auditoria]
  H --> K[[Commit]]
  K --> L([201])

  M([PATCH /api/internacoes/:id/alta]) --> T2[[Início da transação]]
  T2 --> N[internacao.registrarAlta → ENCERRADA]
  N --> P[leito.liberarParaHigienizacao → HIGIENIZACAO]
  P --> Q[salvar internação + leito versionado]
  Q --> R[outbox: AltaRegistrada + auditoria]
  R --> K2[[Commit — se qualquer passo falhar, nada muda]]
  K2 --> S([200])
  K2 -.após commit.-> F1[Faturamento: diárias na conta]
  K2 -.após commit.-> F2[Relatórios: ProjecaoOcupacao]
  S --> U2[Enfermagem/gestor: PATCH /leitos/:id/liberar → LIVRE]
```

## 3. Finalizar atendimento (eventos para módulos de saída)

```mermaid
sequenceDiagram
  actor Med as Médico
  participant A as FinalizarAtendimentoUseCase
  participant Ag as Atendimento (agregado)
  participant O as Outbox
  participant F as Faturamento (handler)
  participant N as Notificações (handler)
  participant R as Relatórios (handler)
  Med->>A: PATCH /api/atendimentos/:id/finalizar
  A->>Ag: finalizar() — exige ≥1 registro clínico
  A->>O: AtendimentoFinalizado (mesma transação)
  A-->>Med: 200
  O-)F: lança CONSULTA (+TRIAGEM) na conta — idempotente por eventId
  O-)N: e-mail sem conteúdo clínico — idempotente por eventId
  O-)R: ProjecaoProducao (upsert)
  Note over Ag,R: Atendimento não importa Faturamento, Notificações nem Relatórios
```
