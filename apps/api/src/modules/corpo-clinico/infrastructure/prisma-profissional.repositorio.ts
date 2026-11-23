import { Injectable } from '@nestjs/common';
import { Profissional as Row } from '@prisma/client';
import { TipoProfissional } from '@sgh/shared';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { Profissional, ProfissionalRepositorio } from '../domain/profissional';

const paraDominio = (r: Row) => Profissional.criar({ ...r, tipo: r.tipo as TipoProfissional });

@Injectable()
export class PrismaProfissionalRepositorio implements ProfissionalRepositorio {
  constructor(private readonly prisma: PrismaService) {}

  async obter(id: string) {
    const r = await this.prisma.profissional.findUnique({ where: { id } });
    return r ? paraDominio(r) : null;
  }

  async salvar(p: Profissional) {
    const dados = {
      nome: p.nome,
      tipo: p.tipo,
      registro: p.registro,
      especialidade: p.especialidade,
      usuarioId: p.usuarioId,
      ativo: p.ativo,
    };
    const r = p.id
      ? await this.prisma.profissional.update({ where: { id: p.id }, data: dados })
      : await this.prisma.profissional.create({ data: dados });
    return paraDominio(r);
  }

  async listar({ tipo, incluirInativos }: { tipo?: TipoProfissional; incluirInativos?: boolean }) {
    const rs = await this.prisma.profissional.findMany({
      where: { ...(tipo ? { tipo } : {}), ...(incluirInativos ? {} : { ativo: true }) },
      orderBy: { nome: 'asc' },
    });
    return rs.map(paraDominio);
  }
}
