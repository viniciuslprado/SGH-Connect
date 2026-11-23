import { Inject, Injectable } from '@nestjs/common';
import { ClassificacaoRisco, StatusAtendimento } from '@sgh/shared';
import { AcaoAuditoria, REGISTRO_AUDITORIA, RegistroAuditoria } from '../../../shared/auditoria/auditoria';
import { NaoEncontradoError } from '../../../shared/erros/erros';
import { criarEvento } from '../../../shared/eventos/evento-dominio';
import { OUTBOX, Outbox } from '../../../shared/eventos/outbox';
import { UNIDADE_DE_TRABALHO, UnidadeDeTrabalho } from '../../../shared/transacao';
import { CORPO_CLINICO_API, CorpoClinicoApi } from '../../corpo-clinico/contracts';
import { UsuarioAutenticado } from '../../identidade/contracts';
import { PACIENTES_API, PacientesApi } from '../../pacientes/contracts';
import { ATENDIMENTO_FINALIZADO } from '../contracts';
import { ATENDIMENTO_REPOSITORIO, Atendimento, AtendimentoRepositorio } from '../domain/atendimento';

export interface AtendimentoResumoDto {
  id: string;
  pacienteId: string;
  pacienteNome: string;
  profissionalId: string;
  profissionalNome: string;
  consultaId: string | null;
  status: StatusAtendimento;
  classificacaoRisco: ClassificacaoRisco | null;
  inicio: string;
  fim: string | null;
}

/** Prontuário completo — só sai do módulo para MEDICO/ENFERMEIRO e toda leitura é auditada. */
export interface ProntuarioDto extends AtendimentoResumoDto {
  triagem: (Omit<NonNullable<Atendimento['triagem']>, 'registradaEm'> & { registradaEm: string }) | null;
  registros: { id?: string; autorId: string; anamnese?: string | null; cid?: string | null; conduta: string; prescricao?: string | null; criadoEm: string }[];
}

export interface AbrirAtendimentoCommand {
  pacienteId: string;
  profissionalId: string;
  consultaId?: string;
}

export interface TriagemCommand {
  classificacaoRisco: ClassificacaoRisco;
  queixaPrincipal: string;
  pressaoArterial?: string;
  temperatura?: number;
  frequenciaCardiaca?: number;
  saturacao?: number;
}

export interface RegistroClinicoCommand {
  anamnese?: string;
  cid?: string;
  conduta: string;
  prescricao?: string;
}

/** Resolve nomes nos módulos donos dos dados, via contratos. */
@Injectable()
export class NomesAtendimento {
  constructor(
    @Inject(PACIENTES_API) private readonly pacientes: PacientesApi,
    @Inject(CORPO_CLINICO_API) private readonly corpoClinico: CorpoClinicoApi,
  ) {}

  async resumo(a: Atendimento, cache = new Map<string, string>()): Promise<AtendimentoResumoDto> {
    const nome = async (chave: string, buscar: () => Promise<{ nome: string } | null>) => {
      if (!cache.has(chave)) cache.set(chave, (await buscar())?.nome ?? '—');
      return cache.get(chave)!;
    };
    return {
      id: a.id!,
      pacienteId: a.pacienteId,
      pacienteNome: await nome(`p:${a.pacienteId}`, () => this.pacientes.buscarResumo(a.pacienteId)),
      profissionalId: a.profissionalId,
      profissionalNome: await nome(`m:${a.profissionalId}`, () => this.corpoClinico.buscarProfissional(a.profissionalId)),
      consultaId: a.consultaId,
      status: a.status,
      classificacaoRisco: a.triagem?.classificacaoRisco ?? null,
      inicio: a.inicio.toISOString(),
      fim: a.fim?.toISOString() ?? null,
    };
  }
}

@Injectable()
export class AbrirAtendimentoUseCase {
  constructor(
    @Inject(ATENDIMENTO_REPOSITORIO) private readonly repo: AtendimentoRepositorio,
    @Inject(PACIENTES_API) private readonly pacientes: PacientesApi,
    @Inject(CORPO_CLINICO_API) private readonly corpoClinico: CorpoClinicoApi,
    @Inject(REGISTRO_AUDITORIA) private readonly auditoria: RegistroAuditoria,
    private readonly nomes: NomesAtendimento,
  ) {}

  async executar(cmd: AbrirAtendimentoCommand, ator: UsuarioAutenticado): Promise<AtendimentoResumoDto> {
    const paciente = await this.pacientes.buscarResumo(cmd.pacienteId);
    if (!paciente?.ativo) throw new NaoEncontradoError('Paciente não encontrado ou inativo.');
    const profissional = await this.corpoClinico.buscarProfissional(cmd.profissionalId);
    if (!profissional?.ativo) throw new NaoEncontradoError('Profissional não encontrado ou inativo.');

    const salvo = await this.repo.salvar(Atendimento.abrir(cmd));
    await this.auditoria.registrar({ ator, acao: AcaoAuditoria.ATENDIMENTO_ABERTO, entidade: 'Atendimento', entidadeId: salvo.id });
    return this.nomes.resumo(salvo);
  }
}

