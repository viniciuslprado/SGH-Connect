import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Perfil, StatusInternacao, TipoLeito } from '@sgh/shared';
import { IsEnum, IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { Perfis, UsuarioAtual, UsuarioAutenticado } from '../../identidade/contracts';
import {
  ConsultarInternacoesUseCase,
  GerenciarLeitosUseCase,
  RegistrarAltaUseCase,
  TransferirLeitoUseCase,
} from '../application/casos-de-uso';
import { InternarPacienteCommand, InternarPacienteUseCase } from '../application/internar-paciente.use-case';

export class InternarDto implements InternarPacienteCommand {
  @IsUUID('4', { message: 'pacienteId deve ser um UUID.' })
  pacienteId: string;

  @IsUUID('4', { message: 'leitoId deve ser um UUID.' })
  leitoId: string;

  /** @example Pneumonia comunitária — observação (fictício) */
  @IsString()
  @IsNotEmpty({ message: 'Informe o motivo da internação.' })
  motivo: string;
}

export class TransferirDto {
  @IsUUID('4', { message: 'novoLeitoId deve ser um UUID.' })
  novoLeitoId: string;
}

export class CadastrarLeitoDto {
  /** @example UTI-05 */
  @IsString()
  @IsNotEmpty()
  codigo: string;

  /** @example UTI Adulto */
  @IsString()
  @IsNotEmpty()
  ala: string;

  @IsEnum(TipoLeito, { message: `tipo deve ser um de: ${Object.values(TipoLeito).join(', ')}` })
  tipo: TipoLeito;
}

const GESTAO = [Perfil.ADMIN, Perfil.GESTOR_LEITOS];
const VISUALIZA = [...GESTAO, Perfil.MEDICO, Perfil.ENFERMEIRO, Perfil.RECEPCIONISTA];

@ApiTags('Internação e Leitos')
@ApiBearerAuth()
@Controller()
export class InternacaoController {
  constructor(
    private readonly internar: InternarPacienteUseCase,
    private readonly alta: RegistrarAltaUseCase,
    private readonly transferir: TransferirLeitoUseCase,
    private readonly leitos: GerenciarLeitosUseCase,
    private readonly consultar: ConsultarInternacoesUseCase,
  ) {}

  /** Mapa de leitos com o paciente de cada leito ocupado. */
  @Get('leitos')
  @Perfis(...VISUALIZA)
  mapa() {
    return this.consultar.mapa();
  }

  @Post('leitos')
  @Perfis(...GESTAO)
  async cadastrarLeito(@Body() dto: CadastrarLeitoDto) {
    const l = await this.leitos.cadastrar(dto);
    return { id: l.id, codigo: l.codigo, ala: l.ala, tipo: l.tipo, status: l.status };
  }

  /** HIGIENIZACAO/MANUTENCAO → LIVRE. */
  @Patch('leitos/:id/liberar')
  @Perfis(...GESTAO, Perfil.ENFERMEIRO)
  async liberar(@Param('id', ParseUUIDPipe) id: string) {
    const l = await this.leitos.liberar(id);
    return { id: l.id, codigo: l.codigo, status: l.status };
  }

  @Patch('leitos/:id/manutencao')
  @Perfis(...GESTAO)
  async manutencao(@Param('id', ParseUUIDPipe) id: string) {
    const l = await this.leitos.manutencao(id);
    return { id: l.id, codigo: l.codigo, status: l.status };
  }

  @Get('internacoes')
  @Perfis(...VISUALIZA)
  listar(@Query('status') status?: StatusInternacao) {
    return this.consultar.listar(status);
  }

  /** Interna em leito LIVRE. Leito ocupado ou corrida concorrente → 409. */
  @Post('internacoes')
  @Perfis(...GESTAO)
  async internarPaciente(@Body() dto: InternarDto, @UsuarioAtual() ator: UsuarioAutenticado) {
    return this.consultar.paraDto(await this.internar.executar(dto, ator));
  }

  @Patch('internacoes/:id/transferir')
  @Perfis(...GESTAO)
  async transferirLeito(@Param('id', ParseUUIDPipe) id: string, @Body() dto: TransferirDto, @UsuarioAtual() ator: UsuarioAutenticado) {
    return this.consultar.paraDto(await this.transferir.executar(id, dto.novoLeitoId, ator));
  }

  /** Encerra a internação e coloca o leito em HIGIENIZACAO na mesma transação. */
  @Patch('internacoes/:id/alta')
  @Perfis(...GESTAO, Perfil.MEDICO)
  async registrarAlta(@Param('id', ParseUUIDPipe) id: string, @UsuarioAtual() ator: UsuarioAutenticado) {
    return this.consultar.paraDto(await this.alta.executar(id, ator));
  }
}
