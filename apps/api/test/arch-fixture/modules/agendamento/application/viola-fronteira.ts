// VIOLAÇÃO PROPOSITAL: o Agendamento acessando o domínio interno de Pacientes.
import { Paciente } from '../../pacientes/domain/paciente';

export const exemplo = new Paciente('acoplamento indevido');
