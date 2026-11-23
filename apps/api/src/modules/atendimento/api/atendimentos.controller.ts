import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ClassificacaoRisco, Perfil, StatusAtendimento } from '@sgh/shared';
import { IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { Perfis, UsuarioAtual, UsuarioAutenticado } from '../../identidade/contracts';
import {
  AbrirAtendimentoCommand,
  AbrirAtendimentoUseCase,
  ConsultarAtendimentosUseCase,
  FinalizarAtendimentoUseCase,
  RegistrarEvolucaoUseCase,
  RegistrarTriagemUseCase,
  RegistroClinicoCommand,
  TriagemCommand,
} from '../application/casos-de-uso';

export class AbrirAtendimentoDto implements AbrirAtendimentoCommand {
  @IsUUID('4', { message: 'pacienteId deve ser um UUID.' })
  pacienteId: string;

  @IsUUID('4', { message: 'profissionalId deve ser um UUID.' })
  profissionalId: string;

  /** Consulta de origem (referência por id ao módulo Agendamento). */
  @IsOptional()
  @IsUUID('4')
  consultaId?: string;
}

export class TriagemDto implements TriagemCommand {
  @IsEnum(ClassificacaoRisco, { message: `classificacaoRisco deve ser um de: ${Object.values(ClassificacaoRisco).join(', ')}` })
  classificacaoRisco: ClassificacaoRisco;

  /** @example Dor torácica há 2 horas */
  @IsString()
  @IsNotEmpty({ message: 'Informe a queixa principal.' })
  queixaPrincipal: string;

  /** @example 120x80 */
  @IsOptional()
  @IsString()
  pressaoArterial?: string;

  @IsOptional()
  @IsNumber()
  temperatura?: number;

  @IsOptional()
  @IsInt()
  @Min(20)
  @Max(250)
  frequenciaCardiaca?: number;

  @IsOptional()
  @IsInt()
  saturacao?: number;
}

export class RegistroClinicoDto implements RegistroClinicoCommand {
  @IsOptional()
  @IsString()
  anamnese?: string;

  /** @example I10 */
  @IsOptional()
  @IsString()
  cid?: string;

  /** @example Orientações e retorno em 30 dias (texto fictício) */
  @IsString()
  @IsNotEmpty({ message: 'Informe a conduta.' })
  conduta: string;

  @IsOptional()
  @IsString()
  prescricao?: string;
}

const CLINICOS = [Perfil.MEDICO, Perfil.ENFERMEIRO];

@ApiTags('Atendimento')
@ApiBearerAuth()
@Controller('atendimentos')
export class AtendimentosController {
  constructor(
    private readonly abrir: AbrirAtendimentoUseCase,
    private readonly triagem: RegistrarTriagemUseCase,
    private readonly evolucao: RegistrarEvolucaoUseCase,
    private readonly finalizar: FinalizarAtendimentoUseCase,
    private readonly consultar: ConsultarAtendimentosUseCase,
  ) {}

  /** Lista resumida (sem conteúdo clínico). */
  @Get()
  @Perfis(Perfil.ADMIN, Perfil.RECEPCIONISTA, ...CLINICOS)
  listar(@Query('status') status?: StatusAtendimento, @Query('pacienteId') pacienteId?: string) {
    return this.consultar.listar({ status, pacienteId });
  }

  /** Prontuário completo. Somente MEDICO/ENFERMEIRO; cada leitura é auditada. */
  @Get(':id')
  @Perfis(...CLINICOS)
  prontuario(@Param('id', ParseUUIDPipe) id: string, @UsuarioAtual() ator: UsuarioAutenticado) {
    return this.consultar.prontuario(id, ator);
  }

  @Post()
  @Perfis(Perfil.RECEPCIONISTA, ...CLINICOS)
  abrirAtendimento(@Body() dto: AbrirAtendimentoDto, @UsuarioAtual() ator: UsuarioAutenticado) {
    return this.abrir.executar(dto, ator);
  }

  @Patch(':id/triagem')
  @Perfis(...CLINICOS)
  registrarTriagem(@Param('id', ParseUUIDPipe) id: string, @Body() dto: TriagemDto, @UsuarioAtual() ator: UsuarioAutenticado) {
    return this.triagem.executar(id, dto, ator);
  }

  /** Inclui registro clínico/evolução. Atendimento finalizado → 422. */
  @Patch(':id/registro-clinico')
  @Perfis(...CLINICOS)
  registrarClinico(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RegistroClinicoDto, @UsuarioAtual() ator: UsuarioAutenticado) {
    return this.evolucao.executar(id, dto, ator);
  }

  @Patch(':id/finalizar')
  @Perfis(Perfil.MEDICO)
  finalizarAtendimento(@Param('id', ParseUUIDPipe) id: string, @UsuarioAtual() ator: UsuarioAutenticado) {
    return this.finalizar.executar(id, ator);
  }
}
