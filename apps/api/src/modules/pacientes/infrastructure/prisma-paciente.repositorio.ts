import { Injectable } from '@nestjs/common';
import { Paciente as PacienteRow, Prisma } from '@prisma/client';
import { Convenio } from '@sgh/shared';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { Paciente, PacienteRepositorio } from '../domain/paciente';

const paraDominio = (r: PacienteRow): Paciente =>
  Paciente.criar({ ...r, convenio: r.convenio as Convenio, nascimento: r.nascimento.toISOString().slice(0, 10) });

@Injectable()
export class PrismaPacienteRepositorio implements PacienteRepositorio {
  constructor(private readonly prisma: PrismaService) {}

  async obter(id: string) {
    const r = await this.prisma.paciente.findUnique({ where: { id } });
    return r ? paraDominio(r) : null;
  }

  async obterPorCpf(cpf: string) {
    const r = await this.prisma.paciente.findUnique({ where: { cpf } });
    return r ? paraDominio(r) : null;
  }

  async salvar(p: Paciente) {
    const dados = {
      nome: p.nome,
      cpf: p.cpf.valor,
      nascimento: new Date(`${p.nascimento}T00:00:00Z`),
      telefone: p.telefone,
      email: p.email,
      convenio: p.convenio,
      numeroCarteirinha: p.numeroCarteirinha,
      ativo: p.ativo,
    };
    const r = p.id
      ? await this.prisma.paciente.update({ where: { id: p.id }, data: dados })
      : await this.prisma.paciente.create({ data: dados });
    return paraDominio(r);
  }

  async pesquisar({ termo, incluirInativos }: { termo?: string; incluirInativos?: boolean }) {
    const t = termo?.trim();
    const digitos = t?.replace(/\D/g, '');
    const where: Prisma.PacienteWhereInput = {
      ...(incluirInativos ? {} : { ativo: true }),
      ...(t
        ? { OR: [{ nome: { contains: t, mode: 'insensitive' } }, ...(digitos ? [{ cpf: { contains: digitos } }] : [])] }
        : {}),
    };
    const rs = await this.prisma.paciente.findMany({ where, orderBy: { nome: 'asc' }, take: 100 });
    return rs.map(paraDominio);
  }
}
