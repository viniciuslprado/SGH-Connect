import { Global, Injectable, Module } from '@nestjs/common';
import { Transacao, UNIDADE_DE_TRABALHO, UnidadeDeTrabalho } from '../transacao';
import { PrismaService } from './prisma.service';

@Injectable()
export class PrismaUnidadeDeTrabalho implements UnidadeDeTrabalho {
  constructor(private readonly prisma: PrismaService) {}

  executar<T>(trabalho: (tx: Transacao) => Promise<T>): Promise<T> {
    return this.prisma.$transaction((tx) => trabalho(tx), { timeout: 15_000 });
  }
}

@Global()
@Module({
  providers: [PrismaService, { provide: UNIDADE_DE_TRABALHO, useClass: PrismaUnidadeDeTrabalho }],
  exports: [PrismaService, UNIDADE_DE_TRABALHO],
})
export class PrismaModule {}
