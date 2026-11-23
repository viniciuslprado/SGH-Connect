import { Inject, Injectable } from '@nestjs/common';
import { StatusConsulta, TipoProfissional } from '@sgh/shared';
import { AcaoAuditoria, REGISTRO_AUDITORIA, RegistroAuditoria } from '../../../shared/auditoria/auditoria';
import { NaoEncontradoError, RegraNegocioError } from '../../../shared/erros/erros';
import { criarEvento } from '../../../shared/eventos/evento-dominio';
import { OUTBOX, Outbox } from '../../../shared/eventos/outbox';
import { UNIDADE_DE_TRABALHO, UnidadeDeTrabalho } from '../../../shared/transacao';
import { CORPO_CLINICO_API, CorpoClinicoApi } from '../../corpo-clinico/contracts';
import { UsuarioAutenticado } from '../../identidade/contracts';
import { PACIENTES_API, PacientesApi } from '../../pacientes/contracts';
import { CONSULTA_AGENDADA, CONSULTA_CANCELADA } from '../contracts';
import { CONSULTA_REPOSITORIO, Consulta, ConsultaRepositorio } from '../domain/consulta';
import { AgendarConsultaCommand } from './agendar-consulta.command';

export interface ConsultaDto {
  id: string;
  pacienteId: string;
  pacienteNome: string;
  profissionalId: string;
  profissionalNome: string;
  inicio: string;
  fim: string;
  status: StatusConsulta;
  sala: string | null;
  observacao: string | null;
}

/**
 * Agendar consulta.
 * Dependências SÍNCRONAS só por contrato (PacientesApi, CorpoClinicoApi): o Agendamento não
 * conhece classes nem tabelas desses módulos.
 */
@Injectable()
export class AgendarConsultaUseCase {
  constructor(
    @Inject(CONSULTA_REPOSITORIO) private readonly consultas: ConsultaRepositorio,
    @Inject(PACIENTES_API) private readonly pacientes: PacientesApi,
    @Inject(CORPO_CLINICO_API) private readonly corpoClinico: CorpoClinicoApi,
    @Inject(UNIDADE_DE_TRABALHO) private readonly uow: UnidadeDeTrabalho,
    @Inject(OUTBOX) private readonly outbox: Outbox,
    @Inject(REGISTRO_AUDITORIA) private readonly auditoria: RegistroAuditoria,
  ) {}

  async executar(cmd: AgendarConsultaCommand, ator: UsuarioAutenticado): Promise<ConsultaDto> {
    const paciente = await this.pacientes.buscarResumo(cmd.pacienteId);
    if (!paciente) throw new NaoEncontradoError('Paciente não encontrado.');
    if (!paciente.ativo) throw new RegraNegocioError('Paciente inativo não pode ser agendado.');

    const profissional = await this.corpoClinico.buscarProfissional(cmd.profissionalId);
    if (!profissional) throw new NaoEncontradoError('Profissional não encontrado.');
    if (!profissional.ativo || profissional.tipo !== TipoProfissional.MEDICO) {
      throw new RegraNegocioError('Consultas só podem ser agendadas com médicos ativos.');
    }

    const nova = Consulta.agendar({ ...cmd, inicio: new Date(cmd.inicio) });

    const salva = await this.uow.executar(async (tx) => {
      await this.consultas.bloquearAgendaDoProfissional(nova.profissionalId, tx);
      const agenda = await this.consultas.listarAgendadasNoIntervalo(nova.profissionalId, nova.inicio, nova.fim, tx);
      nova.garantirSemConflito(agenda); // regra de domínio → 409
      const consulta = await this.consultas.salvar(nova, tx);
      await this.outbox.adicionar(
        criarEvento(CONSULTA_AGENDADA, {
          consultaId: consulta.id!,
          pacienteId: consulta.pacienteId,
          profissionalId: consulta.profissionalId,
          profissionalNome: profissional.nome,
          inicio: consulta.inicio.toISOString(),
          fim: consulta.fim.toISOString(),
          sala: consulta.sala,
        }),
        tx,
      );
      await this.auditoria.registrar({ ator, acao: AcaoAuditoria.CONSULTA_AGENDADA, entidade: 'Consulta', entidadeId: consulta.id }, tx);
      return consulta;
    });

    return paraDto(salva, paciente.nome, profissional.nome);
  }
}

@Injectable()
export class CancelarConsultaUseCase {
  constructor(
    @Inject(CONSULTA_REPOSITORIO) private readonly consultas: ConsultaRepositorio,
    @Inject(UNIDADE_DE_TRABALHO) private readonly uow: UnidadeDeTrabalho,
    @Inject(OUTBOX) private readonly outbox: Outbox,
    @Inject(REGISTRO_AUDITORIA) private readonly auditoria: RegistroAuditoria,
  ) {}

  async executar(id: string, ator: UsuarioAutenticado): Promise<{ id: string; status: StatusConsulta }> {
    return this.uow.executar(async (tx) => {
      const consulta = await this.consultas.obter(id, tx);
      if (!consulta) throw new NaoEncontradoError('Consulta não encontrada.');
      consulta.cancelar();
      await this.consultas.salvar(consulta, tx);
      await this.outbox.adicionar(
        criarEvento(CONSULTA_CANCELADA, {
          consultaId: id,
          pacienteId: consulta.pacienteId,
          profissionalId: consulta.profissionalId,
          inicio: consulta.inicio.toISOString(),
        }),
        tx,
      );
      await this.auditoria.registrar({ ator, acao: AcaoAuditoria.CONSULTA_CANCELADA, entidade: 'Consulta', entidadeId: id }, tx);
      return { id, status: consulta.status };
    });
  }
}

@Injectable()
export class ListarConsultasUseCase {
  constructor(
    @Inject(CONSULTA_REPOSITORIO) private readonly consultas: ConsultaRepositorio,
    @Inject(PACIENTES_API) private readonly pacientes: PacientesApi,
    @Inject(CORPO_CLINICO_API) private readonly corpoClinico: CorpoClinicoApi,
  ) {}

  async executar(filtro: { profissionalId?: string; pacienteId?: string; data?: string }): Promise<ConsultaDto[]> {
    const de = filtro.data ? new Date(`${filtro.data}T00:00:00-03:00`) : undefined;
    const ate = de ? new Date(de.getTime() + 24 * 3600_000) : undefined;
    const lista = await this.consultas.listar({ profissionalId: filtro.profissionalId, pacienteId: filtro.pacienteId, de, ate });

    // Nomes vêm dos módulos donos dos dados, via contrato (cache local para evitar consultas repetidas).
    const nomesPac = new Map<string, string>();
    const nomesProf = new Map<string, string>();
    for (const c of lista) {
      if (!nomesPac.has(c.pacienteId)) nomesPac.set(c.pacienteId, (await this.pacientes.buscarResumo(c.pacienteId))?.nome ?? '—');
      if (!nomesProf.has(c.profissionalId)) {
        nomesProf.set(c.profissionalId, (await this.corpoClinico.buscarProfissional(c.profissionalId))?.nome ?? '—');
      }
    }
    return lista.map((c) => paraDto(c, nomesPac.get(c.pacienteId)!, nomesProf.get(c.profissionalId)!));
  }
}

function paraDto(c: Consulta, pacienteNome: string, profissionalNome: string): ConsultaDto {
  return {
    id: c.id!,
    pacienteId: c.pacienteId,
    pacienteNome,
    profissionalId: c.profissionalId,
    profissionalNome,
    inicio: c.inicio.toISOString(),
    fim: c.fim.toISOString(),
    status: c.status,
    sala: c.sala,
    observacao: c.observacao,
  };
}
