import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { AuthController, UsuariosController } from './api/controllers';
import { AutenticarUsuarioUseCase, CriarUsuarioUseCase, ListarUsuariosUseCase } from './application/casos-de-uso';
import { HASH_DE_SENHA, USUARIO_REPOSITORIO } from './domain/usuario';
import { AutenticacaoGuard, BcryptHashDeSenha, PerfisGuard, PrismaUsuarioRepositorio } from './infrastructure/infraestrutura';

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET ?? 'segredo-de-desenvolvimento',
        signOptions: { expiresIn: process.env.JWT_EXPIRES_IN ?? '8h' },
      }),
    }),
  ],
  controllers: [AuthController, UsuariosController],
  providers: [
    AutenticarUsuarioUseCase,
    CriarUsuarioUseCase,
    ListarUsuariosUseCase,
    { provide: USUARIO_REPOSITORIO, useClass: PrismaUsuarioRepositorio },
    { provide: HASH_DE_SENHA, useClass: BcryptHashDeSenha },
    // Ordem importa: primeiro autentica (401), depois autoriza por perfil (403).
    { provide: APP_GUARD, useClass: AutenticacaoGuard },
    { provide: APP_GUARD, useClass: PerfisGuard },
  ],
})
export class IdentidadeModule {}
