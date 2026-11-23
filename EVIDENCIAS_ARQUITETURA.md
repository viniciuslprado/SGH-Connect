# Evidências arquiteturais — SGH Connect

Cada linha liga um critério da avaliação a um arquivo real, ao teste que o comprova e ao status **efetivamente observado**
na execução de 23/11/2026 (`npm test`, `npm run arch:check`, `npm run arch:demo`). Saídas reais estão no fim do arquivo.

Caminhos relativos a `apps/api/src/modules/` quando não indicado.

## 1. Coesão

| Critério | Arquivo / caminho | Trecho | Justificativa | Teste | Status |
|---|---|---|---|---|---|
| Módulos por domínio | `apps/api/src/modules/*` (9 pastas) | `identidade/ pacientes/ corpo-clinico/ agendamento/ atendimento/ internacao/ faturamento/ notificacoes/ relatorios/` | Particionamento por subdomínio do hospital (ADR-02) | `arquitetura.e2e-spec.ts` | ✅ |
| Regra de agenda no domínio | `agendamento/domain/consulta.ts` | `garantirSemConflito(agenda)` | A regra mora junto dos dados que usa (horário, profissional) — coesão funcional | `consulta.spec.ts` (5 testes) | ✅ |
| Regra de ocupação no domínio | `internacao/domain/leito.ts` | `ocupar()`, `liberarParaHigienizacao()` | Leito e Internação mudam juntos → mesmo módulo | `internar-paciente.use-case.spec.ts` | ✅ |
| Coesão sequencial | `atendimento/domain/atendimento.ts` | `registrarTriagem → registrarEvolucao → finalizar` | Saída de um passo alimenta o próximo | `atendimento.spec.ts` (5 testes) | ✅ |
| Dinheiro só no Faturamento | `faturamento/domain/conta.ts` | `PRECO_BASE_CENTAVOS`, `PERCENTUAL_CONVENIO` | Módulos clínicos não conhecem preço; mudança de convênio toca 1 pasta | `conta.spec.ts` (3 testes) | ✅ |
| Sem serviço genérico | toda a API | não existe `HospitalService`, `Utils`, `Helpers` | Comandos são uma classe com `executar()` (ex.: `InternarPacienteUseCase`) | revisão de código | ✅ |
| Domínio sem framework | `*/domain/*.ts` | nenhum import de `@nestjs` ou `@prisma` | Regra `dominio-sem-framework` | `npm run arch:check` | ✅ |
| Web com as mesmas fronteiras | `apps/web/src/modules/*` | uma pasta por módulo | Coesão também na interface | `api.spec.ts` (web) | ✅ |

## 2. Acoplamento

| Critério | Arquivo / caminho | Trecho | Justificativa | Teste | Status |
|---|---|---|---|---|---|
| Só contratos entre módulos | `.dependency-cruiser.cjs` | regra `somente-contratos-entre-modulos` | Interior dos módulos é privado | `npm run arch:check` → 0 violações | ✅ |
| Regra é verificável (falha se violada) | `apps/api/test/arch-fixture/` | `agendamento/application/viola-fronteira.ts` importa `pacientes/domain` | Fitness function, não só documentação | `arquitetura.e2e-spec.ts` + `npm run arch:demo` → 1 erro | ✅ |
| Sem ciclos | `.dependency-cruiser.cjs` | regra `sem-ciclos` | Princípio das Dependências Acíclicas | `npm run arch:check` | ✅ |
| Contrato + DI | `pacientes/contracts/index.ts`, `pacientes/pacientes.module.ts` | `PACIENTES_API` → `PacientesApiImpl` | Consumidor depende da interface | e2e de agendamento | ✅ |
| Eventos em vez de chamadas | `atendimento/application/casos-de-uso.ts` | `outbox.adicionar(criarEvento(ATENDIMENTO_FINALIZADO, …), tx)` | Atendimento não importa Faturamento/Notificações | e2e "Faturamento reage ao evento…" | ✅ |
| Módulos de saída com Ca = 0 | `docs/diagramas/modulos-dependencias-reais.md` | tabela gerada do código | Faturamento, Notificações e Relatórios: Ca 0, I = 1,00 | `npm run arch:mermaid` | ✅ |
| Schema por módulo, sem FK cruzada | `apps/api/prisma/schema.prisma` | `@@schema("internacao")` etc. | Autonomia de dados (ADR-05) | migração aplicada | ✅ |
| Relatórios sem JOIN em outros módulos | `relatorios/infrastructure/projecoes.repositorio.ts` | só `projecao*` | Projeções próprias alimentadas por eventos | e2e "AltaRegistrada … projeção" | ✅ |
| DTO mínimo (CPF mascarado) | `pacientes/application/casos-de-uso.ts` | `cpfMascarado: p.cpf.mascarado()` | Menos dados expostos = menos acoplamento | revisão + `cpf.spec.ts` | ✅ |

