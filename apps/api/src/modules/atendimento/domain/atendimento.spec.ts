import { ClassificacaoRisco, StatusAtendimento } from '@sgh/shared';
import { RegraNegocioError, ValidacaoError } from '../../../shared/erros/erros';
import { Atendimento } from './atendimento';

const novo = () => Atendimento.abrir({ pacienteId: 'pac-1', profissionalId: 'med-1' });
const evolucao = { autorId: 'med-1', conduta: 'Orientações gerais (texto fictício)' };

describe('Atendimento (agregado) — conascência de execução', () => {
  it('aceita registro clínico com o atendimento aberto', () => {
    const a = novo();
    a.registrarEvolucao(evolucao);
    expect(a.registros).toHaveLength(1);
  });

  it('atendimento FINALIZADO não recebe nova evolução → RegraNegocioError (422)', () => {
    const a = novo();
    a.registrarEvolucao(evolucao);
    a.finalizar();
    expect(a.status).toBe(StatusAtendimento.FINALIZADO);
    expect(() => a.registrarEvolucao(evolucao)).toThrow(RegraNegocioError);
    expect(() => a.registrarEvolucao(evolucao)).toThrow('Atendimento finalizado não permite novos registros clínicos.');
  });

  it('não finaliza sem ao menos um registro clínico', () => {
    expect(() => novo().finalizar()).toThrow(RegraNegocioError);
  });

  it('procedimentos faturáveis incluem a triagem quando realizada', () => {
    const a = novo();
    a.registrarTriagem({ classificacaoRisco: ClassificacaoRisco.VERDE, queixaPrincipal: 'Cefaleia', registradaPor: 'enf-1' });
    a.registrarEvolucao(evolucao);
    expect(a.finalizar()).toEqual([
      { codigo: 'CONSULTA', quantidade: 1 },
      { codigo: 'TRIAGEM', quantidade: 1 },
    ]);
  });

  it('valida CID e sinais vitais', () => {
    const a = novo();
    expect(() => a.registrarEvolucao({ ...evolucao, cid: 'XYZ' })).toThrow(ValidacaoError);
    expect(() =>
      a.registrarTriagem({ classificacaoRisco: ClassificacaoRisco.AZUL, queixaPrincipal: 'x', saturacao: 140, registradaPor: 'enf-1' }),
    ).toThrow(ValidacaoError);
  });
});
