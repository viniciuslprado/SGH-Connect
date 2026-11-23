/**
 * Enums compartilhados entre API e Web.
 *
 * Conascência de convenção ELIMINADA (documento, seção 7.4): em vez de strings
 * mágicas ('O', 'L'...) espalhadas por tela, relatório e domínio, o significado
 * de cada valor tem um nome único, verificado pelo compilador nos dois lados.
 */

export enum Perfil {
  ADMIN = 'ADMIN',
  RECEPCIONISTA = 'RECEPCIONISTA',
  MEDICO = 'MEDICO',
  ENFERMEIRO = 'ENFERMEIRO',
  GESTOR_LEITOS = 'GESTOR_LEITOS',
  FATURISTA = 'FATURISTA',
}

export enum TipoProfissional {
  MEDICO = 'MEDICO',
  ENFERMEIRO = 'ENFERMEIRO',
}

export enum StatusConsulta {
  AGENDADA = 'AGENDADA',
  CANCELADA = 'CANCELADA',
}

export enum StatusAtendimento {
  ABERTO = 'ABERTO',
  FINALIZADO = 'FINALIZADO',
}

export enum ClassificacaoRisco {
  VERMELHO = 'VERMELHO',
  LARANJA = 'LARANJA',
  AMARELO = 'AMARELO',
  VERDE = 'VERDE',
  AZUL = 'AZUL',
}

export enum StatusLeito {
  LIVRE = 'LIVRE',
  OCUPADO = 'OCUPADO',
  HIGIENIZACAO = 'HIGIENIZACAO',
  MANUTENCAO = 'MANUTENCAO',
}

export enum TipoLeito {
  ENFERMARIA = 'ENFERMARIA',
  APARTAMENTO = 'APARTAMENTO',
  UTI = 'UTI',
}

export enum StatusInternacao {
  ATIVA = 'ATIVA',
  ENCERRADA = 'ENCERRADA',
}

export enum StatusConta {
  ABERTA = 'ABERTA',
  FECHADA = 'FECHADA',
}

export enum Convenio {
  PARTICULAR = 'PARTICULAR',
  UNIMED = 'UNIMED',
  BRADESCO_SAUDE = 'BRADESCO_SAUDE',
  SUS = 'SUS',
}

export enum StatusNotificacao {
  ENVIADA = 'ENVIADA',
  FALHOU = 'FALHOU',
}

/** Rótulos para exibição — mantidos junto dos enums para que um novo valor force a atualização do rótulo. */
export const ROTULO_STATUS_LEITO: Record<StatusLeito, string> = {
  [StatusLeito.LIVRE]: 'Livre',
  [StatusLeito.OCUPADO]: 'Ocupado',
  [StatusLeito.HIGIENIZACAO]: 'Em higienização',
  [StatusLeito.MANUTENCAO]: 'Manutenção',
};

export const ROTULO_PERFIL: Record<Perfil, string> = {
  [Perfil.ADMIN]: 'Administrador',
  [Perfil.RECEPCIONISTA]: 'Recepcionista',
  [Perfil.MEDICO]: 'Médico',
  [Perfil.ENFERMEIRO]: 'Enfermeiro',
  [Perfil.GESTOR_LEITOS]: 'Gestor de leitos',
  [Perfil.FATURISTA]: 'Faturista',
};
