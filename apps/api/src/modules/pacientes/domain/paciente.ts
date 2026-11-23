import { Convenio, Cpf } from '@sgh/shared';
import { ValidacaoError } from '../../../shared/erros/erros';

export interface DadosPaciente {
  id?: string;
  nome: string;
  cpf: string;
  /** Data de nascimento em ISO 8601 (AAAA-MM-DD). */
  nascimento: string;
  telefone?: string | null;
  email?: string | null;
  convenio: Convenio;
  numeroCarteirinha?: string | null;
  ativo?: boolean;
}

export class Paciente {
  private constructor(
    readonly id: string | undefined,
    readonly nome: string,
    readonly cpf: Cpf,
    readonly nascimento: string,
    readonly telefone: string | null,
    readonly email: string | null,
    readonly convenio: Convenio,
    readonly numeroCarteirinha: string | null,
    private _ativo: boolean,
  ) {}

  static criar(d: DadosPaciente): Paciente {
    if (!d.nome?.trim() || d.nome.trim().length < 3) throw new ValidacaoError('Nome do paciente deve ter ao menos 3 caracteres.');
    const nascimento = new Date(`${d.nascimento}T00:00:00Z`);
    if (Number.isNaN(nascimento.getTime()) || nascimento > new Date()) {
      throw new ValidacaoError('Data de nascimento inválida (use AAAA-MM-DD, no passado).');
    }
    if (d.convenio !== Convenio.PARTICULAR && d.convenio !== Convenio.SUS && !d.numeroCarteirinha?.trim()) {
      throw new ValidacaoError('Informe o número da carteirinha do convênio.');
    }
    return new Paciente(
      d.id,
      d.nome.trim(),
      Cpf.criar(d.cpf), // lança CpfInvalidoError → 400
      d.nascimento,
      d.telefone?.trim() || null,
      d.email?.trim().toLowerCase() || null,
      d.convenio,
      d.numeroCarteirinha?.trim() || null,
      d.ativo ?? true,
    );
  }

  get ativo(): boolean {
    return this._ativo;
  }

  /** Pacientes com histórico não são excluídos, apenas inativados (rastreabilidade). */
  inativar(): void {
    this._ativo = false;
  }
}

export interface PacienteRepositorio {
  obter(id: string): Promise<Paciente | null>;
  obterPorCpf(cpf: string): Promise<Paciente | null>;
  salvar(paciente: Paciente): Promise<Paciente>;
  pesquisar(filtro: { termo?: string; incluirInativos?: boolean }): Promise<Paciente[]>;
}

export const PACIENTE_REPOSITORIO = Symbol('PACIENTE_REPOSITORIO');
