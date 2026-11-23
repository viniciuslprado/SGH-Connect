import { Global, Module } from '@nestjs/common';
import { PacientesController } from './api/pacientes.controller';
import {
  AtualizarPacienteUseCase,
  CadastrarPacienteUseCase,
  ConsultarPacientesUseCase,
  InativarPacienteUseCase,
  PacientesApiImpl,
} from './application/casos-de-uso';
import { PACIENTES_API } from './contracts';
import { PACIENTE_REPOSITORIO } from './domain/paciente';
import { PrismaPacienteRepositorio } from './infrastructure/prisma-paciente.repositorio';

/**
 * @Global apenas para EXPORTAR o token do contrato: os consumidores injetam
 * `@Inject(PACIENTES_API) PacientesApi` e importam somente `pacientes/contracts`.
 */
@Global()
@Module({
  controllers: [PacientesController],
  providers: [
    CadastrarPacienteUseCase,
    AtualizarPacienteUseCase,
    InativarPacienteUseCase,
    ConsultarPacientesUseCase,
    { provide: PACIENTE_REPOSITORIO, useClass: PrismaPacienteRepositorio },
    { provide: PACIENTES_API, useClass: PacientesApiImpl },
  ],
  exports: [PACIENTES_API],
})
export class PacientesModule {}
