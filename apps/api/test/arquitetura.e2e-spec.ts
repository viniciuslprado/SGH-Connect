import { spawnSync } from 'node:child_process';
import * as path from 'node:path';

/** Fitness functions: as regras de fronteira são verificadas, não apenas documentadas. */
const raiz = path.join(__dirname, '..', '..', '..');
const depcruise = (alvo: string) =>
  spawnSync('npx', ['depcruise', alvo, '--config', '.dependency-cruiser.cjs'], { cwd: raiz, encoding: 'utf8', shell: true });

describe('Arquitetura (dependency-cruiser)', () => {
  it('o código real da API respeita todas as regras', () => {
    const r = depcruise('apps/api/src');
    expect(r.stdout).toContain('no dependency violations found');
    expect(r.status).toBe(0);
  }, 60_000);

  it('um módulo importando o interior de outro é REPROVADO', () => {
    const r = depcruise('apps/api/test/arch-fixture');
    expect(r.status).not.toBe(0);
    expect(r.stdout).toContain('somente-contratos-entre-modulos');
  }, 60_000);
});
