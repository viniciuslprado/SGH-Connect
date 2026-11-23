# Prompt de implementação — SGH Connect

> Cole este arquivo inteiro para o Claude (ou diga: "leia `PROMPT_IMPLEMENTACAO.md` e implemente").
> A documentação de referência é `docs/SGH_Connect_Documentacao_Arquitetural.pdf` (ou `.docx`).

---

## Papel e objetivo

Você vai implementar o **SGH Connect — Sistema Integrado de Gestão Hospitalar**, um trabalho da disciplina
de Arquitetura de Software (Uni-FACEF, Prof. Carlos Alberto Lucas). A nota **não** avalia a tecnologia nem a
quantidade de telas, e sim se o código **materializa** as decisões do documento arquitetural:
**alta coesão, baixo acoplamento e conascência controlada** (Richards & Ford, *Fundamentos da Arquitetura de Software*).

Antes de escrever código, leia `docs/SGH_Connect_Documentacao_Arquitetural.docx`
(use `pandoc -t markdown` ou equivalente). As seções 4 a 9 e a 12 (rastreabilidade) são o contrato.
**Se precisar desviar de algo do documento, pare e me avise**: o documento e o código precisam bater.

Entrega: 26/11/2026 às 17h. Priorize uma aplicação **funcionando de ponta a ponta** em vez de muitas telas.

## Stack (obrigatória)

- Monorepo com **npm workspaces**: `apps/api`, `apps/web`, `packages/shared`
- API: **Node.js 20+ / NestJS 10 / TypeScript estrito**
- Banco: **PostgreSQL 16** via `docker-compose.yml` + **Prisma** com `multiSchema` (um schema por módulo)
- Eventos: `@nestjs/event-emitter` + tabela **outbox** + worker com `setInterval` no mesmo processo
- Auth: `@nestjs/jwt` + `bcrypt`; RBAC com decorator `@Perfis()` e `PerfisGuard`
- Web: **React 18 + Vite + TypeScript**, React Router, TanStack Query, CSS simples (sem framework pesado)
- Testes: **Jest** (api), **Vitest** (web/shared)
- Fronteiras: **dependency-cruiser** (`npm run arch:check`)

## Estrutura obrigatória

```
sgh-connect/
├── apps/api/src/
│   ├── main.ts, app.module.ts
│   ├── shared/                      # kernel: eventos, outbox, erros, prisma, auth guard base
│   │   └── eventos/                 # EventBus, OutboxService, OutboxWorker, DomainEvent
│   └── modules/
│       ├── identidade/  pacientes/  corpo-clinico/
│       ├── agendamento/ atendimento/ internacao/
│       └── faturamento/ notificacoes/ relatorios/
│           (cada um: api/ application/ domain/ infrastructure/ contracts/ + <modulo>.module.ts)
├── apps/web/src/modules/<mesmos módulos>/   # páginas, hooks, chamadas HTTP do módulo
├── packages/shared/src/              # enums.ts, cpf.ts (usados por api e web)
├── docs/                             # documento, diagramas, adr/
├── docker-compose.yml
└── .dependency-cruiser.cjs
```

## Regras arquiteturais (não negociáveis)

1. **Um módulo só importa `contracts/` de outro módulo.** Nunca `domain/`, `application/` ou `infrastructure/` alheios.
   Configure o dependency-cruiser para falhar nisso e também em **ciclos** e em `domain/` importando `@nestjs/*` ou `@prisma/*`.
2. **Camadas internas:** `api → application → domain ← infrastructure`. O domínio é TypeScript puro.
3. **Contratos síncronos** são interfaces injetadas por token:
   `PacientesApi` (token `PACIENTES_API`) e `CorpoClinicoApi` (token `CORPO_CLINICO_API`).
   O módulo dono registra a implementação; o consumidor depende só da interface.
4. **Dados privados:** cada módulo tem seu schema Prisma (`@@schema("pacientes")` etc.).
   **Sem relações Prisma/FKs entre schemas**; referências entre módulos são `pacienteId: string` etc.
5. **Eventos de domínio** (tipos em `contracts/` do emissor), gravados no **outbox na mesma transação**
   do caso de uso e despachados pelo worker **só após o commit**:
   - Agendamento: `ConsultaAgendada`, `ConsultaCancelada`
   - Atendimento: `AtendimentoFinalizado`
   - Internação: `PacienteInternado`, `AltaRegistrada`
   Todo evento tem `eventId`, `ocorridoEm` e payload tipado.
6. **Faturamento, Notificações e Relatórios não são chamados por ninguém** — só reagem a eventos.
   Handlers **idempotentes** (tabela `EventoProcessado` com `eventId` único).
7. **Um caso de uso = uma classe com `executar(command)`**. Nada de `HospitalService`, `Utils`, `Helpers`.
8. **Comandos como objetos** (conascência de posição → nome). Ex.: `AgendarConsultaCommand`.
9. **Enums em `packages/shared`** (conascência de convenção eliminada): `StatusLeito`, `StatusConsulta`,
   `ClassificacaoRisco`, `Perfil`, `StatusConta`, `TipoProfissional`. Proibido string mágica de status.