@Injectable()
export class RegistrarTriagemUseCase {
  constructor(@Inject(ATENDIMENTO_REPOSITORIO) private readonly repo: AtendimentoRepositorio, private readonly nomes: NomesAtendimento) {}

  async executar(id: string, cmd: TriagemCommand, ator: UsuarioAutenticado): Promise<AtendimentoResumoDto> {
    const a = await this.repo.obter(id);
    if (!a) throw new NaoEncontradoError('Atendimento não encontrado.');
    a.registrarTriagem({ ...cmd, registradaPor: ator.id });
    return this.nomes.resumo(await this.repo.salvar(a));
  }
}

@Injectable()
export class RegistrarEvolucaoUseCase {
  constructor(
    @Inject(ATENDIMENTO_REPOSITORIO) private readonly repo: AtendimentoRepositorio,
    @Inject(REGISTRO_AUDITORIA) private readonly auditoria: RegistroAuditoria,
    private readonly nomes: NomesAtendimento,
  ) {}

  async executar(id: string, cmd: RegistroClinicoCommand, ator: UsuarioAutenticado): Promise<AtendimentoResumoDto> {
    const a = await this.repo.obter(id);
    if (!a) throw new NaoEncontradoError('Atendimento não encontrado.');
    a.registrarEvolucao({ ...cmd, autorId: ator.id }); // atendimento finalizado → 422
    const salvo = await this.repo.salvar(a);
    // Auditoria registra o FATO, nunca o texto clínico.
    await this.auditoria.registrar({ ator, acao: AcaoAuditoria.REGISTRO_CLINICO_INCLUIDO, entidade: 'Atendimento', entidadeId: id });
    return this.nomes.resumo(salvo);
  }
}

@Injectable()
export class FinalizarAtendimentoUseCase {
  constructor(
    @Inject(ATENDIMENTO_REPOSITORIO) private readonly repo: AtendimentoRepositorio,
    @Inject(CORPO_CLINICO_API) private readonly corpoClinico: CorpoClinicoApi,
    @Inject(UNIDADE_DE_TRABALHO) private readonly uow: UnidadeDeTrabalho,
    @Inject(OUTBOX) private readonly outbox: Outbox,
    @Inject(REGISTRO_AUDITORIA) private readonly auditoria: RegistroAuditoria,
    private readonly nomes: NomesAtendimento,
  ) {}

  /** Finaliza e publica AtendimentoFinalizado na MESMA transação (outbox). Não chama Faturamento nem Notificações. */
  async executar(id: string, ator: UsuarioAutenticado): Promise<AtendimentoResumoDto> {
    const salvo = await this.uow.executar(async (tx) => {
      const a = await this.repo.obter(id, tx);
      if (!a) throw new NaoEncontradoError('Atendimento não encontrado.');
      const procedimentos = a.finalizar();
      const profissional = await this.corpoClinico.buscarProfissional(a.profissionalId);
      const atualizado = await this.repo.salvar(a, tx);
      await this.outbox.adicionar(
        criarEvento(ATENDIMENTO_FINALIZADO, {
          atendimentoId: id,
          pacienteId: a.pacienteId,
          profissionalId: a.profissionalId,
          profissionalNome: profissional?.nome ?? '—',
          procedimentos,
          finalizadoEm: a.fim!.toISOString(),
        }),
        tx,
      );
      await this.auditoria.registrar({ ator, acao: AcaoAuditoria.ATENDIMENTO_FINALIZADO, entidade: 'Atendimento', entidadeId: id }, tx);
      return atualizado;
    });
    return this.nomes.resumo(salvo);
  }
}

@Injectable()
export class ConsultarAtendimentosUseCase {
  constructor(
    @Inject(ATENDIMENTO_REPOSITORIO) private readonly repo: AtendimentoRepositorio,
    @Inject(REGISTRO_AUDITORIA) private readonly auditoria: RegistroAuditoria,
    private readonly nomes: NomesAtendimento,
  ) {}

  async listar(filtro: { status?: StatusAtendimento; pacienteId?: string }): Promise<AtendimentoResumoDto[]> {
    const cache = new Map<string, string>();
    const lista = await this.repo.listar(filtro);
    const out: AtendimentoResumoDto[] = [];
    for (const a of lista) out.push(await this.nomes.resumo(a, cache));
    return out;
  }

  /** Leitura do prontuário: auditada (quem, quando, qual atendimento). */
  async prontuario(id: string, ator: UsuarioAutenticado): Promise<ProntuarioDto> {
    const a = await this.repo.obter(id);
    if (!a) throw new NaoEncontradoError('Atendimento não encontrado.');
    await this.auditoria.registrar({ ator, acao: AcaoAuditoria.PRONTUARIO_LIDO, entidade: 'Atendimento', entidadeId: id });
    return {
      ...(await this.nomes.resumo(a)),
      triagem: a.triagem ? { ...a.triagem, registradaEm: a.triagem.registradaEm.toISOString() } : null,
      registros: a.registros.map((r) => ({ ...r, criadoEm: r.criadoEm.toISOString() })),
    };
  }
}

