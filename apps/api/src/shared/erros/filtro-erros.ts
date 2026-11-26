import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CpfInvalidoError } from '@sgh/shared';
import { Response } from 'express';
import { ErroDominio } from './erros';

/** Formato único de erro da API. */
export interface RespostaErro {
  statusCode: number;
  erro: string;
  mensagem: string;
  detalhes?: unknown;
}

const NOMES: Record<number, string> = {
  400: 'Requisição inválida',
  401: 'Não autenticado',
  403: 'Acesso negado',
  404: 'Não encontrado',
  409: 'Conflito',
  422: 'Regra de negócio violada',
  500: 'Erro interno',
};

@Catch()
export class FiltroErrosGlobal implements ExceptionFilter {
  private readonly logger = new Logger('Erros');

  catch(excecao: unknown, host: ArgumentsHost) {
    const resposta = host.switchToHttp().getResponse<Response>();
    const corpo = this.traduzir(excecao);
    if (corpo.statusCode >= 500) this.logger.error(excecao);
    resposta.status(corpo.statusCode).json(corpo);
  }

  private traduzir(e: unknown): RespostaErro {
    if (e instanceof ErroDominio) return this.corpo(e.statusHttp, e.message, e.detalhes);
    if (e instanceof CpfInvalidoError) return this.corpo(400, e.message);

    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return this.corpo(409, 'Registro duplicado: já existe um item com esses dados.');
    }

    if (e instanceof HttpException) {
      const status = e.getStatus();
      const r = e.getResponse() as string | { message?: string | string[] };
      const msg = typeof r === 'string' ? r : r.message;
      if (Array.isArray(msg)) return this.corpo(status, 'Dados de entrada inválidos.', msg);
      return this.corpo(status, this.mensagemPadrao(status, msg));
    }

    return this.corpo(HttpStatus.INTERNAL_SERVER_ERROR, 'Erro interno inesperado.');
  }

  /** Usa a mensagem específica quando houver (ex.: "E-mail ou senha inválidos."); senão, um texto padrão. */
  private mensagemPadrao(status: number, msg?: string): string {
    const generica = !msg || msg === 'Unauthorized' || msg === 'Forbidden';
    if (status === 401) return generica ? 'Faça login para acessar este recurso.' : msg;
    if (status === 403) return generica ? 'Seu perfil não tem permissão para esta ação.' : msg;
    return msg ?? NOMES[status] ?? 'Erro';
  }

  private corpo(statusCode: number, mensagem: string, detalhes?: unknown): RespostaErro {
    return { statusCode, erro: NOMES[statusCode] ?? 'Erro', mensagem, ...(detalhes ? { detalhes } : {}) };
  }
}
