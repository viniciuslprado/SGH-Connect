# Fixture de violação arquitetural (proposital)

Estes arquivos NÃO fazem parte da aplicação. Eles existem só para provar que
`.dependency-cruiser.cjs` reprova um módulo que importa o interior de outro.

`agendamento/application/viola-fronteira.ts` importa `pacientes/domain/` (proibido:
só `pacientes/contracts/` é público). Rode `npm run arch:demo` na raiz para ver o erro.
