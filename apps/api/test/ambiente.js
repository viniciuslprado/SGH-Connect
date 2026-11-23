// Variáveis de ambiente dos testes e2e (nunca apontam para o banco de desenvolvimento).
process.env.DATABASE_URL = process.env.DATABASE_URL_TEST || 'postgresql://sgh:sgh_dev@localhost:5433/sgh_test?schema=public';
process.env.JWT_SECRET = 'segredo-de-teste';
process.env.OUTBOX_INTERVAL_MS = '0'; // o teste dispara o worker manualmente, de forma determinística
