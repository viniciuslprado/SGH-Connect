# SGH Connect — Sistema Integrado de Gestão Hospitalar

Trabalho da disciplina **Arquitetura de Software** (Uni-FACEF, 6º semestre, Prof. Carlos Alberto Lucas).
O objetivo é demonstrar **coesão, acoplamento e conascência** (Richards & Ford, *Fundamentos da Arquitetura de Software*)
em um sistema funcional. **Projeto acadêmico: use somente dados fictícios.**

- Documento arquitetural: [`docs/SGH_Connect_Documentacao_Arquitetural.pdf`](docs/SGH_Connect_Documentacao_Arquitetural.pdf) (editável em `.docx`)
- Evidências (critério → arquivo → teste): [`EVIDENCIAS_ARQUITETURA.md`](EVIDENCIAS_ARQUITETURA.md)
- Decisões: [`docs/adr/`](docs/adr) · Diagramas: [`docs/diagramas/`](docs/diagramas)

## Arquitetura em uma frase

**Monólito modular** (um deploy) com **nove módulos de domínio**. Entre módulos, só se importa `contracts/`
(interfaces, DTOs e eventos); efeitos colaterais viajam por **eventos de domínio com outbox transacional**.
As fronteiras são verificadas automaticamente por `npm run arch:check`.

| Módulo | Pasta | Responsabilidade |
|---|---|---|
| Identidade e Acesso | `apps/api/src/modules/identidade` | login, JWT, perfis (RBAC) |
| Pacientes | `apps/api/src/modules/pacientes` | cadastro único do paciente, CPF |
| Corpo Clínico | `apps/api/src/modules/corpo-clinico` | médicos e enfermeiros |
| Agendamento | `apps/api/src/modules/agendamento` | agenda sem conflito de horário |
| Atendimento | `apps/api/src/modules/atendimento` | triagem, prontuário, finalização |
| Internação e Leitos | `apps/api/src/modules/internacao` | mapa de leitos, internação, transferência, alta |
| Faturamento | `apps/api/src/modules/faturamento` | conta hospitalar gerada por eventos |
| Notificações | `apps/api/src/modules/notificacoes` | e-mail (simulado) ao paciente |
| Relatórios | `apps/api/src/modules/relatorios` | indicadores a partir de projeções próprias |
| Kernel | `apps/api/src/shared` | transação, erros, eventos/outbox, auditoria |
| Compartilhado API + Web | `packages/shared` | enums e value object `Cpf` |

## Como rodar (do zero)

Pré-requisitos: **Node.js 20+** e **Docker Desktop** (para o PostgreSQL).

```powershell
npm install
```

```powershell
npm run db:up
```

```powershell
Copy-Item .env.example apps/api/.env
```

```powershell
npm run db:migrate
```

```powershell
npm run seed
```

```powershell
npm run dev
```

- Web: http://localhost:5173
- API: http://localhost:3333/api · **Swagger:** http://localhost:3333/api/docs

> O PostgreSQL do projeto sobe na porta **5433** (para não colidir com um PostgreSQL local na 5432).
> O `db:up` também cria o banco `sgh_test`, usado só pelos testes e2e.

### Usuários do seed (senha de todos: `sgh@2026`)

| Perfil | E-mail |
|---|---|
| Administrador | `admin@sgh.local` |
| Recepcionista | `recepcao@sgh.local` |
| Médico | `medico@sgh.local` · `medica@sgh.local` |
| Enfermeiro | `enfermeiro@sgh.local` |
| Gestor de leitos | `leitos@sgh.local` |
| Faturista | `faturamento@sgh.local` |

O seed cria também 5 profissionais, 15 pacientes fictícios (CPFs válidos gerados), 20 leitos em 3 alas e 8 consultas para o dia seguinte.

## Testes e verificações

```powershell
npm test
```

Roda, em ordem: testes do `packages/shared` (Vitest), unitários da API (Jest, sem banco), **e2e da API** (Jest + Supertest contra `sgh_test`) e testes do web (Vitest).

```powershell
npm run arch:check
```

Verifica as fronteiras entre módulos (dependency-cruiser). `npm run arch:demo` mostra a regra **reprovando** uma violação proposital, e `npm run arch:mermaid` regenera o diagrama de dependências a partir do código real.

## Roteiro de demonstração (apresentação)

1. Entre como **recepção** → Agenda → agende uma consulta; tente outra no mesmo horário e mesmo médico → mensagem de **conflito (409)**.
2. Entre como **médico** → Atendimentos → abrir → prontuário → registro clínico → **Finalizar**. Tente registrar de novo → bloqueado (**422**).
3. Entre como **faturista** → Contas: a conta apareceu sozinha (evento `AtendimentoFinalizado`), sem o Atendimento conhecer o Faturamento.
4. Entre como **gestor de leitos** → Leitos → internar → **Alta** → leito vai para higienização → Liberar.
5. Entre como **admin** → Notificações (e-mails simulados), Auditoria (inclui `PRONTUARIO_LIDO`, sem texto clínico) e Início (relatórios).
6. Terminal: `npm run arch:check` (limpo) e `npm run arch:demo` (reprova a violação).

## Estrutura

```
sgh-connect/
├── apps/api/            NestJS + Prisma (monólito modular)
│   ├── src/modules/     9 módulos: api/ application/ domain/ infrastructure/ contracts/
│   ├── src/shared/      kernel: prisma, transação, erros, eventos/outbox, auditoria
│   ├── prisma/          schema (um schema por módulo), migrações e seed
│   └── test/            e2e e fixture de violação arquitetural
├── apps/web/            React + Vite (src/modules/* espelha os módulos da API)
├── packages/shared/     enums + Cpf (mesmo código na API e no web)
├── docs/                documento arquitetural, ADRs, diagramas
└── .dependency-cruiser.cjs
```
