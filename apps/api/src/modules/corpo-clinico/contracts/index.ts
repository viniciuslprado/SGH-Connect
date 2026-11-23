/** Contrato público do módulo Corpo Clínico. Consumidores: Agendamento e Atendimento (Ca = 2). */
import { TipoProfissional } from '@sgh/shared';

export interface ProfissionalResumoDto {
  id: string;
  nome: string;
  tipo: TipoProfissional;
  especialidade: string;
  ativo: boolean;
}

export interface CorpoClinicoApi {
  buscarProfissional(id: string): Promise<ProfissionalResumoDto | null>;
}

export const CORPO_CLINICO_API = Symbol('CORPO_CLINICO_API');
