import { Inject, Injectable } from '@nestjs/common';
import { StatusInternacao, StatusLeito, TipoLeito } from '@sgh/shared';
import { AcaoAuditoria, REGISTRO_AUDITORIA, RegistroAuditoria } from '../../../shared/auditoria/auditoria';
import { NaoEncontradoError } from '../../../shared/erros/erros';
import { criarEvento } from '../../../shared/eventos/evento-dominio';
import { OUTBOX, Outbox } from '../../../shared/eventos/outbox';
import { UNIDADE_DE_TRABALHO, UnidadeDeTrabalho } from '../../../shared/transacao';
import { UsuarioAutenticado } from '../../identidade/contracts';
import { PACIENTES_API, PacientesApi } from '../../pacientes/contracts';
import { ALTA_REGISTRADA } from '../contracts';
import { INTERNACAO_REPOSITORIO, Internacao, InternacaoRepositorio, LEITO_REPOSITORIO, LeitoRepositorio } from '../domain/internacao';
import { Leito } from '../domain/leito';

export interface InternacaoDto {
  id: string;
  pacienteId: string;
  pacienteNome: string;
  leitoId: string;
  leitoCodigo: string;
  ala: string;
  motivo: string;
  status: StatusInternacao;
  inicio: string;
  alta: string | null;
  diarias: number;
}

export interface LeitoMapaDto {
  id: string;
  codigo: string;
  ala: string;
  tipo: TipoLeito;
  status: StatusLeito;
  internacao: { id: string; pacienteId: string; pacienteNome: string; inicio: string } | null;
}

/**
 * Registrar alta.
 * Conascência TEMPORAL reduzida: encerrar a internação, liberar o leito para higienização e
 * publicar AltaRegistrada acontecem na MESMA transação — se qualquer passo falhar, nada muda.
 */
@Injectable()
export class RegistrarAltaUseCase {
  constructor(
    @Inject(LEITO_REPOSITORIO) private readonly leitos: LeitoRepositorio,
    @Inject(INTERNACAO_REPOSITORIO) private readonly internacoes: InternacaoRepositorio,
    @Inject(UNIDADE_DE_TRABALHO) private readonly uow: UnidadeDeTrabalho,
    @Inject(OUTBOX) private readonly outbox: Outbox,
    @Inject(REGISTRO_AUDITORIA) private readonly auditoria: RegistroAuditoria,
  ) {}

  async executar(internacaoId: string, ator: UsuarioAutenticado): Promise<Internacao> {
    return this.uow.executar(async (tx) => {
      const internacao = await this.internacoes.obter(internacaoId, tx);
      if (!internacao) throw new NaoEncontradoError('Internação não encontrada.');
      const leito = await this.leitos.obter(internacao.leitoId, tx);
      if (!leito) throw new NaoEncontradoError('Leito da internação não encontrado.');

      internacao.registrarAlta();
      leito.liberarParaHigienizacao();

      const salva = await this.internacoes.salvar(internacao, tx);
      await this.leitos.salvar(leito, tx);
      await this.outbox.adicionar(
        criarEvento(ALTA_REGISTRADA, {
          internacaoId,
          pacienteId: salva.pacienteId,
          leitoId: leito.id!,
          leitoCodigo: leito.codigo,
          ala: leito.ala,
          tipoLeito: leito.tipo,
          inicio: salva.inicio.toISOString(),
          alta: salva.alta!.toISOString(),
          diarias: salva.diarias(),
        }),
        tx,
      );
      await this.auditoria.registrar({ ator, acao: AcaoAuditoria.ALTA_REGISTRADA, entidade: 'Internacao', entidadeId: internacaoId }, tx);
      return salva;
    });
  }
}

@Injectable()
export class TransferirLeitoUseCase {
  constructor(
    @Inject(LEITO_REPOSITORIO) private readonly leitos: LeitoRepositorio,
    @Inject(INTERNACAO_REPOSITORIO) private readonly internacoes: InternacaoRepositorio,
    @Inject(UNIDADE_DE_TRABALHO) private readonly uow: UnidadeDeTrabalho,
    @Inject(REGISTRO_AUDITORIA) private readonly auditoria: RegistroAuditoria,
  ) {}

