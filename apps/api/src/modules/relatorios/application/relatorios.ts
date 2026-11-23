import { Injectable } from '@nestjs/common';
import { StatusConsulta } from '@sgh/shared';
import { AoReceberEvento } from '../../../shared/eventos/outbox';
import { CONSULTA_AGENDADA, CONSULTA_CANCELADA, ConsultaAgendadaEvent, ConsultaCanceladaEvent } from '../../agendamento/contracts';
import { ATENDIMENTO_FINALIZADO, AtendimentoFinalizadoEvent } from '../../atendimento/contracts';
import { ALTA_REGISTRADA, AltaRegistradaEvent, PACIENTE_INTERNADO, PacienteInternadoEvent } from '../../internacao/contracts';
import { contarPor, ocupacaoPorAla } from '../domain/indicadores';
import { ProjecoesRepositorio } from '../infrastructure/projecoes.repositorio';

/**
 * Atualiza as projeções a cada evento. Upsert por id da entidade de origem:
 * reentregar o mesmo evento produz o mesmo estado (idempotente por natureza).
 */
@Injectable()
export class AtualizarProjecoesHandler {
  constructor(private readonly projecoes: ProjecoesRepositorio) {}

  @AoReceberEvento(CONSULTA_AGENDADA)
  aoAgendar({ payload: p }: ConsultaAgendadaEvent) {
    return this.projecoes.consulta(p.consultaId, p.profissionalId, new Date(p.inicio), StatusConsulta.AGENDADA);
  }

  @AoReceberEvento(CONSULTA_CANCELADA)
  aoCancelar({ payload: p }: ConsultaCanceladaEvent) {
    return this.projecoes.consulta(p.consultaId, p.profissionalId, new Date(p.inicio), StatusConsulta.CANCELADA);
  }

  @AoReceberEvento(ATENDIMENTO_FINALIZADO)
  aoFinalizar({ payload: p }: AtendimentoFinalizadoEvent) {
    return this.projecoes.producao(p.atendimentoId, p.profissionalId, p.profissionalNome, new Date(p.finalizadoEm));
  }

  @AoReceberEvento(PACIENTE_INTERNADO)
  aoInternar({ payload: p }: PacienteInternadoEvent) {
    return this.projecoes.ocupacao({ internacaoId: p.internacaoId, leitoCodigo: p.leitoCodigo, ala: p.ala, tipoLeito: p.tipoLeito, inicio: new Date(p.inicio), alta: null });
  }

  @AoReceberEvento(ALTA_REGISTRADA)
  aoDarAlta({ payload: p }: AltaRegistradaEvent) {
    return this.projecoes.ocupacao({ internacaoId: p.internacaoId, leitoCodigo: p.leitoCodigo, ala: p.ala, tipoLeito: p.tipoLeito, inicio: new Date(p.inicio), alta: new Date(p.alta) });
  }
}

@Injectable()
export class ConsultarRelatoriosUseCase {
  constructor(private readonly projecoes: ProjecoesRepositorio) {}

  async ocupacao() {
    const linhas = await this.projecoes.listarOcupacao();
    return { porAla: ocupacaoPorAla(linhas), internadosAgora: linhas.filter((l) => !l.alta).length };
  }

  async producao(de?: Date, ate?: Date) {
    const linhas = await this.projecoes.listarProducao(de, ate);
    const porProfissional = contarPor(linhas, (l) => l.profissionalNome);
    return {
      totalAtendimentos: linhas.length,
      porProfissional: Object.entries(porProfissional)
        .map(([profissional, atendimentos]) => ({ profissional, atendimentos }))
        .sort((a, b) => b.atendimentos - a.atendimentos),
    };
  }

  async consultas(de?: Date, ate?: Date) {
    const linhas = await this.projecoes.listarConsultas(de, ate);
    const dia = (d: Date) => d.toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }); // AAAA-MM-DD
    const porDia = new Map<string, { data: string; agendadas: number; canceladas: number }>();
    for (const l of linhas) {
      const g = porDia.get(dia(l.inicio)) ?? { data: dia(l.inicio), agendadas: 0, canceladas: 0 };
      if (l.status === StatusConsulta.CANCELADA) g.canceladas++;
      else g.agendadas++;
      porDia.set(g.data, g);
    }
    return {
      total: linhas.length,
      canceladas: linhas.filter((l) => l.status === StatusConsulta.CANCELADA).length,
      porDia: [...porDia.values()].sort((a, b) => a.data.localeCompare(b.data)),
    };
  }
}
