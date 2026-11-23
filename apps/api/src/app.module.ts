import { Module } from '@nestjs/common';
import { AuditoriaModule } from './shared/auditoria/auditoria';
import { EventosModule } from './shared/eventos/eventos.module';
import { PrismaModule } from './shared/prisma/prisma.module';
import { IdentidadeModule } from './modules/identidade/identidade.module';
import { PacientesModule } from './modules/pacientes/pacientes.module';
import { CorpoClinicoModule } from './modules/corpo-clinico/corpo-clinico.module';
import { AgendamentoModule } from './modules/agendamento/agendamento.module';
import { AtendimentoModule } from './modules/atendimento/atendimento.module';
import { InternacaoModule } from './modules/internacao/internacao.module';

/**
 * Raiz da composição. É o ÚNICO lugar que conhece todos os módulos:
 * os módulos não importam uns aos outros, só os contratos.
 */
@Module({
  imports: [
    // kernel
    PrismaModule,
    EventosModule,
    AuditoriaModule,
    // módulos-base
    IdentidadeModule,
    PacientesModule,
    CorpoClinicoModule,
    // módulos de processo
    AgendamentoModule,
    AtendimentoModule,
    InternacaoModule,
  ],
})
export class AppModule {}
