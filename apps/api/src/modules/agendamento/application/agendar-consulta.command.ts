/**
 * Comando de agendamento.
 *
 * Conascência de POSIÇÃO reduzida para conascência de NOME (documento, seção 7.5):
 * em vez de agendar(pacienteId, profissionalId, data, hora, duracao, sala) — em que trocar
 * dois ids do tipo string compila e gera um erro silencioso —, o chamador nomeia cada campo.
 */
export interface AgendarConsultaCommand {
  pacienteId: string;
  profissionalId: string;
  /** ISO 8601 com fuso (ex.: 2026-11-26T14:00:00-03:00 ou ...Z). */
  inicio: string;
  duracaoMin: number;
  sala?: string;
  observacao?: string;
}
