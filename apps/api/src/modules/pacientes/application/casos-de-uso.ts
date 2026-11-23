import { Inject, Injectable } from '@nestjs/common';
import { Convenio } from '@sgh/shared';
import { AcaoAuditoria, REGISTRO_AUDITORIA, RegistroAuditoria } from '../../../shared/auditoria/auditoria';
import { ConflitoError, NaoEncontradoError } from '../../../shared/erros/erros';
import { UsuarioAutenticado } from '../../identidade/contracts';
import { ContatoPacienteDto, PacienteResumoDto, PacientesApi } from '../contracts';
import { DadosPaciente, PACIENTE_REPOSITORIO, Paciente, PacienteRepositorio } from '../domain/paciente';

/** Visão completa, usada somente pelas telas do próprio módulo Pacientes. */
export interface PacienteDetalheDto {
  id: string;
  nome: string;
  cpf: string;
  nascimento: string;
  telefone: string | null;
  email: string | null;
  convenio: Convenio;
  numeroCarteirinha: string | null;
  ativo: boolean;
}

export const paraDetalhe = (p: Paciente): PacienteDetalheDto => ({
  id: p.id!,
  nome: p.nome,
  cpf: p.cpf.formatado(),
  nascimento: p.nascimento,
  telefone: p.telefone,
  email: p.email,
  convenio: p.convenio,
  numeroCarteirinha: p.numeroCarteirinha,
  ativo: p.ativo,
});

export type CadastrarPacienteCommand = Omit<DadosPaciente, 'id' | 'ativo'>;

@Injectable()
export class CadastrarPacienteUseCase {
  constructor(
    @Inject(PACIENTE_REPOSITORIO) private readonly pacientes: PacienteRepositorio,
    @Inject(REGISTRO_AUDITORIA) private readonly auditoria: RegistroAuditoria,
  ) {}

  async executar(cmd: CadastrarPacienteCommand, ator: UsuarioAutenticado): Promise<PacienteDetalheDto> {
    const paciente = Paciente.criar(cmd);
    if (await this.pacientes.obterPorCpf(paciente.cpf.valor)) throw new ConflitoError('Já existe paciente com este CPF.');
    const salvo = await this.pacientes.salvar(paciente);
    await this.auditoria.registrar({ ator, acao: AcaoAuditoria.PACIENTE_CADASTRADO, entidade: 'Paciente', entidadeId: salvo.id });
    return paraDetalhe(salvo);
  }
}

@Injectable()
export class AtualizarPacienteUseCase {
  constructor(@Inject(PACIENTE_REPOSITORIO) private readonly pacientes: PacienteRepositorio) {}

  async executar(id: string, cmd: Partial<CadastrarPacienteCommand>): Promise<PacienteDetalheDto> {
    const atual = await this.pacientes.obter(id);
    if (!atual) throw new NaoEncontradoError('Paciente não encontrado.');
    const dados = { ...paraDetalhe(atual), ...cmd, id };
    const atualizado = Paciente.criar(dados);
    const outro = await this.pacientes.obterPorCpf(atualizado.cpf.valor);
    if (outro && outro.id !== id) throw new ConflitoError('Já existe paciente com este CPF.');
    return paraDetalhe(await this.pacientes.salvar(atualizado));
  }
}

@Injectable()
export class InativarPacienteUseCase {
  constructor(
    @Inject(PACIENTE_REPOSITORIO) private readonly pacientes: PacienteRepositorio,
    @Inject(REGISTRO_AUDITORIA) private readonly auditoria: RegistroAuditoria,
  ) {}

  async executar(id: string, ator: UsuarioAutenticado): Promise<PacienteDetalheDto> {
    const paciente = await this.pacientes.obter(id);
    if (!paciente) throw new NaoEncontradoError('Paciente não encontrado.');
    paciente.inativar();
    const salvo = await this.pacientes.salvar(paciente);
    await this.auditoria.registrar({ ator, acao: AcaoAuditoria.PACIENTE_INATIVADO, entidade: 'Paciente', entidadeId: id });
    return paraDetalhe(salvo);
  }
}

@Injectable()
export class ConsultarPacientesUseCase {
  constructor(@Inject(PACIENTE_REPOSITORIO) private readonly pacientes: PacienteRepositorio) {}

  async pesquisar(termo?: string, incluirInativos = false): Promise<PacienteDetalheDto[]> {
    return (await this.pacientes.pesquisar({ termo, incluirInativos })).map(paraDetalhe);
  }

  async obter(id: string): Promise<PacienteDetalheDto> {
    const p = await this.pacientes.obter(id);
    if (!p) throw new NaoEncontradoError('Paciente não encontrado.');
    return paraDetalhe(p);
  }
}

/** Implementação do contrato público. Outros módulos só enxergam a interface PacientesApi. */
@Injectable()
export class PacientesApiImpl implements PacientesApi {
  constructor(@Inject(PACIENTE_REPOSITORIO) private readonly pacientes: PacienteRepositorio) {}

  async buscarResumo(id: string): Promise<PacienteResumoDto | null> {
    const p = await this.pacientes.obter(id);
    return p ? { id: p.id!, nome: p.nome, cpfMascarado: p.cpf.mascarado(), convenio: p.convenio, ativo: p.ativo } : null;
  }

  async buscarContato(id: string): Promise<ContatoPacienteDto | null> {
    const p = await this.pacientes.obter(id);
    return p ? { id: p.id!, nome: p.nome, email: p.email, telefone: p.telefone } : null;
  }
}
