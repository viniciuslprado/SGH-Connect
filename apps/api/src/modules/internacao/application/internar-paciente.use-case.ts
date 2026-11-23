import { Inject, Injectable } from '@nestjs/common';
import { AcaoAuditoria, REGISTRO_AUDITORIA, RegistroAuditoria } from '../../../shared/auditoria/auditoria';
import { ConflitoError, NaoEncontradoError, RegraNegocioError } from '../../../shared/erros/erros';
import { criarEvento } from '../../../shared/eventos/evento-dominio';
import { OUTBOX, Outbox } from '../../../shared/eventos/outbox';
import { UNIDADE_DE_TRABALHO, UnidadeDeTrabalho } from '../../../shared/transacao';
import { UsuarioAutenticado } from '../../identidade/contracts';
import { PACIENTES_API, PacientesApi } from '../../pacientes/contracts';
import { PACIENTE_INTERNADO } from '../contracts';
import { INTERNACAO_REPOSITORIO, Internacao, InternacaoRepositorio, LEITO_REPOSITORIO, LeitoRepositorio } from '../domain/internacao';

export interface InternarPacienteCommand {
  pacienteId: string;
  leitoId: string;
  motivo: string;
}

/**
 * Internar paciente.
 *
 * Conascência de EXECUÇÃO reduzida e confinada (documento, seção 7.7): a sequência
 * obter leito → ocupar → criar internação → salvar → publicar evento existe SOMENTE aqui,
 * dentro de uma única transação. Quem chama não conhece a ordem.
 *
 * Conascência TEMPORAL reduzida (seção 7.8): duas internações simultâneas no mesmo leito
 * são barradas pelo controle de versão do Leito (e, em último caso, pelo índice único parcial).
 */
@Injectable()
export class InternarPacienteUseCase {
  constructor(
    @Inject(LEITO_REPOSITORIO) private readonly leitos: LeitoRepositorio,
    @Inject(INTERNACAO_REPOSITORIO) private readonly internacoes: InternacaoRepositorio,
    @Inject(PACIENTES_API) private readonly pacientes: PacientesApi,
    @Inject(UNIDADE_DE_TRABALHO) private readonly uow: UnidadeDeTrabalho,
    @Inject(OUTBOX) private readonly outbox: Outbox,
    @Inject(REGISTRO_AUDITORIA) private readonly auditoria: RegistroAuditoria,
  ) {}

  async executar(cmd: InternarPacienteCommand, ator: UsuarioAutenticado): Promise<Internacao> {
    const paciente = await this.pacientes.buscarResumo(cmd.pacienteId);
    if (!paciente) throw new NaoEncontradoError('Paciente não encontrado.');
    if (!paciente.ativo) throw new RegraNegocioError('Paciente inativo não pode ser internado.');

    return this.uow.executar(async (tx) => {
      if (await this.internacoes.obterAtivaDoPaciente(cmd.pacienteId, tx)) {
        throw new ConflitoError('O paciente já possui internação ativa.');
      }
      const leito = await this.leitos.obter(cmd.leitoId, tx);
      if (!leito) throw new NaoEncontradoError('Leito não encontrado.');

      leito.ocupar(); // regra de domínio: só LIVRE → 409
      const internacao = Internacao.iniciar(cmd, leito);

      await this.leitos.salvar(leito, tx); // controle de versão → 409 em corrida
      const salva = await this.internacoes.salvar(internacao, tx);
      await this.outbox.adicionar(
        criarEvento(PACIENTE_INTERNADO, {
          internacaoId: salva.id!,
          pacienteId: salva.pacienteId,
          leitoId: leito.id!,
          leitoCodigo: leito.codigo,
          ala: leito.ala,
          tipoLeito: leito.tipo,
          inicio: salva.inicio.toISOString(),
        }),
        tx,
      );
      await this.auditoria.registrar({ ator, acao: AcaoAuditoria.PACIENTE_INTERNADO, entidade: 'Internacao', entidadeId: salva.id }, tx);
      return salva;
    });
  }
}
