import { Module } from '@nestjs/common';
import { AtendimentosController } from './api/atendimentos.controller';
import {
  AbrirAtendimentoUseCase,
  ConsultarAtendimentosUseCase,
  FinalizarAtendimentoUseCase,
  NomesAtendimento,
  RegistrarEvolucaoUseCase,
  RegistrarTriagemUseCase,
} from './application/casos-de-uso';
import { ATENDIMENTO_REPOSITORIO } from './domain/atendimento';
import { PrismaAtendimentoRepositorio } from './infrastructure/prisma-atendimento.repositorio';

@Module({
  controllers: [AtendimentosController],
  providers: [
    NomesAtendimento,
    AbrirAtendimentoUseCase,
    RegistrarTriagemUseCase,
    RegistrarEvolucaoUseCase,
    FinalizarAtendimentoUseCase,
    ConsultarAtendimentosUseCase,
    { provide: ATENDIMENTO_REPOSITORIO, useClass: PrismaAtendimentoRepositorio },
  ],
})
export class AtendimentoModule {}
