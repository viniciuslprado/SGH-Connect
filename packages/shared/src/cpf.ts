/**
 * Value object CPF.
 *
 * Conascência de algoritmo ELIMINADA (documento, seção 7.6): o cálculo do dígito
 * verificador existe em um único lugar e é importado pela API e pelo formulário web.
 */
/** Dígito verificador do CPF (módulo 11). Único ponto do sistema com este algoritmo. */
function digitoVerificador(base: string, pesoInicial: number): number {
  const soma = base.split('').reduce((acc, n, i) => acc + Number(n) * (pesoInicial - i), 0);
  const resto = (soma * 10) % 11;
  return resto === 10 ? 0 : resto;
}

export class CpfInvalidoError extends Error {
  constructor(entrada: string) {
    super(`CPF inválido: ${entrada}`);
    this.name = 'CpfInvalidoError';
  }
}

export class Cpf {
  private constructor(readonly valor: string) {}

  /** Cria um CPF a partir de texto com ou sem máscara. Lança CpfInvalidoError se inválido. */
  static criar(entrada: string): Cpf {
    const digitos = (entrada ?? '').replace(/\D/g, '');
    if (!Cpf.valido(digitos)) throw new CpfInvalidoError(entrada);
    return new Cpf(digitos);
  }

  static ehValido(entrada: string): boolean {
    return Cpf.valido((entrada ?? '').replace(/\D/g, ''));
  }

  private static valido(d: string): boolean {
    if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
    return digitoVerificador(d.slice(0, 9), 10) === Number(d[9]) && digitoVerificador(d.slice(0, 10), 11) === Number(d[10]);
  }

  formatado(): string {
    const v = this.valor;
    return `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6, 9)}-${v.slice(9)}`;
  }

  /** Versão segura para sair do módulo Pacientes (LGPD). */
  mascarado(): string {
    return `***.${this.valor.slice(3, 6)}.***-**`;
  }

  /** Gera um CPF válido a partir de 9 dígitos-base (útil para dados fictícios). */
  static gerarAPartirDaBase(base9: string): Cpf {
    const b = base9.replace(/\D/g, '').padStart(9, '0').slice(0, 9);
    const d1 = digitoVerificador(b, 10);
    const d2 = digitoVerificador(b + d1, 11);
    return Cpf.criar(`${b}${d1}${d2}`);
  }
}
