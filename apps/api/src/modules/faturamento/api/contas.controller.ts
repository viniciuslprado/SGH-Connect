import { Controller, Get, Param, ParseUUIDPipe, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Perfil, StatusConta } from '@sgh/shared';
import { Perfis, UsuarioAtual, UsuarioAutenticado } from '../../identidade/contracts';
import { ConsultarContasUseCase, FecharContaUseCase } from '../application/casos-de-uso';

const FATURAMENTO = [Perfil.ADMIN, Perfil.FATURISTA];

@ApiTags('Faturamento')
@ApiBearerAuth()
@Controller('contas')
@Perfis(...FATURAMENTO)
export class ContasController {
  constructor(private readonly consultar: ConsultarContasUseCase, private readonly fechar: FecharContaUseCase) {}

  /** Contas geradas automaticamente pelos eventos AtendimentoFinalizado e AltaRegistrada. */
  @Get()
  listar(@Query('pacienteId') pacienteId?: string, @Query('status') status?: StatusConta) {
    return this.consultar.listar({ pacienteId, status });
  }

  @Patch(':id/fechar')
  async fecharConta(@Param('id', ParseUUIDPipe) id: string, @UsuarioAtual() ator: UsuarioAutenticado) {
    return this.consultar.paraDto(await this.fechar.executar(id, ator));
  }
}