10. **`Cpf` value object em `packages/shared`**, usado na API **e** no formulário web (conascência de algoritmo eliminada).
11. **Internar paciente** é um único caso de uso transacional: obter leito → `leito.ocupar()` → criar internação →
    salvar → outbox. Leito tem coluna `versao` (lock otimista); conflito retorna **409**.
12. `PacienteResumoDto` expõe CPF **mascarado**; CPF completo só dentro do módulo Pacientes.

## Módulos e funcionalidades mínimas

| Módulo | Endpoints (prefixo `/api`) | Regras |
|---|---|---|
| Identidade | `POST /auth/login`, `GET /auth/me`, `POST /usuarios` (ADMIN) | bcrypt, JWT 8h, perfis: ADMIN, RECEPCIONISTA, MEDICO, ENFERMEIRO, GESTOR_LEITOS, FATURISTA |
| Pacientes | CRUD `/pacientes`, busca por nome/CPF | CPF único e válido |
| Corpo Clínico | CRUD `/profissionais` | registro (CRM/COREN), especialidade, ativo |
| Agendamento | `POST /consultas`, `PATCH /consultas/:id/cancelar`, `GET /consultas?profissionalId&data` | sem sobreposição de horário por profissional (regra no domínio); valida paciente/profissional via contratos |
| Atendimento | `POST /atendimentos`, `PATCH /:id/triagem`, `PATCH /:id/registro-clinico`, `PATCH /:id/finalizar` | prontuário só MEDICO/ENFERMEIRO; log de auditoria de leitura; finalizar publica `AtendimentoFinalizado` com procedimentos |
| Internação | `GET /leitos` (mapa), `POST /internacoes`, `PATCH /internacoes/:id/transferir`, `PATCH /internacoes/:id/alta` | alta deixa leito em HIGIENIZACAO; `PATCH /leitos/:id/liberar` |
| Faturamento | `GET /contas?pacienteId`, `PATCH /contas/:id/fechar` | abre conta e lança itens a partir dos eventos; tabela de preços simples em código do módulo |
| Notificações | `GET /notificacoes` | adaptador `CanalNotificacao`; em dev, `ConsoleEmailAdapter` grava no banco e loga |
| Relatórios | `GET /relatorios/ocupacao`, `/producao`, `/consultas` | projeções próprias atualizadas por eventos (sem JOIN em outros schemas) |

Web: login; menu por perfil; telas de pacientes, profissionais, agenda, atendimento, mapa de leitos
(cores por `StatusLeito`), contas, notificações e um dashboard de relatórios. Visual limpo, em português.

## Seed

`npm run seed` cria: 1 usuário por perfil (senha documentada no README, ex.: `sgh@2026`), 5 profissionais,
15 pacientes com CPFs válidos fictícios, 20 leitos em 3 alas e algumas consultas futuras.

## Testes que precisam existir (evidências para o professor)

- Domínio: conflito de agenda; `Leito.ocupar()` em leito não livre; `Cpf` válido/inválido.
- Caso de uso: `InternarPacienteUseCase` com repositórios em memória (sem banco).
- Concorrência: duas internações no mesmo leito → uma recebe 409.
- Idempotência: mesmo `AtendimentoFinalizado` entregue 2x gera itens 1x na conta.
- Arquitetura: `npm run arch:check` passa; crie um teste/demonstração que mostre a regra falhando se violada.

## Scripts na raiz

`npm run dev` (api + web), `npm test`, `npm run arch:check`, `npm run seed`, `npm run db:up` (docker compose).

## Documentação a gerar no repositório

- `README.md`: como rodar (passo a passo do zero), usuários do seed, mapa módulo → pasta, link para o documento.
- `docs/adr/ADR-01..ADR-07.md`: copie as decisões da seção 8 do documento (contexto, decisão, alternativas, consequências).
- `docs/evidencias.md`: saída de `npm test` e `npm run arch:check`, e o grafo do dependency-cruiser
  (`depcruise --output-type dot` → SVG/PNG se possível), para eu colocar prints no documento.

## Ordem de trabalho

1. Monorepo, docker-compose, Prisma com schemas, `packages/shared`, dependency-cruiser **já com as regras**.
2. Kernel `shared/` (eventos, outbox, worker, erros, auth guard).
3. Identidade → Pacientes → Corpo Clínico.
4. Agendamento → Atendimento → Internação.
5. Faturamento → Notificações → Relatórios (só via eventos).
6. Front-end por módulo.
7. Seed, testes, README, ADRs, evidências.

Ao final de cada etapa: rode testes e `arch:check`, faça um commit com mensagem clara, e me diga o que mudou.
Ao terminar, liste qualquer ponto em que o código **diverge** do documento para eu ajustar a documentação.
