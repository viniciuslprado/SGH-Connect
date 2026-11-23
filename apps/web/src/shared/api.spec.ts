import { Cpf, StatusLeito, ROTULO_STATUS_LEITO } from '@sgh/shared';
import { describe, expect, it } from 'vitest';
import { FalhaApi } from './api';
import { fmtData, mensagemDe } from './ui';

describe('Web — contrato com a API', () => {
  it('mostra a mensagem de erro uniforme da API, incluindo detalhes de validação', () => {
    const erro = new FalhaApi({ statusCode: 400, erro: 'Requisição inválida', mensagem: 'Dados de entrada inválidos.', detalhes: ['Informe o CPF.'] });
    expect(mensagemDe(erro)).toBe('Dados de entrada inválidos. Informe o CPF.');
    expect(erro.status).toBe(400);
  });

  it('usa o MESMO value object Cpf da API (conascência de algoritmo eliminada)', () => {
    expect(Cpf.ehValido('529.982.247-25')).toBe(true);
    expect(Cpf.ehValido('529.982.247-24')).toBe(false);
  });

  it('todo StatusLeito tem rótulo (enum compartilhado)', () => {
    Object.values(StatusLeito).forEach((s) => expect(ROTULO_STATUS_LEITO[s]).toBeTruthy());
  });

  it('formata data ISO 8601 para pt-BR', () => {
    expect(fmtData('2026-11-26')).toBe('26/11/2026');
  });
});
