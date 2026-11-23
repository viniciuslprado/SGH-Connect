/**
 * Contrato público do módulo Identidade e Acesso.
 * Todos os módulos dependem DESTE arquivo (Ca = 8, I = 0): por isso ele muda raramente.
 */
import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { Perfil } from '@sgh/shared';

export interface UsuarioAutenticado {
  id: string;
  nome: string;
  email: string;
  perfil: Perfil;
}

export const CHAVE_ROTA_PUBLICA = 'sgh:rota-publica';
export const CHAVE_PERFIS = 'sgh:perfis';

/** Rota acessível sem token (ex.: login). Todas as outras exigem autenticação. */
export const Publico = () => SetMetadata(CHAVE_ROTA_PUBLICA, true);

/** Restringe a rota aos perfis informados (RBAC). ADMIN não é incluído automaticamente. */
export const Perfis = (...perfis: Perfil[]) => SetMetadata(CHAVE_PERFIS, perfis);

/** Injeta o usuário autenticado no parâmetro do controller. */
export const UsuarioAtual = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): UsuarioAutenticado => ctx.switchToHttp().getRequest().usuario,
);
