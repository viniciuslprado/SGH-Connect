import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Perfil } from '@sgh/shared';
import { IsInt, IsISO8601, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { Perfis, UsuarioAtual, UsuarioAutenticado } from '../../identidade/contracts';
import { AgendarConsultaCommand } from '../application/agendar-consulta.command';
import { AgendarConsultaUseCase, CancelarConsultaUseCase, ListarConsultasUseCase } from '../application/casos-de-uso';

export class AgendarConsultaDto implements AgendarConsultaCommand {
  @IsUUID('4', { message: 'pacienteId deve ser um UUID.' })
  pacienteId: string;

  @IsUUID('4', { message: 'profissionalId deve ser um UUID.' })
  profissionalId: string;

  /** ISO 8601 com fuso. @example 2026-12-01T14:00:00-03:00 */
  @IsISO8601({ strict: true }, { message: 'inicio deve ser data/hora ISO 8601 (ex.: 2026-12-01T14:00:00-03:00).' })
  inicio: string;

  /** @example 30 */
  @IsInt({ message: 'duracaoMin deve ser um número inteiro de minutos.' })
  @Min(10)
  @Max(240)
  duracaoMin: number;

  @IsOptional()
  @IsString()
  sala?: string;

  @IsOptional()
  @IsString()
  observacao?: string;
}

const AGENDA = [Perfil.ADMIN, Perfil.RECEPCIONISTA];

@ApiTags('Agendamento')
@ApiBearerAuth()
@Controller('consultas')
export class ConsultasController {
  constructor(
    private readonly agendar: AgendarConsultaUseCase,
    private readonly cancelar: CancelarConsultaUseCase,
    private readonly listar: ListarConsultasUseCase,
  ) {}

  /** Lista consultas. `data` no formato AAAA-MM-DD (dia em horário de Brasília). */
  @Get()
  @Perfis(...AGENDA, Perfil.MEDICO, Perfil.ENFERMEIRO)
  listarConsultas(
    @Query('profissionalId') profissionalId?: string,
    @Query('pacienteId') pacienteId?: string,
    @Query('data') data?: string,
  ) {
    return this.listar.executar({ profissionalId, pacienteId, data });
  }

  /** Agenda consulta. Retorna 409 se o profissional já tiver consulta no horário. */
  @Post()
  @Perfis(...AGENDA)
  agendarConsulta(@Body() dto: AgendarConsultaDto, @UsuarioAtual() ator: UsuarioAutenticado) {
    return this.agendar.executar(dto, ator);
  }

  @Patch(':id/cancelar')
  @Perfis(...AGENDA)
  cancelarConsulta(@Param('id', ParseUUIDPipe) id: string, @UsuarioAtual() ator: UsuarioAutenticado) {
    return this.cancelar.executar(id, ator);
  }
}
