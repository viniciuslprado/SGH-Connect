import { Controller, Get, Global, Inject, Injectable, Module, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Perfil } from '@sgh/shared';
import { Perfis, UsuarioAutenticado } from '../../modules/identidade/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { Transacao } from '../transacao';

/**
 * Trilha de auditoria (kernel). Registra QUEM fez O QUÊ em QUAL entidade e QUANDO.
 * Por desenho, a porta não aceita texto livre: é impossível gravar conteúdo clínico no log.
 */
export enum AcaoAuditoria {
  LOGIN = 'LOGIN',
  USUARIO_CRIADO = 'USUARIO_CRIADO',
  PACIENTE_CADASTRADO = 'PACIENTE_CADASTRADO',
  PACIENTE_INATIVADO = 'PACIENTE_INATIVADO',
  CONSULTA_AGENDADA = 'CONSULTA_AGENDADA',
  CONSULTA_CANCELADA = 'CONSULTA_CANCELADA',
  ATENDIMENTO_ABERTO = 'ATENDIMENTO_ABERTO',
  PRONTUARIO_LIDO = 'PRONTUARIO_LIDO',
  REGISTRO_CLINICO_INCLUIDO = 'REGISTRO_CLINICO_INCLUIDO',
  ATENDIMENTO_FINALIZADO = 'ATENDIMENTO_FINALIZADO',
  PACIENTE_INTERNADO = 'PACIENTE_INTERNADO',
  PACIENTE_TRANSFERIDO = 'PACIENTE_TRANSFERIDO',
  ALTA_REGISTRADA = 'ALTA_REGISTRADA',
  CONTA_FECHADA = 'CONTA_FECHADA',
}

export interface EntradaAuditoria {
  ator: Pick<UsuarioAutenticado, 'id' | 'email'> | null;
  acao: AcaoAuditoria;
  entidade: string;
  entidadeId?: string;
}

export interface RegistroAuditoria {
  registrar(entrada: EntradaAuditoria, tx?: Transacao): Promise<void>;
}

export const REGISTRO_AUDITORIA = Symbol('REGISTRO_AUDITORIA');

@Injectable()
export class PrismaRegistroAuditoria implements RegistroAuditoria {
  constructor(private readonly prisma: PrismaService) {}

  async registrar({ ator, acao, entidade, entidadeId }: EntradaAuditoria, tx?: Transacao): Promise<void> {
    await this.prisma.cliente(tx).registroAuditoria.create({
      data: { atorId: ator?.id ?? null, atorEmail: ator?.email ?? null, acao, entidade, entidadeId },
    });
  }
}

@ApiTags('Auditoria')
@ApiBearerAuth()
@Controller('auditoria')
export class AuditoriaController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /** Últimos registros de auditoria (somente Administrador). */
  @Get()
  @Perfis(Perfil.ADMIN)
  listar(@Query('acao') acao?: string) {
    return this.prisma.registroAuditoria.findMany({
      where: acao ? { acao } : undefined,
      orderBy: { criadoEm: 'desc' },
      take: 200,
    });
  }
}

@Global()
@Module({
  controllers: [AuditoriaController],
  providers: [{ provide: REGISTRO_AUDITORIA, useClass: PrismaRegistroAuditoria }],
  exports: [REGISTRO_AUDITORIA],
})
export class AuditoriaModule {}
