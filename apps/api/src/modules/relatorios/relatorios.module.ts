import { Controller, Get, Module, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Perfil } from '@sgh/shared';
import { ValidacaoError } from '../../shared/erros/erros';
import { Perfis } from '../identidade/contracts';
import { AtualizarProjecoesHandler, ConsultarRelatoriosUseCase } from './application/relatorios';
import { ProjecoesRepositorio } from './infrastructure/projecoes.repositorio';

/** Converte ?de=AAAA-MM-DD&ate=AAAA-MM-DD (inclusive) em intervalo UTC, horário de Brasília. */
function periodo(de?: string, ate?: string): [Date?, Date?] {
  if (!de || !ate) return [undefined, undefined];
  const ini = new Date(`${de}T00:00:00-03:00`);
  const fim = new Date(new Date(`${ate}T00:00:00-03:00`).getTime() + 24 * 3600_000);
  if (Number.isNaN(ini.getTime()) || Number.isNaN(fim.getTime())) throw new ValidacaoError('Use datas no formato AAAA-MM-DD.');
  return [ini, fim];
}

@ApiTags('Relatórios')
@ApiBearerAuth()
@Controller('relatorios')
export class RelatoriosController {
  constructor(private readonly relatorios: ConsultarRelatoriosUseCase) {}

  @Get('ocupacao')
  @Perfis(Perfil.ADMIN, Perfil.GESTOR_LEITOS)
  ocupacao() {
    return this.relatorios.ocupacao();
  }

  @Get('producao')
  @Perfis(Perfil.ADMIN)
  producao(@Query('de') de?: string, @Query('ate') ate?: string) {
    return this.relatorios.producao(...periodo(de, ate));
  }

  @Get('consultas')
  @Perfis(Perfil.ADMIN, Perfil.RECEPCIONISTA)
  consultas(@Query('de') de?: string, @Query('ate') ate?: string) {
    return this.relatorios.consultas(...periodo(de, ate));
  }
}

@Module({
  controllers: [RelatoriosController],
  providers: [AtualizarProjecoesHandler, ConsultarRelatoriosUseCase, ProjecoesRepositorio],
})
export class RelatoriosModule {}
