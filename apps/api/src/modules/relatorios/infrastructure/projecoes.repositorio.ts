import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';

/** Acesso EXCLUSIVO ao schema "relatorios". Não lê tabelas de nenhum outro módulo. */
@Injectable()
export class ProjecoesRepositorio {
  constructor(private readonly prisma: PrismaService) {}

  async consulta(consultaId: string, profissionalId: string, inicio: Date, status: string) {
    await this.prisma.projecaoConsultas.upsert({
      where: { consultaId },
      create: { consultaId, profissionalId, inicio, status },
      update: { status },
    });
  }

  async producao(atendimentoId: string, profissionalId: string, profissionalNome: string, finalizadoEm: Date) {
    await this.prisma.projecaoProducao.upsert({
      where: { atendimentoId },
      create: { atendimentoId, profissionalId, profissionalNome, finalizadoEm },
      update: {},
    });
  }

  async ocupacao(p: { internacaoId: string; leitoCodigo: string; ala: string; tipoLeito: string; inicio: Date; alta: Date | null }) {
    await this.prisma.projecaoOcupacao.upsert({
      where: { internacaoId: p.internacaoId },
      create: p,
      update: p.alta ? { alta: p.alta } : {},
    });
  }

  listarOcupacao() {
    return this.prisma.projecaoOcupacao.findMany();
  }

  listarProducao(de?: Date, ate?: Date) {
    return this.prisma.projecaoProducao.findMany({ where: de && ate ? { finalizadoEm: { gte: de, lt: ate } } : {} });
  }

  listarConsultas(de?: Date, ate?: Date) {
    return this.prisma.projecaoConsultas.findMany({ where: de && ate ? { inicio: { gte: de, lt: ate } } : {}, orderBy: { inicio: 'asc' } });
  }
}
