import { Perfil } from '@sgh/shared';
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { api, definirAoExpirar, sessao } from './api';

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  perfil: Perfil;
}

interface ContextoAuth {
  usuario: Usuario | null;
  carregando: boolean;
  entrar(email: string, senha: string): Promise<void>;
  sair(): void;
  tem(...perfis: Perfil[]): boolean;
}

const Ctx = createContext<ContextoAuth | null>(null);

export function ProvedorAuth({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);

  const sair = useCallback(() => {
    sessao.limpar();
    setUsuario(null);
  }, []);

  useEffect(() => {
    definirAoExpirar(sair);
    if (!sessao.token()) return setCarregando(false);
    api<Usuario>('GET', '/auth/me')
      .then(setUsuario)
      .catch(sair)
      .finally(() => setCarregando(false));
  }, [sair]);

  const entrar = async (email: string, senha: string) => {
    const r = await api<{ token: string; usuario: Usuario }>('POST', '/auth/login', { email, senha });
    sessao.salvar(r.token);
    setUsuario(r.usuario);
  };

  const tem = (...perfis: Perfil[]) => !!usuario && perfis.includes(usuario.perfil);

  return <Ctx.Provider value={{ usuario, carregando, entrar, sair, tem }}>{children}</Ctx.Provider>;
}

export function useAuth(): ContextoAuth {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth fora do ProvedorAuth');
  return c;
}
