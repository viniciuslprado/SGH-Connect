import { Convenio, StatusConta, TipoLeito } from '@sgh/shared';
import { RegraNegocioError } from '../../../shared/erros/erros';
import { Transacao } from '../../../shared/transacao';

/**
 * Valores em CENTAVOS (inteiros) para evitar erro de arredondamento de ponto flutuante.
 * Tabela fictícia, apenas para fins acadêmicos.
 */
const PRECO_BASE_CENTAVOS: Record<string, { descricao: string; valor: number }> = {
  CONSULTA: { descricao: 'Consulta médica', valor: 150_00 },
  TRIAGEM: { descricao: 'Triagem de enfermagem', valor: 40_00 },
  [`DIARIA_${TipoLeito.ENFERMARIA}`]: { descricao: 'Diária — enfermaria', valor: 350_00 },
  [`DIARIA_${TipoLeito.APARTAMENTO}`]: { descricao: 'Diária — apartamento', valor: 600_00 },
  [`DIARIA_${TipoLeito.UTI}`]: { descricao: 'Diária — UTI', valor: 1_800_00 },
};

/** Percentual da tabela base praticado por convênio (regra exclusiva do Faturamento). */
const PERCENTUAL_CONVENIO: Record<Convenio, number> = {
  [Convenio.PARTICULAR]: 100,
  [Convenio.UNIMED]: 85,
  [Convenio.BRADESCO_SAUDE]: 90,
  [Convenio.SUS]: 60,
};

export function precificar(codigo: string, convenio: Convenio): { descricao: string; valorUnitarioCentavos: number } {
  const base = PRECO_BASE_CENTAVOS[codigo];
  if (!base) throw new RegraNegocioError(`Procedimento sem preço na tabela: ${codigo}`);
  return { descricao: base.descricao, valorUnitarioCentavos: Math.round((base.valor * PERCENTUAL_CONVENIO[convenio]) / 100) };
}

export interface ItemConta {
  id?: string;
  codigo: string;
  descricao: string;
  quantidade: number;
  valorUnitarioCentavos: number;
  origemEventoId: string;
}

export interface DadosConta {
  id?: string;
  pacienteId: string;
  convenio: Convenio;
  status: StatusConta;
  abertaEm: Date;
  fechadaEm: Date | null;
  itens: ItemConta[];
}

/** Conta hospitalar: transforma fatos clínicos em valores. Módulos clínicos não conhecem dinheiro. */
export class Conta {
  private constructor(private readonly d: DadosConta) {}

  static abrir(pacienteId: string, convenio: Convenio, agora = new Date()): Conta {
    return new Conta({ pacienteId, convenio, status: StatusConta.ABERTA, abertaEm: agora, fechadaEm: null, itens: [] });
  }

  static reconstituir(d: DadosConta): Conta {
    return new Conta({ ...d, itens: [...d.itens] });
  }

  get id() { return this.d.id; }
  get pacienteId() { return this.d.pacienteId; }
  get convenio() { return this.d.convenio; }
  get status() { return this.d.status; }
  get abertaEm() { return this.d.abertaEm; }
  get fechadaEm() { return this.d.fechadaEm; }
  get itens(): readonly ItemConta[] { return this.d.itens; }

  lancar(p: { codigo: string; quantidade: number; origemEventoId: string }): ItemConta {
    if (this.d.status !== StatusConta.ABERTA) throw new RegraNegocioError('Conta fechada não recebe novos itens.');
    const { descricao, valorUnitarioCentavos } = precificar(p.codigo, this.d.convenio);
    const item: ItemConta = { ...p, descricao, valorUnitarioCentavos };
    this.d.itens.push(item);
    return item;
  }

  totalCentavos(): number {
    return this.d.itens.reduce((soma, i) => soma + i.quantidade * i.valorUnitarioCentavos, 0);
  }

  fechar(agora = new Date()): void {
    if (this.d.status !== StatusConta.ABERTA) throw new RegraNegocioError('A conta já está fechada.');
    if (this.d.itens.length === 0) throw new RegraNegocioError('Conta sem itens não pode ser fechada.');
    this.d.status = StatusConta.FECHADA;
    this.d.fechadaEm = agora;
  }
}

export interface ContaRepositorio {
  /** Registra o eventId como processado. Retorna false se ele JÁ tinha sido processado (idempotência). */
  marcarEventoProcessado(eventId: string, tx: Transacao): Promise<boolean>;
  obterAbertaDoPaciente(pacienteId: string, tx?: Transacao): Promise<Conta | null>;
  obter(id: string, tx?: Transacao): Promise<Conta | null>;
  salvar(conta: Conta, tx?: Transacao): Promise<Conta>;
  listar(filtro: { pacienteId?: string; status?: StatusConta }): Promise<Conta[]>;
}

export const CONTA_REPOSITORIO = Symbol('CONTA_REPOSITORIO');
