# ADR-03 — Contratos públicos (`contracts/`)

- **Status:** aceita
- **Contexto:** sem fronteira explícita, qualquer classe pode ser importada por qualquer módulo e o acoplamento cresce sem ser notado.
- **Decisão:** cada módulo expõe apenas interfaces, DTOs e eventos em `contracts/`. Dependências síncronas são interfaces injetadas por token (`PACIENTES_API`, `CORPO_CLINICO_API`). O resto é privado.
- **Alternativas consideradas:** confiar na disciplina da equipe (rejeitado: não é verificável).
- **Consequências e trade-offs:** (+) acoplamento visível e controlado, refatoração interna livre, dublês fáceis nos testes. (−) um pouco mais de código (DTOs e mapeadores). Interfaces só onde há dependência real — não há interfaces vazias.
- **Onde ver no código:** `modules/pacientes/contracts/index.ts`, `modules/corpo-clinico/contracts/index.ts`; regra `somente-contratos-entre-modulos`; demonstração de violação em `apps/api/test/arch-fixture` (`npm run arch:demo`).
