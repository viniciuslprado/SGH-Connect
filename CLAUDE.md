# SGH Connect

Trabalho de Arquitetura de Software (Uni-FACEF). A arquitetura está definida em
`docs/SGH_Connect_Documentacao_Arquitetural.docx` e as instruções de implementação em `PROMPT_IMPLEMENTACAO.md`.

Regras principais (detalhes no prompt):
- Monólito modular: `apps/api/src/modules/<modulo>/{api,application,domain,infrastructure,contracts}`.
- Entre módulos, importe só `contracts/`. Sem ciclos. `domain/` não importa NestJS nem Prisma.
- Um schema Prisma por módulo, sem FKs entre schemas.
- Faturamento, Notificações e Relatórios só reagem a eventos (outbox + handlers idempotentes).
- Enums e `Cpf` ficam em `packages/shared`; nada de strings mágicas de status.
- Se o código precisar divergir do documento, avise: documento e código têm que bater.
