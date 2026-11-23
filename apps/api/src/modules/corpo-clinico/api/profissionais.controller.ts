import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, PartialType } from '@nestjs/swagger';
import { Perfil, TipoProfissional } from '@sgh/shared';
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { Perfis } from '../../identidade/contracts';
import {
  AtualizarProfissionalUseCase,
  CadastrarProfissionalUseCase,
  ListarProfissionaisUseCase,
} from '../application/casos-de-uso';

export class CadastrarProfissionalDto {
  /** @example Dra. Helena Ribeiro */
  @IsString()
  @IsNotEmpty({ message: 'Informe o nome.' })
  nome: string;

  @IsEnum(TipoProfissional, { message: 'Tipo deve ser MEDICO ou ENFERMEIRO.' })
  tipo: TipoProfissional;

  /** CRM-UF 123456 ou COREN-UF 123456. @example CRM-SP 123456 */
  @IsString()
  registro: string;

  /** @example Cardiologia */
  @IsString()
  especialidade: string;

  /** Usuário do módulo Identidade vinculado (referência por id). */
  @IsOptional()
  @IsUUID('4', { message: 'usuarioId deve ser um UUID.' })
  usuarioId?: string;
}

export class AtualizarProfissionalDto extends PartialType(CadastrarProfissionalDto) {
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}

@ApiTags('Corpo Clínico')
@ApiBearerAuth()
@Controller('profissionais')
export class ProfissionaisController {
  constructor(
    private readonly cadastrar: CadastrarProfissionalUseCase,
    private readonly atualizar: AtualizarProfissionalUseCase,
    private readonly listar: ListarProfissionaisUseCase,
  ) {}

  @Get()
  listarTodos(@Query('tipo') tipo?: TipoProfissional, @Query('incluirInativos') incluirInativos?: string) {
    return this.listar.executar(tipo, incluirInativos === 'true');
  }

  @Post()
  @Perfis(Perfil.ADMIN)
  criar(@Body() dto: CadastrarProfissionalDto) {
    return this.cadastrar.executar(dto);
  }

  /** Edita ou ativa/inativa (ativo=false) o profissional. */
  @Patch(':id')
  @Perfis(Perfil.ADMIN)
  editar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AtualizarProfissionalDto) {
    return this.atualizar.executar(id, dto);
  }
}
