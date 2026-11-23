import { ClassificacaoRisco, StatusAtendimento } from '@sgh/shared';
import { RegraNegocioError, ValidacaoError } from '../../../shared/erros/erros';
import { Transacao } from '../../../shared/transacao';
import { ProcedimentoRealizado } from '../contracts';

export interface Triagem {
  classificacaoRisco: ClassificacaoRisco;
  queixaPrincipal: string;
  pressaoArterial?: string | null;
  temperatura?: number | null;
  frequenciaCardiaca?: number | null;
  saturacao?: number | null;
  registradaPor: string;
  registradaEm: Date;
}

export interface RegistroClinico {
  id?: string;
  autorId: string;
  anamnese?: string | null;
  cid?: string | null;
  conduta: string;
  prescricao?: string | null;
  criadoEm: Date;
}

export interface DadosAtendimento {
  id?: string;
  pacienteId: string;
  profissionalId: string;
  consultaId: string | null;
  status: StatusAtendimento;
  inicio: Date;
  fim: Date | null;
  triagem: Triagem | null;
  registros: RegistroClinico[];
}

/**
 * Agregado Atendimento: triagem → registro clínico → finalização (coesão sequencial).
 *
 * Conascência de EXECUÇÃO tornada explícita e confinada ao agregado: a ordem
 * "abrir antes de registrar" e "registrar antes de finalizar" é garantida aqui,
 * e não depende de quem chama.
 */
export class Atendimento {
  private constructor(private readonly d: DadosAtendimento) {}

  static abrir(p: { pacienteId: string; profissionalId: string; consultaId?: string | null }, agora = new Date()): Atendimento {
    return new Atendimento({
      pacienteId: p.pacienteId,
      profissionalId: p.profissionalId,
      consultaId: p.consultaId ?? null,
      status: StatusAtendimento.ABERTO,
      inicio: agora,
      fim: null,
      triagem: null,
      registros: [],
    });
  }

  static reconstituir(d: DadosAtendimento): Atendimento {
    return new Atendimento({ ...d, registros: [...d.registros] });
  }

  get id() { return this.d.id; }
  get pacienteId() { return this.d.pacienteId; }
  get profissionalId() { return this.d.profissionalId; }
  get consultaId() { return this.d.consultaId; }
  get status() { return this.d.status; }
  get inicio() { return this.d.inicio; }
  get fim() { return this.d.fim; }
  get triagem() { return this.d.triagem; }
  get registros(): readonly RegistroClinico[] { return this.d.registros; }

  private garantirAberto(acao: string): void {
    if (this.d.status !== StatusAtendimento.ABERTO) {
      throw new RegraNegocioError(`Atendimento finalizado não permite ${acao}.`);
    }
  }

  registrarTriagem(t: Omit<Triagem, 'registradaEm'>, agora = new Date()): void {
    this.garantirAberto('alterar a triagem');
    if (!t.queixaPrincipal?.trim()) throw new ValidacaoError('Informe a queixa principal.');
    if (t.saturacao != null && (t.saturacao < 0 || t.saturacao > 100)) throw new ValidacaoError('Saturação deve estar entre 0 e 100%.');
    if (t.temperatura != null && (t.temperatura < 30 || t.temperatura > 45)) throw new ValidacaoError('Temperatura fora da faixa plausível (30–45 °C).');
    this.d.triagem = { ...t, queixaPrincipal: t.queixaPrincipal.trim(), registradaEm: agora };
  }

  /** Inclui evolução/registro clínico. Só é permitido com o atendimento ABERTO. */
  registrarEvolucao(r: Omit<RegistroClinico, 'id' | 'criadoEm'>, agora = new Date()): RegistroClinico {
    this.garantirAberto('novos registros clínicos');
    if (!r.conduta?.trim()) throw new ValidacaoError('Informe a conduta.');
    if (r.cid && !/^[A-Z]\d{2}(\.\d{1,2})?$/.test(r.cid.trim().toUpperCase())) {
      throw new ValidacaoError('CID deve seguir o formato A00 ou A00.0.');
    }
    const registro: RegistroClinico = { ...r, cid: r.cid?.trim().toUpperCase() || null, conduta: r.conduta.trim(), criadoEm: agora };
    this.d.registros.push(registro);
    return registro;
  }

  /** Finaliza e devolve os procedimentos a serem faturados. Exige ao menos um registro clínico. */
  finalizar(agora = new Date()): ProcedimentoRealizado[] {
    this.garantirAberto('ser finalizado novamente');
    if (this.d.registros.length === 0) {
      throw new RegraNegocioError('Inclua ao menos um registro clínico antes de finalizar o atendimento.');
    }
    this.d.status = StatusAtendimento.FINALIZADO;
    this.d.fim = agora;
    return this.procedimentos();
  }

  procedimentos(): ProcedimentoRealizado[] {
    const lista: ProcedimentoRealizado[] = [{ codigo: 'CONSULTA', quantidade: 1 }];
    if (this.d.triagem) lista.push({ codigo: 'TRIAGEM', quantidade: 1 });
    return lista;
  }
}

export interface AtendimentoRepositorio {
  obter(id: string, tx?: Transacao): Promise<Atendimento | null>;
  salvar(a: Atendimento, tx?: Transacao): Promise<Atendimento>;
  listar(filtro: { status?: StatusAtendimento; pacienteId?: string }): Promise<Atendimento[]>;
}

export const ATENDIMENTO_REPOSITORIO = Symbol('ATENDIMENTO_REPOSITORIO');
