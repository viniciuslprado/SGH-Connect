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

## Restrições de trabalho

- Projeto acadêmico: use **somente dados fictícios**. Não apresente o sistema como pronto para uso assistencial real.
- **Antes de escrever código**, apresente o plano por etapas, a estrutura de pastas e o diagrama de dependências
  entre módulos, conferindo com a Figura 3 do documento. Depois execute de forma incremental.
- **Não invente evidências.** Só registre resultados de testes e comandos que você realmente executou.
  Não diga que algo está concluído sem rodar as validações.
- Não altere arquivos `.env` existentes sem minha autorização. Forneça um `.env.example` sem segredos.
- **Não crie interfaces vazias** só para parecer desacoplado. Contratos só onde há dependência real entre módulos
  (as listadas na seção 6.1 do documento).
- Controllers finos: validação de entrada e chamada ao caso de uso. Regra de negócio fica no domínio, nunca no front-end.

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
13. **Registro clínico só em atendimento aberto** (conascência de execução): a regra fica em
    `Atendimento.registrarEvolucao()` no domínio; atendimento finalizado rejeita com erro de domínio → HTTP 422.
14. **Alta é atômica** (conascência temporal): encerrar a internação e colocar o leito em HIGIENIZACAO
    acontecem na **mesma transação**, junto com o evento `AltaRegistrada` no outbox.
15. **Datas** trafegam em **ISO 8601 UTC** em toda a API (conascência de convenção explícita e documentada no Swagger).
16. **Auditoria** de ações relevantes (login, criar/cancelar consulta, abrir/finalizar atendimento, leitura de prontuário,
    internar, alta, fechar conta): porta `RegistroAuditoria` em `apps/api/src/shared/auditoria/`, gravando
    ator, ação, entidade, entidadeId e data — **nunca o texto clínico**. Consulta em `GET /api/auditoria` (só ADMIN).
17. **Erros uniformes:** filtro global que converte erros de domínio e de validação em
    `{ statusCode, erro, mensagem, detalhes? }` com mensagens claras em português (400, 401, 403, 404, 409, 422).

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

Conflito de agenda e leito já ocupado retornam **409**. Inativar em vez de excluir registros com histórico
(pacientes e profissionais).

API documentada com **Swagger** em `/api/docs` (DTOs anotados, autenticação Bearer configurada).

Web: login e logout; **menu lateral** filtrado por perfil; telas de pacientes, profissionais, agenda, atendimento,
mapa de leitos (cores por `StatusLeito`), contas, notificações, auditoria (ADMIN) e um dashboard de relatórios.
Toda listagem/formulário tem estados de **carregando, erro e vazio**; ações destrutivas (cancelar consulta, alta,
fechar conta) pedem **confirmação**. Layout responsivo. Visual limpo, em português.

## Seed

`npm run seed` cria: 1 usuário por perfil (senha documentada no README, ex.: `sgh@2026`), 5 profissionais,
15 pacientes com CPFs válidos fictícios, 20 leitos em 3 alas e algumas consultas futuras.

## Testes que precisam existir (evidências para o professor)

- Domínio: conflito de agenda; `Leito.ocupar()` em leito não livre; `Cpf` válido/inválido.
- Domínio: atendimento finalizado não aceita registro clínico.
- Caso de uso: `InternarPacienteUseCase` com repositórios em memória (sem banco).
- Integração (e2e com banco de teste):
  - agendamento conflitante → **409**;
  - sem token → **401**; perfil sem permissão (ex.: RECEPCIONISTA lendo prontuário) → **403**;
  - entrada inválida (CPF inválido, data mal formatada) → **400** com mensagem clara;
  - duas internações **concorrentes** no mesmo leito (`Promise.all`) → uma 201 e uma **409**;
  - alta encerra a internação e muda o leito na mesma transação (se a segunda escrita falhar, nada muda);
  - auditoria registrada sem texto clínico.
- Idempotência: mesmo `AtendimentoFinalizado` entregue 2x gera itens 1x na conta.
- Arquitetura: `npm run arch:check` passa; crie um teste/demonstração que mostre a regra falhando se violada.

## Scripts na raiz

`npm run dev` (api + web), `npm test`, `npm run arch:check`, `npm run seed`, `npm run db:up` (docker compose).

## Documentação a gerar no repositório

- `README.md`: como rodar (passo a passo do zero), usuários do seed, mapa módulo → pasta, link para o documento.
- `docs/adr/ADR-01..ADR-07.md`: copie as decisões da seção 8 do documento (contexto, decisão, alternativas, consequências).
- `docs/diagramas/*.md` em **Mermaid**, conferidos com o código real: módulos e dependências, sequência do
  agendamento e fluxo de internação/alta.
- `EVIDENCIAS_ARQUITETURA.md` (raiz) com a tabela
  **critério | arquivo/caminho | trecho | justificativa | teste | status comprovado**, cobrindo coesão, acoplamento,
  cada tipo de conascência da seção 7 do documento e a seção 12 (rastreabilidade). Inclua a saída real de
  `npm test` e `npm run arch:check`, o grafo do dependency-cruiser (`depcruise --output-type dot`) e uma
  **lista de capturas de tela** a tirar (qual tela/arquivo, o que deve aparecer, para qual seção do documento).

## Ordem de trabalho

1. Monorepo, docker-compose, Prisma com schemas, `packages/shared`, dependency-cruiser **já com as regras**.
2. Kernel `shared/` (eventos, outbox, worker, filtro de erros, auth guard, auditoria) e Swagger.
3. Identidade → Pacientes → Corpo Clínico.
4. Agendamento → Atendimento → Internação.
5. Faturamento → Notificações → Relatórios (só via eventos).
6. Front-end por módulo.
7. Seed, testes, README, ADRs, evidências.

Ao final de cada etapa: rode testes e `arch:check`, faça um commit com mensagem clara, e me diga
o que foi implementado, como executar/verificar, quais testes foram **realmente** rodados e o que ficou pendente.
Ao terminar, liste qualquer ponto em que o código **diverge** do documento para eu ajustar a documentação.
