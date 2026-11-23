# ADR-07 — Síntese dos trade-offs aceitos

Richards e Ford: "tudo em arquitetura de software é um trade-off". Os principais trade-offs aceitos no SGH Connect:

- **Consistência eventual** nos módulos de saída (Faturamento, Notificações, Relatórios) em troca de **baixo acoplamento** com os módulos clínicos.
- **Implantação única** em troca de **simplicidade operacional** e transações locais.
- **Mais arquivos** (contracts, DTOs, mapeadores) em troca de **fronteiras explícitas e verificáveis** (`npm run arch:check`).
- **Ausência de FKs entre módulos** em troca de **autonomia de dados** e possibilidade de extração futura.
- **Valores monetários em centavos inteiros** no domínio do Faturamento em troca de conversões na borda (evita erro de ponto flutuante).
