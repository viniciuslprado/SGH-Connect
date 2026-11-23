import { StatusConsulta } from '@sgh/shared';
import { ConflitoError, RegraNegocioError, ValidacaoError } from '../../../shared/erros/erros';
import { Consulta } from './consulta';

const AGORA = new Date('2026-11-20T12:00:00Z');
const agendar = (inicioIso: string, duracaoMin = 30, profissionalId = 'med-1') =>
  Consulta.agendar({ pacienteId: 'pac-1', profissionalId, inicio: new Date(inicioIso), duracaoMin }, AGORA);

describe('Consulta (domínio do Agendamento)', () => {
  it('detecta sobreposição de horário para o mesmo profissional → ConflitoError (409)', () => {
    const existente = agendar('2026-11-26T14:00:00Z', 30).comId('c-1');
    const nova = agendar('2026-11-26T14:15:00Z', 30);
    expect(() => nova.garantirSemConflito([existente])).toThrow(ConflitoError);
  });

  it('permite horários encostados (fim de uma = início da outra)', () => {
    const existente = agendar('2026-11-26T14:00:00Z', 30).comId('c-1');
    const nova = agendar('2026-11-26T14:30:00Z', 30);
    expect(() => nova.garantirSemConflito([existente])).not.toThrow();
  });

  it('não considera conflito com outro profissional ou com consulta cancelada', () => {
    const outroMedico = agendar('2026-11-26T14:00:00Z', 30, 'med-2').comId('c-1');
    const cancelada = agendar('2026-11-26T14:00:00Z', 30).comId('c-2');
    cancelada.cancelar();
    const nova = agendar('2026-11-26T14:00:00Z', 30);
    expect(() => nova.garantirSemConflito([outroMedico, cancelada])).not.toThrow();
  });

  it('rejeita horário no passado e duração fora dos limites', () => {
    expect(() => agendar('2026-11-01T10:00:00Z')).toThrow(ValidacaoError);
    expect(() => agendar('2026-11-26T10:00:00Z', 5)).toThrow(ValidacaoError);
  });

  it('não cancela duas vezes', () => {
    const c = agendar('2026-11-26T14:00:00Z');
    c.cancelar();
    expect(c.status).toBe(StatusConsulta.CANCELADA);
    expect(() => c.cancelar()).toThrow(RegraNegocioError);
  });
});
