# ADR-01 — Monólito modular em vez de microsserviços

- **Status:** aceita
- **Contexto:** equipe de três pessoas, prazo curto, carga previsível e forte necessidade de consistência (leitos, contas).
- **Decisão:** uma única unidade implantável (`apps/api`) dividida em nove módulos de domínio (`apps/api/src/modules/*`) com fronteiras rígidas, verificadas por `npm run arch:check`.
- **Alternativas consideradas:** microsserviços (rejeitado: custo operacional, consistência eventual em operações críticas, testes distribuídos); monólito sem módulos (rejeitado: tende ao *big ball of mud*).
- **Consequências e trade-offs:** (+) simplicidade, transações locais, depuração fácil. (−) escala e implantação apenas do sistema inteiro. Mitigação: os módulos se comunicam como serviços (contratos e eventos), permitindo extração futura.
- **Onde ver no código:** `apps/api/src/app.module.ts` (único ponto que conhece todos os módulos).
