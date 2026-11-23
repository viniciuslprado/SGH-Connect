/**
 * Erros de domínio. O domínio lança estes erros; o filtro global os traduz para HTTP.
 * Assim nenhuma regra de negócio precisa conhecer códigos HTTP.
 */
export abstract class ErroDominio extends Error {
  abstract readonly statusHttp: number;
  constructor(mensagem: string, readonly detalhes?: unknown) {
    super(mensagem);
    this.name = new.target.name;
  }
}

/** Entrada sintaticamente válida, mas inválida para o negócio (ex.: horário de fim antes do início). → 400 */
export class ValidacaoError extends ErroDominio {
  readonly statusHttp = 400;
}

/** Recurso inexistente. → 404 */
export class NaoEncontradoError extends ErroDominio {
  readonly statusHttp = 404;
}

/** Conflito com o estado atual (agenda sobreposta, leito ocupado, CPF duplicado). → 409 */
export class ConflitoError extends ErroDominio {
  readonly statusHttp = 409;
}

/** Operação não permitida pela regra de negócio no estado atual (ex.: atendimento finalizado). → 422 */
export class RegraNegocioError extends ErroDominio {
  readonly statusHttp = 422;
}
