import { Inject, Injectable } from '@nestjs/common';
import { TipoProfissional } from '@sgh/shared';
import { NaoEncontradoError } from '../../../shared/erros/erros';
import { CorpoClinicoApi, ProfissionalResumoDto } from '../contracts';
import { DadosProfissional, PROFISSIONAL_REPOSITORIO, Profissional, ProfissionalRepositorio } from '../domain/profissional';

export interface ProfissionalDto extends ProfissionalResumoDto {
  registro: string;
  usuarioId: string | null;
}

const paraDto = (p: Profissional): ProfissionalDto => ({
  id: p.id!,
  nome: p.nome,
  tipo: p.tipo,
  registro: p.registro,
  especialidade: p.especialidade,
  usuarioId: p.usuarioId,
  ativo: p.ativo,
});

export type CadastrarProfissionalCommand = Omit<DadosProfissional, 'id' | 'ativo'>;

@Injectable()
export class CadastrarProfissionalUseCase {
  constructor(@Inject(PROFISSIONAL_REPOSITORIO) private readonly repo: ProfissionalRepositorio) {}

  async executar(cmd: CadastrarProfissionalCommand): Promise<ProfissionalDto> {
    return paraDto(await this.repo.salvar(Profissional.criar(cmd)));
  }
}

@Injectable()
export class AtualizarProfissionalUseCase {
  constructor(@Inject(PROFISSIONAL_REPOSITORIO) private readonly repo: ProfissionalRepositorio) {}

  async executar(id: string, cmd: Partial<CadastrarProfissionalCommand> & { ativo?: boolean }): Promise<ProfissionalDto> {
    const atual = await this.repo.obter(id);
    if (!atual) throw new NaoEncontradoError('Profissional não encontrado.');
    return paraDto(await this.repo.salvar(Profissional.criar({ ...paraDto(atual), ...cmd, id })));
  }
}

@Injectable()
export class ListarProfissionaisUseCase {
  constructor(@Inject(PROFISSIONAL_REPOSITORIO) private readonly repo: ProfissionalRepositorio) {}

  async executar(tipo?: TipoProfissional, incluirInativos = false): Promise<ProfissionalDto[]> {
    return (await this.repo.listar({ tipo, incluirInativos })).map(paraDto);
  }
}

@Injectable()
export class CorpoClinicoApiImpl implements CorpoClinicoApi {
  constructor(@Inject(PROFISSIONAL_REPOSITORIO) private readonly repo: ProfissionalRepositorio) {}

  async buscarProfissional(id: string): Promise<ProfissionalResumoDto | null> {
    const p = await this.repo.obter(id);
    return p ? { id: p.id!, nome: p.nome, tipo: p.tipo, especialidade: p.especialidade, ativo: p.ativo } : null;
  }
}
