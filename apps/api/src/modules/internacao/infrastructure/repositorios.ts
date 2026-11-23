import { Injectable } from '@nestjs/common';
import { Internacao as InternacaoRow, Leito as LeitoRow } from '@prisma/client';
import { StatusInternacao, StatusLeito, TipoLeito } from '@sgh/shared';
import { ConflitoError } from '../../../shared/erros/erros';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { Transacao } from '../../../shared/transacao';
import { Internacao, InternacaoRepositorio, LeitoRepositorio } from '../domain/internacao';
import { Leito } from '../domain/leito';

const leitoDominio = (r: LeitoRow) => Leito.reconstituir({ ...r, tipo: r.tipo as TipoLeito, status: r.status as StatusLeito });
const internacaoDominio = (r: InternacaoRow) => Internacao.reconstituir({ ...r, status: r.status as StatusInternacao });

@Injectable()
export class PrismaLeitoRepositorio implements LeitoRepositorio {
  constructor(private readonly prisma: PrismaService) {}

  async obter(id: string, tx?: Transacao) {
    const r = await this.prisma.cliente(tx).leito.findUnique({ where: { id } });
    return r ? leitoDominio(r) : null;
  }

  /**
   * Controle de concorrência OTIMISTA: UPDATE ... WHERE versao = <versão lida>.
   * Se outra transação alterou o leito antes, nenhuma linha é afetada → 409.
   */
  async salvar(leito: Leito, tx?: Transacao) {
    const { count } = await this.prisma.cliente(tx).leito.updateMany({
      where: { id: leito.id, versao: leito.versao },
      data: { status: leito.status, versao: { increment: 1 } },
    });
    if (count === 0) {
      throw new ConflitoError(`O leito ${leito.codigo} foi alterado por outra operação ao mesmo tempo. Atualize o mapa e tente novamente.`);
    }
  }

  async cadastrar(leito: Leito) {
    const r = await this.prisma.leito.create({ data: { codigo: leito.codigo, ala: leito.ala, tipo: leito.tipo, status: leito.status } });
    return leitoDominio(r);
  }

  async listar() {
    return (await this.prisma.leito.findMany({ orderBy: [{ ala: 'asc' }, { codigo: 'asc' }] })).map(leitoDominio);
  }
}

@Injectable()
export class PrismaInternacaoRepositorio implements InternacaoRepositorio {
  constructor(private readonly prisma: PrismaService) {}

  async obter(id: string, tx?: Transacao) {
    const r = await this.prisma.cliente(tx).internacao.findUnique({ where: { id } });
    return r ? internacaoDominio(r) : null;
  }

  async obterAtivaDoPaciente(pacienteId: string, tx?: Transacao) {
    const r = await this.prisma.cliente(tx).internacao.findFirst({ where: { pacienteId, status: StatusInternacao.ATIVA } });
    return r ? internacaoDominio(r) : null;
  }

  async salvar(i: Internacao, tx?: Transacao) {
    const dados = { pacienteId: i.pacienteId, leitoId: i.leitoId, motivo: i.motivo, status: i.status, inicio: i.inicio, alta: i.alta };
    const cli = this.prisma.cliente(tx);
    const r = i.id ? await cli.internacao.update({ where: { id: i.id }, data: dados }) : await cli.internacao.create({ data: dados });
    return internacaoDominio(r);
  }

  async listar({ status }: { status?: StatusInternacao }) {
    const rs = await this.prisma.internacao.findMany({ where: status ? { status } : {}, orderBy: { inicio: 'desc' }, take: 200 });
    return rs.map(internacaoDominio);
  }
}
