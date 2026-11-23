import { Global, Module } from '@nestjs/common';
import { ProfissionaisController } from './api/profissionais.controller';
import {
  AtualizarProfissionalUseCase,
  CadastrarProfissionalUseCase,
  CorpoClinicoApiImpl,
  ListarProfissionaisUseCase,
} from './application/casos-de-uso';
import { CORPO_CLINICO_API } from './contracts';
import { PROFISSIONAL_REPOSITORIO } from './domain/profissional';
import { PrismaProfissionalRepositorio } from './infrastructure/prisma-profissional.repositorio';

@Global()
@Module({
  controllers: [ProfissionaisController],
  providers: [
    CadastrarProfissionalUseCase,
    AtualizarProfissionalUseCase,
    ListarProfissionaisUseCase,
    { provide: PROFISSIONAL_REPOSITORIO, useClass: PrismaProfissionalRepositorio },
    { provide: CORPO_CLINICO_API, useClass: CorpoClinicoApiImpl },
  ],
  exports: [CORPO_CLINICO_API],
})
export class CorpoClinicoModule {}
