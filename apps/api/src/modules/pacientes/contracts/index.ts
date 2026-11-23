/**
 * Contrato público do módulo Pacientes (documento, seção 7.2 — conascência de NOME mantida).
 * Consumidores: Agendamento, Atendimento, Internação, Faturamento e Notificações (Ca = 5).
 * Por isso é tratado como contrato estável: métodos novos são adicionados, os antigos não são removidos.
 */
import { Convenio } from '@sgh/shared';

/** Dados mínimos que outros módulos podem ver. CPF sempre mascarado (LGPD). */
export interface PacienteResumoDto {
  id: string;
  nome: string;
  cpfMascarado: string;
  convenio: Convenio;
  ativo: boolean;
}

/** Usado apenas por Notificações. */
export interface ContatoPacienteDto {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
}

export interface PacientesApi {
  buscarResumo(id: string): Promise<PacienteResumoDto | null>;
  buscarContato(id: string): Promise<ContatoPacienteDto | null>;
}

export const PACIENTES_API = Symbol('PACIENTES_API');
