# ADR-05 — Um banco, um schema por módulo

- **Status:** aceita
- **Contexto:** banco compartilhado sem regras gera acoplamento de dados: JOINs entre tabelas de módulos diferentes impedem mudar um esquema sem afetar outro.
- **Decisão:** um único PostgreSQL com dez schemas (`shared`, `identidade`, `pacientes`, `corpo_clinico`, `agendamento`, `atendimento`, `internacao`, `faturamento`, `notificacoes`, `relatorios`). Proibidas relações/FKs entre schemas; referências entre módulos são apenas ids.
- **Alternativas consideradas:** banco por módulo (adiado: custo); tabelas misturadas (rejeitado).
- **Consequências e trade-offs:** (+) transações locais e operação simples; dono claro de cada dado. (−) integridade entre módulos não é garantida por FK, e sim pelas validações via contrato (ex.: `PacientesApi.buscarResumo` antes de agendar).
- **Onde ver no código:** `apps/api/prisma/schema.prisma` (`@@schema(...)` em cada model); Relatórios usa projeções próprias em vez de JOIN.
