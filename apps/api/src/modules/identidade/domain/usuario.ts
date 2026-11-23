import { Perfil } from '@sgh/shared';
import { ValidacaoError } from '../../../shared/erros/erros';

export interface DadosUsuario {
  id?: string;
  nome: string;
  email: string;
  senhaHash: string;
  perfil: Perfil;
  ativo?: boolean;
}

export class Usuario {
  private constructor(
    readonly id: string | undefined,
    readonly nome: string,
    readonly email: string,
    readonly senhaHash: string,
    readonly perfil: Perfil,
    readonly ativo: boolean,
  ) {}

  static criar(d: DadosUsuario): Usuario {
    const email = d.email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new ValidacaoError('E-mail inválido.');
    if (!Object.values(Perfil).includes(d.perfil)) throw new ValidacaoError('Perfil inválido.');
    return new Usuario(d.id, d.nome.trim(), email, d.senhaHash, d.perfil, d.ativo ?? true);
  }

  podeAutenticar(): boolean {
    return this.ativo;
  }
}

/** Porta de persistência. */
export interface UsuarioRepositorio {
  obterPorEmail(email: string): Promise<Usuario | null>;
  salvar(usuario: Usuario): Promise<Usuario>;
  listar(): Promise<Usuario[]>;
}

/** Porta de hash de senha (implementada com bcrypt na infraestrutura). */
export interface HashDeSenha {
  gerar(senha: string): Promise<string>;
  comparar(senha: string, hash: string): Promise<boolean>;
}

export const USUARIO_REPOSITORIO = Symbol('USUARIO_REPOSITORIO');
export const HASH_DE_SENHA = Symbol('HASH_DE_SENHA');
