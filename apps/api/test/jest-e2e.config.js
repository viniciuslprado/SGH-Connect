/** Testes e2e: sobem a aplicação Nest inteira contra o banco sgh_test (docker compose). */
module.exports = {
  rootDir: '..',
  testRegex: 'test/.*\.e2e-spec\.ts$',
  transform: { '^.+\.ts$': ['ts-jest', { isolatedModules: true }] },
  testEnvironment: 'node',
  globalSetup: '<rootDir>/test/global-setup.js',
  setupFiles: ['<rootDir>/test/ambiente.js'],
  testTimeout: 30000,
};
