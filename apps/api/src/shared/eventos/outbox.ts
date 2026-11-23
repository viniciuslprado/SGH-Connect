import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { Transacao } from '../transacao';
import { EventoDominio } from './evento-dominio';

/** Porta usada pelos casos de uso para publicar eventos na MESMA transação da mudança de estado. */
export interface Outbox {
  adicionar(evento: EventoDominio, tx: Transacao): Promise<void>;
}

export const OUTBOX = Symbol('OUTBOX');

@Injectable()
export class PrismaOutbox implements Outbox {
  constructor(private readonly prisma: PrismaService) {}

  async adicionar(evento: EventoDominio, tx: Transacao): Promise<void> {
    await this.prisma.cliente(tx).outboxEvento.create({
      data: { id: evento.eventId, tipo: evento.tipo, payload: evento as unknown as Prisma.InputJsonValue },
    });
  }
}

/**
 * Marca um método como consumidor de um evento de domínio.
 * Erros NÃO são suprimidos: o worker registra a falha e reentrega o evento,
 * por isso todo consumidor precisa ser idempotente (usar eventId).
 */
export const AoReceberEvento = (tipo: string) => OnEvent(tipo, { suppressErrors: false });
