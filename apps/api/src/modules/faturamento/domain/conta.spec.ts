import { Convenio, StatusConta } from '@sgh/shared';
import { RegraNegocioError } from '../../../shared/erros/erros';
import { Conta, precificar } from './conta';

describe('Conta (domínio do Faturamento)', () => {
  it('aplica o percentual do convênio sobre a tabela base, em centavos', () => {
    expect(precificar('CONSULTA', Convenio.PARTICULAR).valorUnitarioCentavos).toBe(15000);
    expect(precificar('CONSULTA', Convenio.UNIMED).valorUnitarioCentavos).toBe(12750);
  });

  it('soma itens sem erro de ponto flutuante e fecha a conta', () => {
    const c = Conta.abrir('pac-1', Convenio.PARTICULAR);
    c.lancar({ codigo: 'CONSULTA', quantidade: 1, origemEventoId: 'e1' });
    c.lancar({ codigo: 'DIARIA_UTI', quantidade: 3, origemEventoId: 'e2' });
    expect(c.totalCentavos()).toBe(150_00 + 3 * 1_800_00);
    c.fechar();
    expect(c.status).toBe(StatusConta.FECHADA);
    expect(() => c.lancar({ codigo: 'TRIAGEM', quantidade: 1, origemEventoId: 'e3' })).toThrow(RegraNegocioError);
  });

  it('não fecha conta vazia', () => {
    expect(() => Conta.abrir('pac-1', Convenio.SUS).fechar()).toThrow(RegraNegocioError);
  });
});