## 3. Conascência

| Tipo | Arquivo / caminho | Trecho | Classificação → decisão | Teste | Status |
|---|---|---|---|---|---|
| Nome | `pacientes/contracts/index.ts` | `PacientesApi.buscarResumo(id)` | Estática, a mais fraca → **mantida** (contrato estável, Ca = 5) | e2e agendamento/internação | ✅ |
| Tipo | `atendimento/contracts/index.ts` | `AtendimentoFinalizadoPayload` tipado | Estática, fraca → **mantida**, verificada pelo TypeScript | `tsc` sem erros | ✅ |
| Convenção (significado) | `packages/shared/src/enums.ts` | `enum StatusLeito { LIVRE, OCUPADO, HIGIENIZACAO, MANUTENCAO }` | Estática → **eliminada** (sem strings mágicas); datas em ISO 8601 UTC | `api.spec.ts` (todo status tem rótulo) | ✅ |
| Posição | `agendamento/application/agendar-consulta.command.ts` | `AgendarConsultaCommand { pacienteId, profissionalId, inicio, duracaoMin }` | Estática, forte → **reduzida para nome** | e2e agendamento | ✅ |
| Algoritmo | `packages/shared/src/cpf.ts` | `digitoVerificador()` único, usado em API e web | Estática, forte → **eliminada** | `cpf.spec.ts` + `api.spec.ts` (web) + e2e 400 | ✅ |
| Execução | `atendimento/domain/atendimento.ts`; `internacao/application/internar-paciente.use-case.ts` | `garantirAberto()`; sequência ocupar → iniciar → salvar → outbox | Dinâmica → **reduzida e confinada** a um agregado/caso de uso | e2e 422; `internar-paciente.use-case.spec.ts` | ✅ |
| Temporal | `internacao/infrastructure/repositorios.ts`; `shared/eventos/outbox.worker.ts`; `faturamento/infrastructure/prisma-conta.repositorio.ts` | `UPDATE … WHERE versao`; índice único parcial; outbox pós-commit; `marcarEventoProcessado` | Dinâmica, forte → **reduzida** | e2e concorrência (201/409), alta atômica, idempotência | ✅ |

## 4. Segurança e qualidade

| Critério | Arquivo | Teste | Status |
|---|---|---|---|
| 401 sem token / token inválido | `identidade/infrastructure/infraestrutura.ts` (`AutenticacaoGuard`) | e2e "sem token → 401", "token inválido → 401" | ✅ |
| 403 perfil sem permissão | `PerfisGuard` + `@Perfis()` | e2e recepcionista→prontuário, médico→fechar conta | ✅ |
| 400 com mensagens claras | `shared/erros/filtro-erros.ts` + DTOs | e2e CPF inválido, data fora do ISO 8601 | ✅ |
| 409 conflito de agenda (inclusive simultâneo) | `agendamento/*` | e2e conflito e `Promise.all` | ✅ |
| 409 leito (inclusive concorrente) | `internacao/*` | e2e `Promise.all` → [201, 409] | ✅ |
| Alta atômica | `internacao/application/casos-de-uso.ts` (`RegistrarAltaUseCase`) | e2e falha simulada → nada muda | ✅ |
| Auditoria sem texto clínico | `shared/auditoria/auditoria.ts` | e2e "auditoria registra as ações SEM o texto clínico" | ✅ |
| Swagger | `apps/api/src/configurar-app.ts` | http://localhost:3333/api/docs | ✅ (verificado manualmente) |

## 5. Saídas reais dos comandos (23/11/2026)

`npm test`:

```
packages/shared   ✓ src/cpf.spec.ts (4 tests)                     Test Files 1 passed
apps/api (unit)   PASS atendimento.spec.ts · conta.spec.ts · consulta.spec.ts · internar-paciente.use-case.spec.ts
                  Test Suites: 4 passed, 4 total   Tests: 18 passed, 18 total
apps/api (e2e)    PASS test/sgh.e2e-spec.ts · test/arquitetura.e2e-spec.ts
                  Test Suites: 2 passed, 2 total   Tests: 22 passed, 22 total
apps/web          ✓ src/shared/api.spec.ts (4 tests)              Test Files 1 passed
TOTAL: 48 testes, 0 falhas
```

Testes e2e (nomes exatos):