  async executar(internacaoId: string, novoLeitoId: string, ator: UsuarioAutenticado): Promise<Internacao> {
    return this.uow.executar(async (tx) => {
      const internacao = await this.internacoes.obter(internacaoId, tx);
      if (!internacao) throw new NaoEncontradoError('Internação não encontrada.');
      const atual = await this.leitos.obter(internacao.leitoId, tx);
      const destino = await this.leitos.obter(novoLeitoId, tx);
      if (!atual || !destino) throw new NaoEncontradoError('Leito não encontrado.');

      internacao.transferirPara(destino);
      destino.ocupar();
      atual.liberarParaHigienizacao();

      await this.leitos.salvar(destino, tx);
      await this.leitos.salvar(atual, tx);
      const salva = await this.internacoes.salvar(internacao, tx);
      await this.auditoria.registrar({ ator, acao: AcaoAuditoria.PACIENTE_TRANSFERIDO, entidade: 'Internacao', entidadeId: internacaoId }, tx);
      return salva;
    });
  }
}

@Injectable()
export class GerenciarLeitosUseCase {
  constructor(@Inject(LEITO_REPOSITORIO) private readonly leitos: LeitoRepositorio, @Inject(UNIDADE_DE_TRABALHO) private readonly uow: UnidadeDeTrabalho) {}

  cadastrar(p: { codigo: string; ala: string; tipo: TipoLeito }): Promise<Leito> {
    return this.leitos.cadastrar(Leito.cadastrar(p));
  }

  /** Conclui a higienização (ou manutenção) e deixa o leito LIVRE. */
  async liberar(id: string): Promise<Leito> {
    return this.alterar(id, (l) => l.concluirHigienizacao());
  }

  async manutencao(id: string): Promise<Leito> {
    return this.alterar(id, (l) => l.colocarEmManutencao());
  }

  private alterar(id: string, acao: (l: Leito) => void): Promise<Leito> {
    return this.uow.executar(async (tx) => {
      const leito = await this.leitos.obter(id, tx);
      if (!leito) throw new NaoEncontradoError('Leito não encontrado.');
      acao(leito);
      await this.leitos.salvar(leito, tx);
      return leito;
    });
  }
}

@Injectable()
export class ConsultarInternacoesUseCase {
  constructor(
    @Inject(LEITO_REPOSITORIO) private readonly leitos: LeitoRepositorio,
    @Inject(INTERNACAO_REPOSITORIO) private readonly internacoes: InternacaoRepositorio,
    @Inject(PACIENTES_API) private readonly pacientes: PacientesApi,
  ) {}

  async mapa(): Promise<LeitoMapaDto[]> {
    const [leitos, ativas] = await Promise.all([this.leitos.listar(), this.internacoes.listar({ status: StatusInternacao.ATIVA })]);
    const porLeito = new Map(ativas.map((i) => [i.leitoId, i]));
    const out: LeitoMapaDto[] = [];
    for (const l of leitos) {
      const i = porLeito.get(l.id!);
      out.push({
        id: l.id!,
        codigo: l.codigo,
        ala: l.ala,
        tipo: l.tipo,
        status: l.status,
        internacao: i
          ? { id: i.id!, pacienteId: i.pacienteId, pacienteNome: (await this.pacientes.buscarResumo(i.pacienteId))?.nome ?? '—', inicio: i.inicio.toISOString() }
          : null,
      });
    }
    return out;
  }

  async listar(status?: StatusInternacao): Promise<InternacaoDto[]> {
    const [lista, leitos] = await Promise.all([this.internacoes.listar({ status }), this.leitos.listar()]);
    const leitoPorId = new Map(leitos.map((l) => [l.id!, l]));
    const out: InternacaoDto[] = [];
    for (const i of lista) out.push(await this.paraDto(i, leitoPorId.get(i.leitoId)));
    return out;
  }

  async paraDto(i: Internacao, leito?: Leito | null): Promise<InternacaoDto> {
    const l = leito ?? (await this.leitos.obter(i.leitoId));
    return {
      id: i.id!,
      pacienteId: i.pacienteId,
      pacienteNome: (await this.pacientes.buscarResumo(i.pacienteId))?.nome ?? '—',
      leitoId: i.leitoId,
      leitoCodigo: l?.codigo ?? '—',
      ala: l?.ala ?? '—',
      motivo: i.motivo,
      status: i.status,
      inicio: i.inicio.toISOString(),
      alta: i.alta?.toISOString() ?? null,
      diarias: i.diarias(),
    };
  }
}
