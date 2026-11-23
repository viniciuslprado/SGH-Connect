import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// O web importa o TS-fonte de @sgh/shared (mesmo Cpf e enums que a API usa).
const shared = fileURLToPath(new URL('../../packages/shared/src/index.ts', import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@sgh/shared': shared } },
  server: { port: 5173, proxy: { '/api': 'http://localhost:3333' } },
  test: { environment: 'jsdom' },
});
