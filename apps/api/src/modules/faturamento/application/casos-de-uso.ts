import { Inject, Injectable, Logger } from '@nestjs/common';
import { StatusConta } from '@sgh/shared';
import { AcaoAuditoria, REGISTRO_AUDITORIA, RegistroAuditoria } from '../../../shared/auditoria/auditoria';
import { NaoEncontradoError } from '../../../shared/erros/erros';
import { AoReceberEvento } from '../../../shared/eventos/outbox';
import { UNIDADE_DE_TRABALHO, UnidadeDeTrabalho } from '../../../shared/transacao';
import { ATENDIMENTO_FINALIZADO, AtendimentoFinalizadoEvent } from '../../atendimento/contracts';
import { UsuarioAutenticado } from '../../identidade/contracts';
import { ALTA_REGISTRADA, AltaRegistradaEvent } from '../../internacao/contracts';
import { PACIENTES_API, PacientesApi } from '../../pacientes/contracts';
import { CONTA_REPOSITORIO, Conta, ContaRepositorio } from '../domain/conta';

export interface ContaDto {
  id: string;
  pacienteId: string;
  pacienteNome: string;
  convenio: string;
  status: StatusConta;
  abertaEm: string;
  fechadaEm: string | null;
  total: number;
  itens: { codigo: string; descricao: string; quantidade: number; valorUnitario: number; subtotal: number }[];
}

/**
 * Consumidor de eventos. Ninguém chama o Faturamento (Ca = 0): ele REAGE a fatos clínicos.
 * Idempotente: o mesmo evento entregue duas vezes gera itens uma única vez.
 */
@Injectable()
export class LancarItensDaContaHandler {
  private readonly logger = new Logger(LancarItensDaContaHandler.name);

  constructor(
    @Inject(CONTA_REPOSITORIO) private readonly contas: ContaRepositorio,
    @Inject(PACIENTES_API) private readonly pacientes: PacientesApi,
    @Inject(UNIDADE_DE_TRABALHO) private readonly uow: UnidadeDeTrabalho,
  ) {}

  @AoReceberEvento(ATENDIMENTO_FINALIZADO)
  async aoFinalizarAtendimento(evento: AtendimentoFinalizadoEvent): Promise<void> {
    await this.lancar(evento.eventId, evento.payload.pacienteId, evento.payload.procedimentos);
  }

  @AoReceberEvento(ALTA_REGISTRADA)
  async aoRegistrarAlta(evento: AltaRegistradaEvent): Promise<void> {
    const { pacienteId, tipoLeito, diarias } = evento.payload;
    await this.lancar(evento.eventId, pacienteId, [{ codigo: `DIARIA_${tipoLeito}`, quantidade: diarias }]);
  }

  private async lancar(eventId: string, pacienteId: string, procedimentos: { codigo: string; quantidade: number }[]): Promise<void> {
    const paciente = await this.pacientes.buscarResumo(pacienteId);
    if (!paciente) throw new NaoEncontradoError(`Paciente ${pacienteId} não encontrado para faturamento.`);

    await this.uow.executar(async (tx) => {
      if (!(await this.contas.marcarEventoProcessado(eventId, tx))) {
        this.logger.log(`Evento ${eventId} já processado — ignorado (idempotência).`);
        return;
      }
      const conta = (await this.contas.obterAbertaDoPaciente(pacienteId, tx)) ?? Conta.abrir(pacienteId, paciente.convenio);
      procedimentos.forEach((p) => conta.lancar({ ...p, origemEventoId: eventId }));
      await this.contas.salvar(conta, tx);
    });
  }
}

@Injectable()
export class FecharContaUseCase {
  constructor(
    @Inject(CONTA_REPOSITORIO) private readonly contas: ContaRepositorio,
    @Inject(UNIDADE_DE_TRABALHO) private readonly uow: UnidadeDeTrabalho,
    @Inject(REGISTRO_AUDITORIA) private readonly auditoria: RegistroAuditoria,
  ) {}

  async executar(id: string, ator: UsuarioAutenticado): Promise<Conta> {
    return this.uow.executar(async (tx) => {
      const conta = await this.contas.obter(id, tx);
      if (!conta) throw new NaoEncontradoError('Conta não encontrada.');
      conta.fechar();
      const salva = await this.contas.salvar(conta, tx);
      await this.auditoria.registrar({ ator, acao: AcaoAuditoria.CONTA_FECHADA, entidade: 'Conta', entidadeId: id }, tx);
      return salva;
    });
  }
}

@Injectable()
export class ConsultarContasUseCase {
  constructor(
    @Inject(CONTA_REPOSITORIO) private readonly contas: ContaRepositorio,
    @Inject(PACIENTES_API) private readonly pacientes: PacientesApi,
  ) {}

  async listar(filtro: { pacienteId?: string; status?: StatusConta }): Promise<ContaDto[]> {
    const out: ContaDto[] = [];
    for (const c of await this.contas.listar(filtro)) out.push(await this.paraDto(c));
    return out;
  }

  async paraDto(c: Conta): Promise<ContaDto> {
    const reais = (centavos: number) => centavos / 100;
    return {
      id: c.id!,
      pacienteId: c.pacienteId,
      pacienteNome: (await this.pacientes.buscarResumo(c.pacienteId))?.nome ?? '—',
      convenio: c.convenio,
      status: c.status,
      abertaEm: c.abertaEm.toISOString(),
      fechadaEm: c.fechadaEm?.toISOString() ?? null,
      total: reais(c.totalCentavos()),
      itens: c.itens.map((i) => ({
        codigo: i.codigo,
        descricao: i.descricao,
        quantidade: i.quantidade,
        valorUnitario: reais(i.valorUnitarioCentavos),
        subtotal: reais(i.quantidade * i.valorUnitarioCentavos),
      })),
    };
  }
}
