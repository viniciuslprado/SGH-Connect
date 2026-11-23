import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Perfil } from '@sgh/shared';
import { AcaoAuditoria, REGISTRO_AUDITORIA, RegistroAuditoria } from '../../../shared/auditoria/auditoria';
import { ConflitoError } from '../../../shared/erros/erros';
import { UsuarioAutenticado } from '../contracts';
import { HASH_DE_SENHA, HashDeSenha, USUARIO_REPOSITORIO, Usuario, UsuarioRepositorio } from '../domain/usuario';

export interface AutenticarCommand {
  email: string;
  senha: string;
}

export interface CriarUsuarioCommand {
  nome: string;
  email: string;
  senha: string;
  perfil: Perfil;
}

const paraAutenticado = (u: Usuario): UsuarioAutenticado => ({ id: u.id!, nome: u.nome, email: u.email, perfil: u.perfil });

@Injectable()
export class AutenticarUsuarioUseCase {
  constructor(
    @Inject(USUARIO_REPOSITORIO) private readonly usuarios: UsuarioRepositorio,
    @Inject(HASH_DE_SENHA) private readonly hash: HashDeSenha,
    @Inject(REGISTRO_AUDITORIA) private readonly auditoria: RegistroAuditoria,
    private readonly jwt: JwtService,
  ) {}

  async executar(cmd: AutenticarCommand): Promise<{ token: string; usuario: UsuarioAutenticado }> {
    const usuario = await this.usuarios.obterPorEmail(cmd.email.trim().toLowerCase());
    const senhaOk = usuario ? await this.hash.comparar(cmd.senha, usuario.senhaHash) : false;
    if (!usuario || !senhaOk || !usuario.podeAutenticar()) {
      throw new UnauthorizedException('E-mail ou senha inválidos.');
    }
    const autenticado = paraAutenticado(usuario);
    await this.auditoria.registrar({ ator: autenticado, acao: AcaoAuditoria.LOGIN, entidade: 'Usuario', entidadeId: usuario.id });
    return { token: await this.jwt.signAsync({ sub: autenticado.id, ...autenticado }), usuario: autenticado };
  }
}

@Injectable()
export class CriarUsuarioUseCase {
  constructor(
    @Inject(USUARIO_REPOSITORIO) private readonly usuarios: UsuarioRepositorio,
    @Inject(HASH_DE_SENHA) private readonly hash: HashDeSenha,
    @Inject(REGISTRO_AUDITORIA) private readonly auditoria: RegistroAuditoria,
  ) {}

  async executar(cmd: CriarUsuarioCommand, ator: UsuarioAutenticado): Promise<UsuarioAutenticado> {
    if (await this.usuarios.obterPorEmail(cmd.email.trim().toLowerCase())) {
      throw new ConflitoError('Já existe um usuário com este e-mail.');
    }
    const usuario = Usuario.criar({ ...cmd, senhaHash: await this.hash.gerar(cmd.senha) });
    const salvo = await this.usuarios.salvar(usuario);
    await this.auditoria.registrar({ ator, acao: AcaoAuditoria.USUARIO_CRIADO, entidade: 'Usuario', entidadeId: salvo.id });
    return paraAutenticado(salvo);
  }
}

@Injectable()
export class ListarUsuariosUseCase {
  constructor(@Inject(USUARIO_REPOSITORIO) private readonly usuarios: UsuarioRepositorio) {}

  async executar(): Promise<UsuarioAutenticado[]> {
    return (await this.usuarios.listar()).map(paraAutenticado);
  }
}
