const { execSync } = require('node:child_process');
const path = require('node:path');

module.exports = async () => {
  const url = process.env.DATABASE_URL_TEST || 'postgresql://sgh:sgh_dev@localhost:5433/sgh_test?schema=public';
  execSync('npx prisma migrate deploy', { cwd: path.join(__dirname, '..'), env: { ...process.env, DATABASE_URL: url }, stdio: 'ignore' });
};
