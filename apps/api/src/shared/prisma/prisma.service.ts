import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { Transacao } from '../transacao';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /** Devolve o cliente da transação corrente, ou o cliente padrão se não houver transação. */
  cliente(tx?: Transacao): Prisma.TransactionClient {
    return (tx as Prisma.TransactionClient | undefined) ?? this;
  }
}
