import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, PartialType } from '@nestjs/swagger';
import { Convenio, Perfil } from '@sgh/shared';
import { IsEmail, IsEnum, IsISO8601, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { Perfis, UsuarioAtual, UsuarioAutenticado } from '../../identidade/contracts';
import {
  AtualizarPacienteUseCase,
  CadastrarPacienteUseCase,
  ConsultarPacientesUseCase,
  InativarPacienteUseCase,
} from '../application/casos-de-uso';

export class CadastrarPacienteDto {
  /** @example Maria Aparecida Souza */
  @IsString()
  @MinLength(3, { message: 'Nome deve ter ao menos 3 caracteres.' })
  nome: string;

  /** Com ou sem máscara. @example 529.982.247-25 */
  @IsString()
  @IsNotEmpty({ message: 'Informe o CPF.' })
  cpf: string;

  /** ISO 8601 (AAAA-MM-DD). @example 1985-04-12 */
  @IsISO8601({ strict: true }, { message: 'Data de nascimento deve estar no formato AAAA-MM-DD.' })
  nascimento: string;

  @IsOptional()
  @IsString()
  telefone?: string;

  @IsOptional()
  @IsEmail({}, { message: 'E-mail inválido.' })
  email?: string;

  @IsEnum(Convenio, { message: `Convênio deve ser um de: ${Object.values(Convenio).join(', ')}` })
  convenio: Convenio;

  @IsOptional()
  @IsString()
  numeroCarteirinha?: string;
}

export class AtualizarPacienteDto extends PartialType(CadastrarPacienteDto) {}

const QUEM_GERENCIA = [Perfil.ADMIN, Perfil.RECEPCIONISTA];
const QUEM_CONSULTA = [...QUEM_GERENCIA, Perfil.MEDICO, Perfil.ENFERMEIRO, Perfil.GESTOR_LEITOS, Perfil.FATURISTA];

@ApiTags('Pacientes')
@ApiBearerAuth()
@Controller('pacientes')
export class PacientesController {
  constructor(
    private readonly cadastrar: CadastrarPacienteUseCase,
    private readonly atualizar: AtualizarPacienteUseCase,
    private readonly inativar: InativarPacienteUseCase,
    private readonly consultar: ConsultarPacientesUseCase,
  ) {}

  /** Pesquisa por nome ou CPF. */
  @Get()
  @Perfis(...QUEM_CONSULTA)
  pesquisar(@Query('termo') termo?: string, @Query('incluirInativos') incluirInativos?: string) {
    return this.consultar.pesquisar(termo, incluirInativos === 'true');
  }

  @Get(':id')
  @Perfis(...QUEM_CONSULTA)
  obter(@Param('id', ParseUUIDPipe) id: string) {
    return this.consultar.obter(id);
  }

  @Post()
  @Perfis(...QUEM_GERENCIA)
  criar(@Body() dto: CadastrarPacienteDto, @UsuarioAtual() ator: UsuarioAutenticado) {
    return this.cadastrar.executar(dto, ator);
  }

  @Patch(':id')
  @Perfis(...QUEM_GERENCIA)
  editar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AtualizarPacienteDto) {
    return this.atualizar.executar(id, dto);
  }

  /** Inativa (não exclui) o paciente. */
  @Patch(':id/inativar')
  @Perfis(...QUEM_GERENCIA)
  desativar(@Param('id', ParseUUIDPipe) id: string, @UsuarioAtual() ator: UsuarioAutenticado) {
    return this.inativar.executar(id, ator);
  }
}
