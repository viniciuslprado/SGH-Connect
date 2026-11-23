/**
 * Eventos publicados pelo Agendamento. Consumidores: Notificações e Relatórios.
 * Conascência de TIPO mantida e verificada pelo compilador (documento, seção 7.3).
 */
import { EventoDominio } from '../../../shared/eventos/evento-dominio';

export const CONSULTA_AGENDADA = 'ConsultaAgendada' as const;
export const CONSULTA_CANCELADA = 'ConsultaCancelada' as const;

export interface ConsultaAgendadaPayload {
  consultaId: string;
  pacienteId: string;
  profissionalId: string;
  profissionalNome: string;
  /** ISO 8601 UTC */
  inicio: string;
  /** ISO 8601 UTC */
  fim: string;
  sala: string | null;
}

export interface ConsultaCanceladaPayload {
  consultaId: string;
  pacienteId: string;
  profissionalId: string;
  /** ISO 8601 UTC */
  inicio: string;
}

export type ConsultaAgendadaEvent = EventoDominio<typeof CONSULTA_AGENDADA, ConsultaAgendadaPayload>;
export type ConsultaCanceladaEvent = EventoDominio<typeof CONSULTA_CANCELADA, ConsultaCanceladaPayload>;
