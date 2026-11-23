import { TipoProfissional } from '@sgh/shared';
import { ValidacaoError } from '../../../shared/erros/erros';

export interface DadosProfissional {
  id?: string;
  nome: string;
  tipo: TipoProfissional;
  registro: string;
  especialidade: string;
  usuarioId?: string | null;
  ativo?: boolean;
}

export class Profissional {
  private constructor(private readonly d: Required<Omit<DadosProfissional, 'id'>> & { id?: string }) {}

  static criar(d: DadosProfissional): Profissional {
    if (!d.nome?.trim()) throw new ValidacaoError('Informe o nome do profissional.');
    const registro = d.registro?.trim().toUpperCase();
    // Médicos: CRM-UF 123456 ; Enfermeiros: COREN-UF 123456
    const prefixo = d.tipo === TipoProfissional.MEDICO ? 'CRM' : 'COREN';
    if (!new RegExp(`^${prefixo}-[A-Z]{2} \\d{4,7}$`).test(registro ?? '')) {
      throw new ValidacaoError(`Registro deve seguir o formato ${prefixo}-UF 123456.`);
    }
    return new Profissional({
      id: d.id,
      nome: d.nome.trim(),
      tipo: d.tipo,
      registro,
      especialidade: d.especialidade?.trim() || 'Clínica geral',
      usuarioId: d.usuarioId ?? null,
      ativo: d.ativo ?? true,
    });
  }

  get id() { return this.d.id; }
  get nome() { return this.d.nome; }
  get tipo() { return this.d.tipo; }
  get registro() { return this.d.registro; }
  get especialidade() { return this.d.especialidade; }
  get usuarioId() { return this.d.usuarioId; }
  get ativo() { return this.d.ativo; }

  inativar(): void {
    this.d.ativo = false;
  }
}

export interface ProfissionalRepositorio {
  obter(id: string): Promise<Profissional | null>;
  salvar(p: Profissional): Promise<Profissional>;
  listar(filtro: { tipo?: TipoProfissional; incluirInativos?: boolean }): Promise<Profissional[]>;
}

export const PROFISSIONAL_REPOSITORIO = Symbol('PROFISSIONAL_REPOSITORIO');
