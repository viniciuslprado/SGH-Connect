# ADR-02 — Particionamento por domínio, com camadas dentro de cada módulo

- **Status:** aceita
- **Contexto:** em um particionamento técnico (controllers/, services/, repositories/ globais), uma mudança em "internação" toca as três pastas e se mistura com outros assuntos.
- **Decisão:** o primeiro nível é o domínio (`modules/internacao`, `modules/agendamento`...). Dentro de cada módulo: `api → application → domain ← infrastructure`, mais `contracts/`.
- **Alternativas consideradas:** arquitetura em camadas tradicional.
- **Consequências e trade-offs:** (+) alta coesão, mudança localizada, linguagem do hospital no código. (−) algum código de infraestrutura se repete entre módulos (ex.: mapeadores Prisma) — aceitável, pois duplicar infraestrutura é mais barato do que acoplar domínios.
- **Onde ver no código:** regra `dominio-sem-framework` em `.dependency-cruiser.cjs`; ex.: `modules/internacao/domain/leito.ts` não importa NestJS nem Prisma.
