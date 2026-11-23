import { Convenio, Perfil, StatusInternacao, StatusLeito, TipoLeito } from '@sgh/shared';
import { EntradaAuditoria, RegistroAuditoria } from '../../../shared/auditoria/auditoria';
import { ConflitoError } from '../../../shared/erros/erros';
import { EventoDominio } from '../../../shared/eventos/evento-dominio';
import { Outbox } from '../../../shared/eventos/outbox';
import { Transacao, UnidadeDeTrabalho } from '../../../shared/transacao';
import { PacientesApi } from '../../pacientes/contracts';
import { PACIENTE_INTERNADO } from '../contracts';
import { Internacao, InternacaoRepositorio, LeitoRepositorio } from '../domain/internacao';
import { Leito } from '../domain/leito';

import { InternarPacienteUseCase } from './internar-paciente.use-case';

/* ------------------------------------------------------------------ dublês em memória */
class LeitosEmMemoria implements LeitoRepositorio {
  versoes = new Map<string, number>();
  constructor(public dados = new Map<string, Leito>()) {
    dados.forEach((l, id) => this.versoes.set(id, l.versao));
  }
  async obter(id: string) {
    const l = this.dados.get(id);
    return l ? Leito.reconstituir({ id, codigo: l.codigo, ala: l.ala, tipo: l.tipo, status: l.status, versao: this.versoes.get(id)! }) : null;
  }
  async salvar(l: Leito) {
    if (this.versoes.get(l.id!) !== l.versao) throw new ConflitoError('versão desatualizada');
    this.versoes.set(l.id!, l.versao + 1);
    this.dados.set(l.id!, Leito.reconstituir({ id: l.id, codigo: l.codigo, ala: l.ala, tipo: l.tipo, status: l.status, versao: l.versao + 1 }));
  }
  async cadastrar(l: Leito) { return l; }
  async listar() { return [...this.dados.values()]; }
}

class InternacoesEmMemoria implements InternacaoRepositorio {
  dados: Internacao[] = [];
  async obter(id: string) { return this.dados.find((i) => i.id === id) ?? null; }
  async obterAtivaDoPaciente(pacienteId: string) {
    return this.dados.find((i) => i.pacienteId === pacienteId && i.status === StatusInternacao.ATIVA) ?? null;
  }
  async salvar(i: Internacao) {
    const salva = Internacao.reconstituir({ id: i.id ?? `int-${this.dados.length + 1}`, pacienteId: i.pacienteId, leitoId: i.leitoId, motivo: i.motivo, status: i.status, inicio: i.inicio, alta: i.alta });
    this.dados.push(salva);
    return salva;
  }
  async listar() { return this.dados; }
}

const uowDireta: UnidadeDeTrabalho = { executar: <T>(fn: (tx: Transacao) => Promise<T>) => fn(null) };
const pacientesFake = (ativo = true): PacientesApi => ({
  buscarResumo: async (id) => ({ id, nome: 'Paciente Fictício', cpfMascarado: '***.000.***-**', convenio: Convenio.PARTICULAR, ativo }),
  buscarContato: async () => null,
});
const ator = { id: 'u-1', nome: 'Gestor', email: 'gestor@sgh.local', perfil: Perfil.GESTOR_LEITOS };

function montar(statusLeito = StatusLeito.LIVRE) {
  const leito = Leito.reconstituir({ id: 'leito-1', codigo: 'ENF-101', ala: 'Clínica', tipo: TipoLeito.ENFERMARIA, status: statusLeito, versao: 0 });
  const leitos = new LeitosEmMemoria(new Map([['leito-1', leito]]));
  const internacoes = new InternacoesEmMemoria();
  const eventos: EventoDominio[] = [];
  const outbox: Outbox = { adicionar: async (e) => void eventos.push(e) };
  const auditados: EntradaAuditoria[] = [];
  const auditoria: RegistroAuditoria = { registrar: async (e) => void auditados.push(e) };
  const useCase = new InternarPacienteUseCase(leitos, internacoes, pacientesFake(), uowDireta, outbox, auditoria);
  return { useCase, leitos, internacoes, eventos, auditados };
}

/* ------------------------------------------------------------------ testes */
describe('InternarPacienteUseCase (sem banco, com repositórios em memória)', () => {
  it('ocupa o leito, cria a internação e publica PacienteInternado', async () => {
    const { useCase, leitos, internacoes, eventos, auditados } = montar();

    const internacao = await useCase.executar({ pacienteId: 'pac-1', leitoId: 'leito-1', motivo: 'Observação' }, ator);

    expect(internacao.status).toBe(StatusInternacao.ATIVA);
    expect((await leitos.obter('leito-1'))!.status).toBe(StatusLeito.OCUPADO);
    expect(internacoes.dados).toHaveLength(1);
    expect(eventos.map((e) => e.tipo)).toEqual([PACIENTE_INTERNADO]);
    expect(auditados[0]).toMatchObject({ acao: 'PACIENTE_INTERNADO', entidade: 'Internacao' });
  });

  it('leito que não está LIVRE → ConflitoError (409) e nada é publicado', async () => {
    const { useCase, eventos, internacoes } = montar(StatusLeito.HIGIENIZACAO);
    await expect(useCase.executar({ pacienteId: 'pac-1', leitoId: 'leito-1', motivo: 'x' }, ator)).rejects.toBeInstanceOf(ConflitoError);
    expect(eventos).toHaveLength(0);
    expect(internacoes.dados).toHaveLength(0);
  });

  it('duas internações concorrentes no mesmo leito: só uma vence (controle de versão)', async () => {
    const { useCase, internacoes } = montar();
    const resultados = await Promise.allSettled([
      useCase.executar({ pacienteId: 'pac-1', leitoId: 'leito-1', motivo: 'A' }, ator),
      useCase.executar({ pacienteId: 'pac-2', leitoId: 'leito-1', motivo: 'B' }, ator),
    ]);
    expect(resultados.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const falha = resultados.find((r) => r.status === 'rejected') as PromiseRejectedResult;
    expect(falha.reason).toBeInstanceOf(ConflitoError);
    expect(internacoes.dados).toHaveLength(1);
  });

  it('paciente com internação ativa não é internado de novo', async () => {
    const { useCase, leitos } = montar();
    await useCase.executar({ pacienteId: 'pac-1', leitoId: 'leito-1', motivo: 'A' }, ator);
    leitos.dados.set('leito-2', Leito.reconstituir({ id: 'leito-2', codigo: 'ENF-102', ala: 'Clínica', tipo: TipoLeito.ENFERMARIA, status: StatusLeito.LIVRE, versao: 0 }));
    leitos.versoes.set('leito-2', 0);
    await expect(useCase.executar({ pacienteId: 'pac-1', leitoId: 'leito-2', motivo: 'B' }, ator)).rejects.toThrow('internação ativa');
  });
});

describe('Leito (domínio) — conascência de convenção eliminada', () => {
  it('ciclo LIVRE → OCUPADO → HIGIENIZACAO → LIVRE', () => {
    const l = Leito.cadastrar({ codigo: 'uti-01', ala: 'UTI', tipo: TipoLeito.UTI });
    expect(l.codigo).toBe('UTI-01');
    l.ocupar();
    expect(l.status).toBe(StatusLeito.OCUPADO);
    expect(() => l.ocupar()).toThrow(ConflitoError);
    l.liberarParaHigienizacao();
    expect(l.status).toBe(StatusLeito.HIGIENIZACAO);
    l.concluirHigienizacao();
    expect(l.status).toBe(StatusLeito.LIVRE);
  });
});
