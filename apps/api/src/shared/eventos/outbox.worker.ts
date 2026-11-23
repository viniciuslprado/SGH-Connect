import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { EventoDominio } from './evento-dominio';

const MAX_TENTATIVAS = 5;

/**
 * Despacha eventos do outbox SOMENTE depois do commit da transação que os gravou
 * (conascência temporal reduzida — documento, seção 7.8).
 * `FOR UPDATE SKIP LOCKED` permite várias instâncias da API sem entregar o mesmo evento em paralelo.
 */
@Injectable()
export class OutboxWorker implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(OutboxWorker.name);
  private timer?: NodeJS.Timeout;
  private processando = false;

  constructor(private readonly prisma: PrismaService, private readonly emissor: EventEmitter2) {}

  onApplicationBootstrap() {
    const intervalo = Number(process.env.OUTBOX_INTERVAL_MS ?? 500);
    if (intervalo > 0) this.timer = setInterval(() => void this.processarPendentes(), intervalo);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  /** Processa um lote de eventos pendentes. Retorna quantos foram entregues com sucesso. */
  async processarPendentes(limite = 50): Promise<number> {
    if (this.processando) return 0;
    this.processando = true;
    let entregues = 0;
    try {
      await this.prisma.$transaction(
        async (tx) => {
          const pendentes = await tx.$queryRaw<{ id: string; payload: EventoDominio }[]>`
            SELECT id, payload FROM "shared"."OutboxEvento"
            WHERE "processadoEm" IS NULL AND tentativas < ${MAX_TENTATIVAS}
            ORDER BY "criadoEm" ASC
            LIMIT ${limite}
            FOR UPDATE SKIP LOCKED`;

          for (const { id, payload: evento } of pendentes) {
            try {
              await this.emissor.emitAsync(evento.tipo, evento);
              await tx.outboxEvento.update({ where: { id }, data: { processadoEm: new Date() } });
              entregues++;
            } catch (erro) {
              const mensagem = String((erro as Error)?.message ?? erro).slice(0, 500);
              this.logger.warn(`Falha ao entregar ${evento.tipo} (${id}): ${mensagem}`);
              await tx.outboxEvento.update({
                where: { id },
                data: { tentativas: { increment: 1 }, ultimoErro: mensagem },
              });
            }
          }
        },
        { timeout: 30_000 },
      );
    } catch (erro) {
      this.logger.error(`Falha no lote do outbox: ${(erro as Error).message}`);
    } finally {
      this.processando = false;
    }
    return entregues;
  }
}
