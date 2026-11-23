import { StatusInternacao } from '@sgh/shared';
import { RegraNegocioError, ValidacaoError } from '../../../shared/erros/erros';
import { Transacao } from '../../../shared/transacao';
import { Leito } from './leito';

export interface DadosInternacao {
  id?: string;
  pacienteId: string;
  leitoId: string;
  motivo: string;
  status: StatusInternacao;
  inicio: Date;
  alta: Date | null;
}

const DIA_MS = 24 * 3600_000;

export class Internacao {
  private constructor(private readonly d: DadosInternacao) {}

  /** Cria a internação para um leito que JÁ foi ocupado (ver InternarPacienteUseCase). */
  static iniciar(p: { pacienteId: string; motivo: string }, leito: Leito, agora = new Date()): Internacao {
    if (!p.motivo?.trim()) throw new ValidacaoError('Informe o motivo da internação.');
    if (!leito.id) throw new RegraNegocioError('Leito sem identificador.');
    return new Internacao({ pacienteId: p.pacienteId, leitoId: leito.id, motivo: p.motivo.trim(), status: StatusInternacao.ATIVA, inicio: agora, alta: null });
  }

  static reconstituir(d: DadosInternacao): Internacao {
    return new Internacao({ ...d });
  }

  get id() { return this.d.id; }
  get pacienteId() { return this.d.pacienteId; }
  get leitoId() { return this.d.leitoId; }
  get motivo() { return this.d.motivo; }
  get status() { return this.d.status; }
  get inicio() { return this.d.inicio; }
  get alta() { return this.d.alta; }

  private garantirAtiva(): void {
    if (this.d.status !== StatusInternacao.ATIVA) throw new RegraNegocioError('A internação já foi encerrada.');
  }

  transferirPara(novoLeito: Leito): void {
    this.garantirAtiva();
    if (novoLeito.id === this.d.leitoId) throw new RegraNegocioError('O paciente já está neste leito.');
    this.d.leitoId = novoLeito.id!;
  }

  registrarAlta(agora = new Date()): void {
    this.garantirAtiva();
    this.d.status = StatusInternacao.ENCERRADA;
    this.d.alta = agora;
  }

  /** Diárias cobráveis: fração de dia conta como diária, mínimo 1. */
  diarias(): number {
    const fim = this.d.alta ?? new Date();
    return Math.max(1, Math.ceil((fim.getTime() - this.d.inicio.getTime()) / DIA_MS));
  }
}

export interface LeitoRepositorio {
  obter(id: string, tx?: Transacao): Promise<Leito | null>;
  /**
   * Grava o leito com controle de concorrência OTIMISTA: só atualiza se a versão no banco
   * ainda for a que foi lida. Caso contrário lança ConflitoError (409).
   */
  salvar(leito: Leito, tx?: Transacao): Promise<void>;
  cadastrar(leito: Leito): Promise<Leito>;
  listar(): Promise<Leito[]>;
}

export interface InternacaoRepositorio {
  obter(id: string, tx?: Transacao): Promise<Internacao | null>;
  obterAtivaDoPaciente(pacienteId: string, tx?: Transacao): Promise<Internacao | null>;
  salvar(i: Internacao, tx?: Transacao): Promise<Internacao>;
  listar(filtro: { status?: StatusInternacao }): Promise<Internacao[]>;
}

export const LEITO_REPOSITORIO = Symbol('LEITO_REPOSITORIO');
export const INTERNACAO_REPOSITORIO = Symbol('INTERNACAO_REPOSITORIO');
