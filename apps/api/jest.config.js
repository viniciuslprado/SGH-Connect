/** Testes unitários: domínio e casos de uso, sem banco de dados. */
module.exports = {
  rootDir: 'src',
  testRegex: '.*\.spec\.ts$',
  transform: { '^.+\.ts$': ['ts-jest', { isolatedModules: true }] },
  testEnvironment: 'node',
};
