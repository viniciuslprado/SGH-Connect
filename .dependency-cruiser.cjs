/**
 * Fitness functions da arquitetura (documento, seção 6.4).
 * `npm run arch:check` falha o build se qualquer regra abaixo for violada.
 *
 * Os caminhos usam "modules/<nome>/" sem prefixo fixo para que as mesmas regras
 * possam ser demonstradas sobre o fixture de violação em apps/api/test/arch-fixture.
 */
module.exports = {
  forbidden: [
    {
      name: 'somente-contratos-entre-modulos',
      comment:
        'Um módulo só pode importar a pasta contracts/ de outro módulo. ' +
        'domain/, application/, infrastructure/ e api/ são privados (baixo acoplamento).',
      severity: 'error',
      from: { path: '(^|/)modules/([^/]+)/' },
      to: {
        path: '(^|/)modules/([^/]+)/(?!contracts/)',
        pathNot: '(^|/)modules/$2/',
      },
    },
    {
      name: 'sem-ciclos',
      comment: 'Princípio das Dependências Acíclicas: nenhum ciclo entre arquivos/módulos.',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'dominio-sem-framework',
      comment: 'A camada domain/ é TypeScript puro: não importa NestJS, Prisma nem outras camadas.',
      severity: 'error',
      from: { path: '(^|/)modules/[^/]+/domain/' },
      to: {
        path: '(@nestjs|@prisma|(^|/)modules/[^/]+/(application|infrastructure|api)/)',
      },
    },
    {
      name: 'contratos-nao-dependem-de-implementacao',
      comment: 'contracts/ expõe apenas interfaces, DTOs e eventos; não pode importar o interior do próprio módulo.',
      severity: 'error',
      from: { path: '(^|/)modules/([^/]+)/contracts/' },
      to: { path: '(^|/)modules/$2/(application|infrastructure|api)/' },
    },
    {
      name: 'kernel-nao-conhece-interior-de-modulos',
      comment: 'O kernel shared/ só pode depender de contracts/ dos módulos, nunca do interior deles.',
      severity: 'error',
      from: { path: '(^|/)src/shared/' },
      to: { path: '(^|/)modules/[^/]+/(?!contracts/)' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '\\.spec\\.ts$' },
    tsPreCompilationDeps: true,
    reporterOptions: {
      dot: { collapsePattern: 'modules/[^/]+' },
    },
  },
};
