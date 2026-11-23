import { Module } from '@nestjs/common';
import { ContasController } from './api/contas.controller';
import { ConsultarContasUseCase, FecharContaUseCase, LancarItensDaContaHandler } from './application/casos-de-uso';
import { CONTA_REPOSITORIO } from './domain/conta';
import { PrismaContaRepositorio } from './infrastructure/prisma-conta.repositorio';

@Module({
  controllers: [ContasController],
  providers: [
    LancarItensDaContaHandler,
    FecharContaUseCase,
    ConsultarContasUseCase,
    { provide: CONTA_REPOSITORIO, useClass: PrismaContaRepositorio },
  ],
})
export class FaturamentoModule {}
