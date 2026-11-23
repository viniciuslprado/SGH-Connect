/**
 * Cálculos dos indicadores (puros, sem banco). O módulo Relatórios tem coesão COMUNICACIONAL:
 * opera sobre as próprias projeções de leitura, montadas a partir de eventos — nunca por JOIN
 * nas tabelas de outros módulos.
 */
const DIA_MS = 24 * 3600_000;

export interface PeriodoInternacao {
  ala: string;
  tipoLeito: string;
  inicio: Date;
  alta: Date | null;
}

export function ocupacaoPorAla(internacoes: PeriodoInternacao[]) {
  const porAla = new Map<string, { ala: string; internadosAgora: number; altas: number; somaDias: number }>();
  for (const i of internacoes) {
    const g = porAla.get(i.ala) ?? { ala: i.ala, internadosAgora: 0, altas: 0, somaDias: 0 };
    if (i.alta) {
      g.altas++;
      g.somaDias += (i.alta.getTime() - i.inicio.getTime()) / DIA_MS;
    } else {
      g.internadosAgora++;
    }
    porAla.set(i.ala, g);
  }
  return [...porAla.values()].map((g) => ({
    ala: g.ala,
    internadosAgora: g.internadosAgora,
    altas: g.altas,
    mediaPermanenciaDias: g.altas ? Math.round((g.somaDias / g.altas) * 10) / 10 : null,
  }));
}

export function contarPor<T>(itens: T[], chave: (t: T) => string): Record<string, number> {
  return itens.reduce<Record<string, number>>((acc, t) => {
    const k = chave(t);
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});
}
