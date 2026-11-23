/** Eventos publicados pela Internação. Consumidores: Faturamento (alta) e Relatórios (ocupação). */
import { TipoLeito } from '@sgh/shared';
import { EventoDominio } from '../../../shared/eventos/evento-dominio';

export const PACIENTE_INTERNADO = 'PacienteInternado' as const;
export const ALTA_REGISTRADA = 'AltaRegistrada' as const;

export interface PacienteInternadoPayload {
  internacaoId: string;
  pacienteId: string;
  leitoId: string;
  leitoCodigo: string;
  ala: string;
  tipoLeito: TipoLeito;
  /** ISO 8601 UTC */
  inicio: string;
}

export interface AltaRegistradaPayload extends PacienteInternadoPayload {
  /** ISO 8601 UTC */
  alta: string;
  /** Diárias cobráveis (mínimo 1). */
  diarias: number;
}

export type PacienteInternadoEvent = EventoDominio<typeof PACIENTE_INTERNADO, PacienteInternadoPayload>;
export type AltaRegistradaEvent = EventoDominio<typeof ALTA_REGISTRADA, AltaRegistradaPayload>;
