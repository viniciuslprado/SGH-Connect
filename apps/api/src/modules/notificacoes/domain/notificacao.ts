import { StatusNotificacao } from '@sgh/shared';

export interface Mensagem {
  destino: string;
  assunto: string;
  corpo: string;
}

/**
 * Porta de saída: canal de notificação (documento, seção 6.5).
 * Trocar e-mail por WhatsApp/SMS = novo adaptador, sem alterar casos de uso.
 */
export interface CanalNotificacao {
  readonly nome: string;
  enviar(mensagem: Mensagem): Promise<void>;
}

export interface RegistroNotificacao {
  eventId: string;
  pacienteId: string;
  canal: string;
  destino: string;
  assunto: string;
  mensagem: string;
  status: StatusNotificacao;
}

export interface NotificacaoRepositorio {
  jaNotificado(eventId: string): Promise<boolean>;
  registrar(n: RegistroNotificacao): Promise<void>;
  listar(): Promise<(RegistroNotificacao & { id: string; enviadaEm: Date })[]>;
}

export const CANAL_NOTIFICACAO = Symbol('CANAL_NOTIFICACAO');
export const NOTIFICACAO_REPOSITORIO = Symbol('NOTIFICACAO_REPOSITORIO');

/** Formata data/hora para o paciente (horário de Brasília). */
export const dataHoraBrasil = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' });
