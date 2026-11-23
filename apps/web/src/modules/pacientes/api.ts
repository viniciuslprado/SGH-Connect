import { Convenio } from '@sgh/shared';
import { api, qs } from '../../shared/api';

export interface Paciente {
  id: string;
  nome: string;
  cpf: string;
  nascimento: string;
  telefone: string | null;
  email: string | null;
  convenio: Convenio;
  numeroCarteirinha: string | null;
  ativo: boolean;
}

export type DadosPaciente = Omit<Paciente, 'id' | 'ativo'>;

export const pacientesApi = {
  pesquisar: (termo?: string) => api<Paciente[]>('GET', `/pacientes${qs({ termo })}`),
  criar: (d: DadosPaciente) => api<Paciente>('POST', '/pacientes', d),
  editar: (id: string, d: Partial<DadosPaciente>) => api<Paciente>('PATCH', `/pacientes/${id}`, d),
  inativar: (id: string) => api<Paciente>('PATCH', `/pacientes/${id}/inativar`),
};
