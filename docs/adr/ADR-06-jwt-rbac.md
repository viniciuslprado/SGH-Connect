# ADR-06 — JWT com RBAC e auditoria

- **Status:** aceita
- **Contexto:** dados de saúde exigem controle de acesso por função (LGPD, art. 11).
- **Decisão:** JWT (8 h) emitido pelo módulo Identidade; dois guards globais — `AutenticacaoGuard` (401) e `PerfisGuard` (403) — e o decorator `@Perfis()` em cada rota. Prontuário só para MEDICO/ENFERMEIRO, com leitura auditada. A auditoria (`shared/auditoria`) registra ator, ação, entidade e data, nunca texto clínico.
- **Alternativas consideradas:** sessão em servidor (rejeitado: estado na API dificulta escalar horizontalmente).
- **Consequências e trade-offs:** (+) API sem estado, regras de acesso declarativas e testadas (401/403 nos e2e). (−) revogação imediata de token exigiria lista de bloqueio — fora do escopo.
- **Onde ver no código:** `modules/identidade/contracts/index.ts`, `modules/identidade/infrastructure/infraestrutura.ts`, `shared/auditoria/auditoria.ts`.
