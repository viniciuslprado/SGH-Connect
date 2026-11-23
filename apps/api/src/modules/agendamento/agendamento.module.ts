import { Module } from '@nestjs/common';
import { ConsultasController } from './api/consultas.controller';
import { AgendarConsultaUseCase, CancelarConsultaUseCase, ListarConsultasUseCase } from './application/casos-de-uso';
import { CONSULTA_REPOSITORIO } from './domain/consulta';
import { PrismaConsultaRepositorio } from './infrastructure/prisma-consulta.repositorio';

@Module({
  controllers: [ConsultasController],
  providers: [
    AgendarConsultaUseCase,
    CancelarConsultaUseCase,
    ListarConsultasUseCase,
    { provide: CONSULTA_REPOSITORIO, useClass: PrismaConsultaRepositorio },
  ],
})
export class AgendamentoModule {}