```
Segurança (RBAC) e validação de entrada
  √ sem token → 401 com mensagem clara
  √ token inválido → 401
  √ perfil sem permissão → 403 (recepcionista tentando ler prontuário)
  √ perfil sem permissão → 403 (médico tentando fechar conta)
  √ CPF inválido → 400 com mensagem do value object compartilhado
  √ data fora do ISO 8601 e campo desconhecido → 400 com lista de detalhes
  √ CPF duplicado → 409
Agendamento — conflito de horário
  √ agendamento conflitante para o mesmo profissional → 409
  √ dois agendamentos SIMULTÂNEOS no mesmo horário: um 201 e um 409
  √ publica ConsultaAgendada pelo outbox, gerando notificação e projeção
Atendimento — conascência de execução
  √ médico registra evolução em atendimento aberto e finaliza
  √ atendimento FINALIZADO não recebe evolução → 422
  √ enfermeiro não pode finalizar atendimento → 403
  √ auditoria registra as ações SEM o texto clínico
  √ Faturamento reage ao evento e é IDEMPOTENTE (reentrega não duplica itens)
Internação — conascência temporal
  √ duas internações CONCORRENTES no mesmo leito: uma 201 e uma 409
  √ leito ocupado → 409 com mensagem do domínio
  √ alta é ATÔMICA: se um passo falhar, internação e leito não mudam
  √ alta encerra a internação e libera o leito para higienização na mesma transação
  √ AltaRegistrada gera diária na conta e atualiza a projeção de ocupação
Arquitetura (dependency-cruiser)
  √ o código real da API respeita todas as regras
  √ um módulo importando o interior de outro é REPROVADO
```

`npm run arch:check`:

```
✔ no dependency violations found (79 modules, 325 dependencies cruised)
```

`npm run arch:demo` (violação proposital):

```
error somente-contratos-entre-modulos: apps/api/test/arch-fixture/modules/agendamento/application/viola-fronteira.ts → apps/api/test/arch-fixture/modules/pacientes/domain/paciente.ts
x 1 dependency violations (1 errors, 0 warnings).
```

## 6. Capturas de tela para o documento

| # | O que capturar | Como | Seção do documento |
|---|---|---|---|
| 1 | Árvore `apps/api/src/modules` expandida (VS Code) | explorador de arquivos com as 9 pastas e as subpastas de `internacao/` | 4.1 Estrutura de pastas |
| 2 | `npm run arch:check` limpo **e** `npm run arch:demo` com erro | terminal, lado a lado | 6.4 Estratégias (fitness function) |
| 3 | Diagrama gerado do código | abrir `docs/diagramas/modulos-dependencias-reais.md` no VS Code com preview Mermaid ou colar em mermaid.live | 3.3 / 6.1 |
| 4 | `npm test` com 48 testes verdes | terminal | 12 Rastreabilidade |
| 5 | Tela da agenda com a mensagem de conflito | recepção agenda dois horários sobrepostos | 7.5 / 6.3 |
| 6 | Prontuário finalizado + tentativa bloqueada | médico: finalizar e tentar novo registro | 7.7 Execução |
| 7 | Conta gerada sozinha após finalizar | faturista → Contas → Itens | 3.5 / 6.3 eventos |
| 8 | Mapa de leitos (cores) e alta → higienização | gestor de leitos | 7.8 Temporal |
| 9 | Auditoria com `PRONTUARIO_LIDO` | admin → Auditoria | 10 Segurança |
| 10 | Swagger | http://localhost:3333/api/docs | 2.3 Tecnologias |
| 11 | Trechos de código: `enums.ts`, `cpf.ts`, `agendar-consulta.command.ts`, `internar-paciente.use-case.ts`, `repositorios.ts` (UPDATE com versão) | editor | 7.2 a 7.8 |

## 7. Divergências entre código e documento (para ajustar o .docx)

1. **Ce na tabela 6.2:** o documento não contou a dependência de todos os módulos em Identidade (`@Perfis`). Medido no código: Pacientes Ce = 1 (I = 0,17), Corpo Clínico 1 (0,33), Agendamento 3 (0,60), Atendimento 3 (0,50), Internação 2 (0,50), Faturamento/Notificações/Relatórios 4 (1,00). **Ca é idêntico ao documento.** As conclusões (dependências estáveis, sem ciclos) não mudam.
2. **Seção 5.3 ("um método `executar()` por caso de uso"):** vale para os comandos. As consultas de leitura de um mesmo módulo foram agrupadas (ex.: `ConsultarPacientesUseCase.pesquisar/obter`, `GerenciarLeitosUseCase.cadastrar/liberar/manutencao`).
3. **Trecho 7.7:** no código é `this.uow.executar(...)` e `criarEvento(PACIENTE_INTERNADO, {...})` (o documento mostra `uow.transacao` e `new PacienteInternado(...)`). Mesma ideia.
4. **Tabela da seção 4 (Identidade):** o contrato expõe `@Perfis()`, `@Publico()`, `@UsuarioAtual()` e `UsuarioAutenticado`; os guards (`AutenticacaoGuard`, `PerfisGuard`) ficam na infraestrutura do módulo e são registrados globalmente.
5. **Regra nova:** atendimento só pode ser finalizado com ao menos um registro clínico (reforça a conascência de execução).
6. **Tecnologia:** `bcryptjs` (mesmo algoritmo do bcrypt, sem compilação nativa no Windows) e `dependency-cruiser` 17 (a 16 é incompatível com o Node 24). PostgreSQL na porta 5433.
