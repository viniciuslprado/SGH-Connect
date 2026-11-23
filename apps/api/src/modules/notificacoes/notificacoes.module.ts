import { Controller, Get, Inject, Module } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Perfil } from '@sgh/shared';
import { Perfis } from '../identidade/contracts';
import { NotificarPacienteHandler } from './application/notificar-paciente.handler';
import { CANAL_NOTIFICACAO, NOTIFICACAO_REPOSITORIO, NotificacaoRepositorio } from './domain/notificacao';
import { ConsoleEmailAdapter, PrismaNotificacaoRepositorio } from './infrastructure/adaptadores';

@ApiTags('Notificações')
@ApiBearerAuth()
@Controller('notificacoes')
export class NotificacoesController {
  constructor(@Inject(NOTIFICACAO_REPOSITORIO) private readonly repo: NotificacaoRepositorio) {}

  /** Histórico de notificações enviadas aos pacientes. */
  @Get()
  @Perfis(Perfil.ADMIN, Perfil.RECEPCIONISTA)
  listar() {
    return this.repo.listar();
  }
}

@Module({
  controllers: [NotificacoesController],
  providers: [
    NotificarPacienteHandler,
    { provide: CANAL_NOTIFICACAO, useClass: ConsoleEmailAdapter },
    { provide: NOTIFICACAO_REPOSITORIO, useClass: PrismaNotificacaoRepositorio },
  ],
})
export class NotificacoesModule {}
