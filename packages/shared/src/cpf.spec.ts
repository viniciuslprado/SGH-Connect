import { describe, expect, it } from 'vitest';
import { Cpf, CpfInvalidoError } from './cpf';

describe('Cpf (value object compartilhado entre API e Web)', () => {
  it('aceita CPF válido com ou sem máscara', () => {
    expect(Cpf.criar('529.982.247-25').valor).toBe('52998224725');
    expect(Cpf.criar('52998224725').formatado()).toBe('529.982.247-25');
  });

  it('rejeita dígito verificador errado e sequências repetidas', () => {
    expect(() => Cpf.criar('529.982.247-24')).toThrow(CpfInvalidoError);
    expect(Cpf.ehValido('111.111.111-11')).toBe(false);
    expect(Cpf.ehValido('123')).toBe(false);
  });

  it('mascara o CPF para sair do módulo Pacientes', () => {
    expect(Cpf.criar('52998224725').mascarado()).toBe('***.982.***-**');
  });

  it('gera CPFs fictícios válidos', () => {
    const cpf = Cpf.gerarAPartirDaBase('123456789');
    expect(Cpf.ehValido(cpf.valor)).toBe(true);
  });
});
