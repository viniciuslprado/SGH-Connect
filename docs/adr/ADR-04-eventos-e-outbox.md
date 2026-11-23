# ADR-04 — Eventos de domínio com outbox transacional

- **Status:** aceita
- **Contexto:** Faturamento, Notificações e Relatórios precisam reagir a fatos clínicos, mas os módulos clínicos não devem depender deles.
- **Decisão:** casos de uso gravam o evento na tabela `shared.OutboxEvento` **na mesma transação** da mudança de estado. O `OutboxWorker` entrega após o commit (`FOR UPDATE SKIP LOCKED`), via `@nestjs/event-emitter`. Consumidores são idempotentes por `eventId`.
- **Alternativas consideradas:** chamadas diretas (rejeitado: inverte dependências e cria ciclos); fila externa como RabbitMQ (adiado: custo operacional sem necessidade atual).
- **Consequências e trade-offs:** (+) acoplamento mínimo e extensibilidade (novo consumidor não altera o emissor). (−) consistência eventual entre módulos (a conta aparece ~0,5 s depois) e fluxo mais difícil de seguir — mitigado pelo log do worker e pelo `eventId`.
- **Onde ver no código:** `apps/api/src/shared/eventos/`; emissores em `*/application/*`; consumidores com `@AoReceberEvento` em `faturamento`, `notificacoes`, `relatorios`.
