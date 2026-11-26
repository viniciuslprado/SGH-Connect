/**
 * Executado no `npm install` (postinstall), ANTES do `prisma generate`.
 * Cria apps/api/.env a partir do .env.example da raiz se ele ainda não existir,
 * para que quem acabou de clonar não precise copiar o arquivo à mão.
 * Nunca sobrescreve um .env existente.
 */
const fs = require('node:fs');
const path = require('node:path');

const destino = path.join(__dirname, '..', '.env');
const modelo = path.join(__dirname, '..', '..', '..', '.env.example');

if (fs.existsSync(destino)) {
  console.log('[sgh] apps/api/.env já existe — mantido.');
} else if (fs.existsSync(modelo)) {
  fs.copyFileSync(modelo, destino);
  console.log('[sgh] apps/api/.env criado a partir de .env.example.');
} else {
  console.warn('[sgh] .env.example não encontrado; crie apps/api/.env manualmente.');
}
