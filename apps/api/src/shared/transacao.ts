/**
 * Abstração de transação usada pelas portas (repositórios) do domínio.
 * O domínio não conhece Prisma: só recebe um "Transacao" opaco e o repassa.
 */
export type Transacao = unknown;

export interface UnidadeDeTrabalho {
  /** Executa `trabalho` em uma única transação: tudo é confirmado ou nada é. */
  executar<T>(trabalho: (tx: Transacao) => Promise<T>): Promise<T>;
}

export const UNIDADE_DE_TRABALHO = Symbol('UNIDADE_DE_TRABALHO');
