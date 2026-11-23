import { TipoProfissional } from '@sgh/shared';
import { api, qs } from '../../shared/api';

export interface Profissional {
  id: string;
  nome: string;
  tipo: TipoProfissional;
  registro: string;
  especialidade: string;
  usuarioId: string | null;
  ativo: boolean;
}

export const corpoClinicoApi = {
  listar: (tipo?: TipoProfissional, incluirInativos = false) =>
    api<Profissional[]>('GET', `/profissionais${qs({ tipo, incluirInativos: incluirInativos ? 'true' : undefined })}`),
  criar: (d: Omit<Profissional, 'id' | 'ativo' | 'usuarioId'>) => api<Profissional>('POST', '/profissionais', d),
  alterarAtivo: (id: string, ativo: boolean) => api<Profissional>('PATCH', `/profissionais/${id}`, { ativo }),
};
