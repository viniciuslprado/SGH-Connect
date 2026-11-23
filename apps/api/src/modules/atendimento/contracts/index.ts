/**
 * Evento publicado pelo Atendimento. Consumidores: Faturamento, Notificações e Relatórios.
 * O Atendimento NÃO conhece nenhum deles: apenas publica o fato (documento, Figura 5).
 */
import { EventoDominio } from '../../../shared/eventos/evento-dominio';

export const ATENDIMENTO_FINALIZADO = 'AtendimentoFinalizado' as const;

export interface ProcedimentoRealizado {
  /** Código interno do procedimento (ex.: CONSULTA, TRIAGEM). */
  codigo: string;
  quantidade: number;
}

export interface AtendimentoFinalizadoPayload {
  atendimentoId: string;
  pacienteId: string;
  profissionalId: string;
  profissionalNome: string;
  procedimentos: ProcedimentoRealizado[];
  /** ISO 8601 UTC */
  finalizadoEm: string;
}

export type AtendimentoFinalizadoEvent = EventoDominio<typeof ATENDIMENTO_FINALIZADO, AtendimentoFinalizadoPayload>;
