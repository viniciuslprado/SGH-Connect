import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Perfil } from '@sgh/shared';
import { IsEmail, IsEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { AutenticarUsuarioUseCase, CriarUsuarioUseCase, ListarUsuariosUseCase } from '../application/casos-de-uso';
import { Perfis, Publico, UsuarioAtual, UsuarioAutenticado } from '../contracts';

export class LoginDto {
  /** @example admin@sgh.local */
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  email: string;

  /** @example sgh@2026 */
  @IsString()
  @IsNotEmpty({ message: 'Informe a senha.' })
  senha: string;
}

export class CriarUsuarioDto {
  @IsString()
  @IsNotEmpty({ message: 'Informe o nome.' })
  nome: string;

  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'A senha deve ter ao menos 6 caracteres.' })
  senha: string;

  @IsEnum(Perfil, { message: `Perfil deve ser um de: ${Object.values(Perfil).join(', ')}` })
  perfil: Perfil;
}

@ApiTags('Identidade')
@Controller('auth')
export class AuthController {
  constructor(private readonly autenticar: AutenticarUsuarioUseCase) {}

  /** Autentica e devolve um JWT (8h). */
  @Publico()
  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.autenticar.executar(dto);
  }

  /** Dados do usuário do token atual. */
  @ApiBearerAuth()
  @Get('me')
  me(@UsuarioAtual() usuario: UsuarioAutenticado) {
    return usuario;
  }
}

@ApiTags('Identidade')
@ApiBearerAuth()
@Controller('usuarios')
@Perfis(Perfil.ADMIN)
export class UsuariosController {
  constructor(private readonly criar: CriarUsuarioUseCase, private readonly listar: ListarUsuariosUseCase) {}

  @Get()
  listarTodos() {
    return this.listar.executar();
  }

  @Post()
  cadastrar(@Body() dto: CriarUsuarioDto, @UsuarioAtual() ator: UsuarioAutenticado) {
    return this.criar.executar(dto, ator);
  }
}
