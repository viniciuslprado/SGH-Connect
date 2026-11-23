import { StatusConsulta } from '@sgh/shared';
import { ConflitoError, RegraNegocioError, ValidacaoError } from '../../../shared/erros/erros';
import { Transacao } from '../../../shared/transacao';

export interface DadosConsulta {
  id?: string;
  pacienteId: string;
  profissionalId: string;
  inicio: Date;
  fim: Date;
  status: StatusConsulta;
  sala: string | null;
  observacao: string | null;
}

const DURACAO_MINIMA = 10;
const DURACAO_MAXIMA = 240;

/**
 * Consulta agendada. Responsabilidade: TEMPO e RECURSOS (horário, profissional, sala).
 * Não carrega nada de prontuário ou de conta — isso pertence a Atendimento e Faturamento (alta coesão).
 */
export class Consulta {
  private constructor(private readonly d: DadosConsulta) {}

  static reconstituir(d: DadosConsulta): Consulta {
    return new Consulta({ ...d });
  }

  static agendar(
    p: { pacienteId: string; profissionalId: string; inicio: Date; duracaoMin: number; sala?: string | null; observacao?: string | null },
    agora = new Date(),
  ): Consulta {
    if (Number.isNaN(p.inicio.getTime())) throw new ValidacaoError('Data/hora de início inválida (use ISO 8601).');
    if (p.inicio <= agora) throw new ValidacaoError('A consulta deve ser agendada para um horário futuro.');
    if (p.duracaoMin < DURACAO_MINIMA || p.duracaoMin > DURACAO_MAXIMA) {
      throw new ValidacaoError(`Duração deve estar entre ${DURACAO_MINIMA} e ${DURACAO_MAXIMA} minutos.`);
    }
    return new Consulta({
      pacienteId: p.pacienteId,
      profissionalId: p.profissionalId,
      inicio: p.inicio,
      fim: new Date(p.inicio.getTime() + p.duracaoMin * 60_000),
      status: StatusConsulta.AGENDADA,
      sala: p.sala?.trim() || null,
      observacao: p.observacao?.trim() || null,
    });
  }

  get id() { return this.d.id; }
  get pacienteId() { return this.d.pacienteId; }
  get profissionalId() { return this.d.profissionalId; }
  get inicio() { return this.d.inicio; }
  get fim() { return this.d.fim; }
  get status() { return this.d.status; }
  get sala() { return this.d.sala; }
  get observacao() { return this.d.observacao; }

  /** Dois intervalos [inicio, fim) se sobrepõem. Consultas canceladas não ocupam a agenda. */
  conflitaCom(outra: Consulta): boolean {
    if (this.status !== StatusConsulta.AGENDADA || outra.status !== StatusConsulta.AGENDADA) return false;
    if (this.id && this.id === outra.id) return false;
    return this.profissionalId === outra.profissionalId && this.inicio < outra.fim && outra.inicio < this.fim;
  }

  /** Regra central da agenda: um profissional não atende duas consultas ao mesmo tempo. */
  garantirSemConflito(agendaDoProfissional: Consulta[]): void {
    const conflito = agendaDoProfissional.find((c) => this.conflitaCom(c));
    if (conflito) {
      throw new ConflitoError('O profissional já possui consulta neste horário.', {
        consultaConflitante: conflito.id,
        inicio: conflito.inicio.toISOString(),
        fim: conflito.fim.toISOString(),
      });
    }
  }

  cancelar(): void {
    if (this.d.status === StatusConsulta.CANCELADA) throw new RegraNegocioError('A consulta já está cancelada.');
    this.d.status = StatusConsulta.CANCELADA;
  }

  comId(id: string): Consulta {
    return new Consulta({ ...this.d, id });
  }
}

export interface ConsultaRepositorio {
  obter(id: string, tx?: Transacao): Promise<Consulta | null>;
  /** Serializa agendamentos do mesmo profissional (evita duas reservas simultâneas do mesmo horário). */
  bloquearAgendaDoProfissional(profissionalId: string, tx: Transacao): Promise<void>;
  listarAgendadasNoIntervalo(profissionalId: string, inicio: Date, fim: Date, tx?: Transacao): Promise<Consulta[]>;
  salvar(consulta: Consulta, tx?: Transacao): Promise<Consulta>;
  listar(filtro: { profissionalId?: string; pacienteId?: string; de?: Date; ate?: Date }): Promise<Consulta[]>;
}

export const CONSULTA_REPOSITORIO = Symbol('CONSULTA_REPOSITORIO');
