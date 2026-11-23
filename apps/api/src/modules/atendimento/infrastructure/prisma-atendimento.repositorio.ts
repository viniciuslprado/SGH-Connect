import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ClassificacaoRisco, StatusAtendimento } from '@sgh/shared';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { Transacao } from '../../../shared/transacao';
import { Atendimento, AtendimentoRepositorio } from '../domain/atendimento';

const INCLUDE = { triagem: true, registros: { orderBy: { criadoEm: 'asc' } } } satisfies Prisma.AtendimentoInclude;
type Row = Prisma.AtendimentoGetPayload<{ include: typeof INCLUDE }>;

const paraDominio = (r: Row) =>
  Atendimento.reconstituir({
    id: r.id,
    pacienteId: r.pacienteId,
    profissionalId: r.profissionalId,
    consultaId: r.consultaId,
    status: r.status as StatusAtendimento,
    inicio: r.inicio,
    fim: r.fim,
    triagem: r.triagem ? { ...r.triagem, classificacaoRisco: r.triagem.classificacaoRisco as ClassificacaoRisco } : null,
    registros: r.registros,
  });

@Injectable()
export class PrismaAtendimentoRepositorio implements AtendimentoRepositorio {
  constructor(private readonly prisma: PrismaService) {}

  async obter(id: string, tx?: Transacao) {
    const r = await this.prisma.cliente(tx).atendimento.findUnique({ where: { id }, include: INCLUDE });
    return r ? paraDominio(r) : null;
  }

  /** Persiste o agregado inteiro: atendimento, triagem e registros novos. */
  async salvar(a: Atendimento, tx?: Transacao) {
    const executar = async (cli: Prisma.TransactionClient) => {
      const dados = { pacienteId: a.pacienteId, profissionalId: a.profissionalId, consultaId: a.consultaId, status: a.status, inicio: a.inicio, fim: a.fim };
      const { id } = a.id
        ? await cli.atendimento.update({ where: { id: a.id }, data: dados })
        : await cli.atendimento.create({ data: dados });

      if (a.triagem) {
        const { registradaEm, ...t } = a.triagem;
        await cli.triagem.upsert({
          where: { atendimentoId: id },
          create: { ...t, registradaEm, atendimentoId: id },
          update: { ...t, registradaEm },
        });
      }
      const novos = a.registros.filter((r) => !r.id);
      if (novos.length) {
        await cli.registroClinico.createMany({
          data: novos.map((r) => ({
            atendimentoId: id,
            autorId: r.autorId,
            anamnese: r.anamnese ?? null,
            cid: r.cid ?? null,
            conduta: r.conduta,
            prescricao: r.prescricao ?? null,
            criadoEm: r.criadoEm,
          })),
        });
      }
      return paraDominio((await cli.atendimento.findUnique({ where: { id }, include: INCLUDE }))!);
    };
    return tx ? executar(this.prisma.cliente(tx)) : this.prisma.$transaction((t) => executar(t));
  }

  async listar({ status, pacienteId }: { status?: StatusAtendimento; pacienteId?: string }) {
    const rs = await this.prisma.atendimento.findMany({
      where: { ...(status ? { status } : {}), ...(pacienteId ? { pacienteId } : {}) },
      include: INCLUDE,
      orderBy: { inicio: 'desc' },
      take: 100,
    });
    return rs.map(paraDominio);
  }
}
