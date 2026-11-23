import { Module } from '@nestjs/common';
import { InternacaoController } from './api/internacao.controller';
import {
  ConsultarInternacoesUseCase,
  GerenciarLeitosUseCase,
  RegistrarAltaUseCase,
  TransferirLeitoUseCase,
} from './application/casos-de-uso';
import { InternarPacienteUseCase } from './application/internar-paciente.use-case';
import { INTERNACAO_REPOSITORIO, LEITO_REPOSITORIO } from './domain/internacao';
import { PrismaInternacaoRepositorio, PrismaLeitoRepositorio } from './infrastructure/repositorios';

@Module({
  controllers: [InternacaoController],
  providers: [
    InternarPacienteUseCase,
    RegistrarAltaUseCase,
    TransferirLeitoUseCase,
    GerenciarLeitosUseCase,
    ConsultarInternacoesUseCase,
    { provide: LEITO_REPOSITORIO, useClass: PrismaLeitoRepositorio },
    { provide: INTERNACAO_REPOSITORIO, useClass: PrismaInternacaoRepositorio },
  ],
})
export class InternacaoModule {}
