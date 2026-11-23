import { Injectable, Logger } from '@nestjs/common';
import { StatusNotificacao } from '@sgh/shared';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { CanalNotificacao, Mensagem, NotificacaoRepositorio, RegistroNotificacao } from '../domain/notificacao';

/** Adaptador de desenvolvimento: "envia" o e-mail escrevendo no log (nenhum e-mail real sai). */
@Injectable()
export class ConsoleEmailAdapter implements CanalNotificacao {
  readonly nome = 'EMAIL';
  private readonly logger = new Logger('E-mail (simulado)');

  async enviar(m: Mensagem): Promise<void> {
    this.logger.log(`→ ${m.destino} | ${m.assunto} | ${m.corpo}`);
  }
}

@Injectable()
export class PrismaNotificacaoRepositorio implements NotificacaoRepositorio {
  constructor(private readonly prisma: PrismaService) {}

  async jaNotificado(eventId: string) {
    return (await this.prisma.notificacao.count({ where: { eventId } })) > 0;
  }

  async registrar(n: RegistroNotificacao) {
    // skipDuplicates: se duas entregas do mesmo evento correrem juntas, só uma é gravada.
    await this.prisma.notificacao.createMany({ data: [n], skipDuplicates: true });
  }

  async listar() {
    const rs = await this.prisma.notificacao.findMany({ orderBy: { enviadaEm: 'desc' }, take: 200 });
    return rs.map((r) => ({ ...r, status: r.status as StatusNotificacao }));
  }
}
