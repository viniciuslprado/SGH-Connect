import { Inject, Injectable, Logger } from '@nestjs/common';
import { StatusNotificacao } from '@sgh/shared';
import { AoReceberEvento } from '../../../shared/eventos/outbox';
import { CONSULTA_AGENDADA, CONSULTA_CANCELADA, ConsultaAgendadaEvent, ConsultaCanceladaEvent } from '../../agendamento/contracts';
import { ATENDIMENTO_FINALIZADO, AtendimentoFinalizadoEvent } from '../../atendimento/contracts';
import { PACIENTES_API, PacientesApi } from '../../pacientes/contracts';
import { CANAL_NOTIFICACAO, CanalNotificacao, NOTIFICACAO_REPOSITORIO, NotificacaoRepositorio, dataHoraBrasil } from '../domain/notificacao';

/**
 * Notificações: Ca = 0 (ninguém chama este módulo). Só reage a eventos.
 * Mensagens NUNCA contêm conteúdo clínico — apenas datas e orientações administrativas.
 */
@Injectable()
export class NotificarPacienteHandler {
  private readonly logger = new Logger(NotificarPacienteHandler.name);

  constructor(
    @Inject(PACIENTES_API) private readonly pacientes: PacientesApi,
    @Inject(CANAL_NOTIFICACAO) private readonly canal: CanalNotificacao,
    @Inject(NOTIFICACAO_REPOSITORIO) private readonly repo: NotificacaoRepositorio,
  ) {}

  @AoReceberEvento(CONSULTA_AGENDADA)
  aoAgendar(e: ConsultaAgendadaEvent) {
    const { pacienteId, inicio, profissionalNome, sala } = e.payload;
    return this.notificar(e.eventId, pacienteId, 'Consulta confirmada — SGH Connect',
      `Sua consulta com ${profissionalNome} está confirmada para ${dataHoraBrasil(inicio)}${sala ? `, sala ${sala}` : ''}. Chegue com 15 minutos de antecedência.`);
  }

  @AoReceberEvento(CONSULTA_CANCELADA)
  aoCancelar(e: ConsultaCanceladaEvent) {
    return this.notificar(e.eventId, e.payload.pacienteId, 'Consulta cancelada — SGH Connect',
      `Sua consulta de ${dataHoraBrasil(e.payload.inicio)} foi cancelada. Entre em contato com a recepção para remarcar.`);
  }

  @AoReceberEvento(ATENDIMENTO_FINALIZADO)
  aoFinalizarAtendimento(e: AtendimentoFinalizadoEvent) {
    return this.notificar(e.eventId, e.payload.pacienteId, 'Atendimento concluído — SGH Connect',
      `Seu atendimento com ${e.payload.profissionalNome} foi concluído em ${dataHoraBrasil(e.payload.finalizadoEm)}. Siga as orientações recebidas presencialmente.`);
  }

  private async notificar(eventId: string, pacienteId: string, assunto: string, corpo: string): Promise<void> {
    if (await this.repo.jaNotificado(eventId)) return; // idempotência

    const contato = await this.pacientes.buscarContato(pacienteId);
    const destino = contato?.email ?? null;
    let status = StatusNotificacao.ENVIADA;
    if (!destino) {
      status = StatusNotificacao.FALHOU;
    } else {
      try {
        await this.canal.enviar({ destino, assunto, corpo: `Olá, ${contato!.nome}. ${corpo}` });
      } catch (erro) {
        this.logger.warn(`Falha ao enviar notificação: ${(erro as Error).message}`);
        status = StatusNotificacao.FALHOU;
      }
    }
    await this.repo.registrar({ eventId, pacienteId, canal: this.canal.nome, destino: destino ?? 'sem e-mail cadastrado', assunto, mensagem: corpo, status });
  }
}
