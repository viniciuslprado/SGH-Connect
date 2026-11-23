import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Perfil } from '@sgh/shared';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { CHAVE_PERFIS, CHAVE_ROTA_PUBLICA, UsuarioAutenticado } from '../contracts';
import { HashDeSenha, Usuario, UsuarioRepositorio } from '../domain/usuario';

@Injectable()
export class PrismaUsuarioRepositorio implements UsuarioRepositorio {
  constructor(private readonly prisma: PrismaService) {}

  async obterPorEmail(email: string): Promise<Usuario | null> {
    const r = await this.prisma.usuario.findUnique({ where: { email } });
    return r ? Usuario.criar({ ...r, perfil: r.perfil as Perfil }) : null;
  }

  async salvar(u: Usuario): Promise<Usuario> {
    const dados = { nome: u.nome, email: u.email, senhaHash: u.senhaHash, perfil: u.perfil, ativo: u.ativo };
    const r = u.id
      ? await this.prisma.usuario.update({ where: { id: u.id }, data: dados })
      : await this.prisma.usuario.create({ data: dados });
    return Usuario.criar({ ...r, perfil: r.perfil as Perfil });
  }

  async listar(): Promise<Usuario[]> {
    const rs = await this.prisma.usuario.findMany({ orderBy: { nome: 'asc' } });
    return rs.map((r) => Usuario.criar({ ...r, perfil: r.perfil as Perfil }));
  }
}

@Injectable()
export class BcryptHashDeSenha implements HashDeSenha {
  gerar(senha: string) {
    return bcrypt.hash(senha, 10);
  }
  comparar(senha: string, hash: string) {
    return bcrypt.compare(senha, hash);
  }
}

/** Guard global: toda rota exige JWT válido, exceto as marcadas com @Publico(). → 401 */
@Injectable()
export class AutenticacaoGuard implements CanActivate {
  constructor(private readonly jwt: JwtService, private readonly reflector: Reflector) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const publica = this.reflector.getAllAndOverride<boolean>(CHAVE_ROTA_PUBLICA, [ctx.getHandler(), ctx.getClass()]);
    if (publica) return true;

    const req = ctx.switchToHttp().getRequest();
    const [tipo, token] = String(req.headers.authorization ?? '').split(' ');
    if (tipo !== 'Bearer' || !token) throw new UnauthorizedException();
    try {
      const p = await this.jwt.verifyAsync<UsuarioAutenticado & { sub: string }>(token);
      req.usuario = { id: p.sub, nome: p.nome, email: p.email, perfil: p.perfil } satisfies UsuarioAutenticado;
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}

/** Guard global: verifica @Perfis(...) da rota. → 403 */
@Injectable()
export class PerfisGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const exigidos = this.reflector.getAllAndOverride<Perfil[] | undefined>(CHAVE_PERFIS, [ctx.getHandler(), ctx.getClass()]);
    if (!exigidos?.length) return true;
    const usuario: UsuarioAutenticado | undefined = ctx.switchToHttp().getRequest().usuario;
    if (!usuario || !exigidos.includes(usuario.perfil)) throw new ForbiddenException();
    return true;
  }
}
