import { Injectable } from '@nestjs/common';
import { Consulta as Row } from '@prisma/client';
import { StatusConsulta } from '@sgh/shared';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { Transacao } from '../../../shared/transacao';
import { Consulta, ConsultaRepositorio } from '../domain/consulta';

const paraDominio = (r: Row) => Consulta.reconstituir({ ...r, status: r.status as StatusConsulta });

@Injectable()
export class PrismaConsultaRepositorio implements ConsultaRepositorio {
  constructor(private readonly prisma: PrismaService) {}

  async obter(id: string, tx?: Transacao) {
    const r = await this.prisma.cliente(tx).consulta.findUnique({ where: { id } });
    return r ? paraDominio(r) : null;
  }

  async bloquearAgendaDoProfissional(profissionalId: string, tx: Transacao) {
    // Advisory lock liberado automaticamente no fim da transação.
    await this.prisma.cliente(tx).$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'agenda:' + profissionalId}))`;
  }

  async listarAgendadasNoIntervalo(profissionalId: string, inicio: Date, fim: Date, tx?: Transacao) {
    const rs = await this.prisma.cliente(tx).consulta.findMany({
      where: { profissionalId, status: StatusConsulta.AGENDADA, inicio: { lt: fim }, fim: { gt: inicio } },
    });
    return rs.map(paraDominio);
  }

  async salvar(c: Consulta, tx?: Transacao) {
    const dados = {
      pacienteId: c.pacienteId,
      profissionalId: c.profissionalId,
      inicio: c.inicio,
      fim: c.fim,
      status: c.status,
      sala: c.sala,
      observacao: c.observacao,
    };
    const cli = this.prisma.cliente(tx);
    const r = c.id ? await cli.consulta.update({ where: { id: c.id }, data: dados }) : await cli.consulta.create({ data: dados });
    return paraDominio(r);
  }

  async listar({ profissionalId, pacienteId, de, ate }: { profissionalId?: string; pacienteId?: string; de?: Date; ate?: Date }) {
    const rs = await this.prisma.consulta.findMany({
      where: {
        ...(profissionalId ? { profissionalId } : {}),
        ...(pacienteId ? { pacienteId } : {}),
        ...(de && ate ? { inicio: { gte: de, lt: ate } } : {}),
      },
      orderBy: { inicio: 'asc' },
      take: 200,
    });
    return rs.map(paraDominio);
  }
}
