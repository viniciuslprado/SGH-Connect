import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Convenio, StatusConta } from '@sgh/shared';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { Transacao } from '../../../shared/transacao';
import { Conta, ContaRepositorio } from '../domain/conta';

const INCLUDE = { itens: { orderBy: { criadoEm: 'asc' } } } satisfies Prisma.ContaInclude;
type Row = Prisma.ContaGetPayload<{ include: typeof INCLUDE }>;

const paraCentavos = (d: Prisma.Decimal) => Math.round(Number(d.toString()) * 100);
const paraDecimal = (centavos: number) => new Prisma.Decimal(centavos).div(100);

const paraDominio = (r: Row) =>
  Conta.reconstituir({
    id: r.id,
    pacienteId: r.pacienteId,
    convenio: r.convenio as Convenio,
    status: r.status as StatusConta,
    abertaEm: r.abertaEm,
    fechadaEm: r.fechadaEm,
    itens: r.itens.map((i) => ({ ...i, valorUnitarioCentavos: paraCentavos(i.valorUnitario) })),
  });

@Injectable()
export class PrismaContaRepositorio implements ContaRepositorio {
  constructor(private readonly prisma: PrismaService) {}

  async marcarEventoProcessado(eventId: string, tx: Transacao): Promise<boolean> {
    const { count } = await this.prisma.cliente(tx).eventoProcessadoFaturamento.createMany({ data: [{ eventId }], skipDuplicates: true });
    return count === 1;
  }

  async obterAbertaDoPaciente(pacienteId: string, tx?: Transacao) {
    const r = await this.prisma.cliente(tx).conta.findFirst({ where: { pacienteId, status: StatusConta.ABERTA }, include: INCLUDE });
    return r ? paraDominio(r) : null;
  }

  async obter(id: string, tx?: Transacao) {
    const r = await this.prisma.cliente(tx).conta.findUnique({ where: { id }, include: INCLUDE });
    return r ? paraDominio(r) : null;
  }

  async salvar(c: Conta, tx?: Transacao) {
    const cli = this.prisma.cliente(tx);
    const dados = { pacienteId: c.pacienteId, convenio: c.convenio, status: c.status, fechadaEm: c.fechadaEm, total: paraDecimal(c.totalCentavos()) };
    const { id } = c.id ? await cli.conta.update({ where: { id: c.id }, data: dados }) : await cli.conta.create({ data: { ...dados, abertaEm: c.abertaEm } });
    const novos = c.itens.filter((i) => !i.id);
    if (novos.length) {
      await cli.itemConta.createMany({
        data: novos.map((i) => ({
          contaId: id,
          codigo: i.codigo,
          descricao: i.descricao,
          quantidade: i.quantidade,
          valorUnitario: paraDecimal(i.valorUnitarioCentavos),
          origemEventoId: i.origemEventoId,
        })),
      });
    }
    return paraDominio((await cli.conta.findUnique({ where: { id }, include: INCLUDE }))!);
  }

  async listar({ pacienteId, status }: { pacienteId?: string; status?: StatusConta }) {
    const rs = await this.prisma.conta.findMany({
      where: { ...(pacienteId ? { pacienteId } : {}), ...(status ? { status } : {}) },
      include: INCLUDE,
      orderBy: { abertaEm: 'desc' },
      take: 100,
    });
    return rs.map(paraDominio);
  }
}
