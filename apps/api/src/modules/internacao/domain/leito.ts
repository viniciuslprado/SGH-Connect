import { StatusLeito, TipoLeito } from '@sgh/shared';
import { ConflitoError, RegraNegocioError, ValidacaoError } from '../../../shared/erros/erros';

export class LeitoIndisponivelError extends ConflitoError {
  constructor(codigo: string, status: StatusLeito) {
    super(`Leito ${codigo} indisponível (status atual: ${status}).`);
  }
}

export interface DadosLeito {
  id?: string;
  codigo: string;
  ala: string;
  tipo: TipoLeito;
  status: StatusLeito;
  /** Versão lida do banco — usada no controle de concorrência otimista. */
  versao: number;
}

/**
 * Leito. A regra "só ocupa se estiver LIVRE" vive aqui, e não em controllers.
 * Conascência de convenção ELIMINADA: os estados são o enum StatusLeito, nunca 'L'/'O'.
 */
export class Leito {
  private constructor(private readonly d: DadosLeito) {}

  static cadastrar(p: { codigo: string; ala: string; tipo: TipoLeito }): Leito {
    if (!p.codigo?.trim() || !p.ala?.trim()) throw new ValidacaoError('Informe código e ala do leito.');
    return new Leito({ codigo: p.codigo.trim().toUpperCase(), ala: p.ala.trim(), tipo: p.tipo, status: StatusLeito.LIVRE, versao: 0 });
  }

  static reconstituir(d: DadosLeito): Leito {
    return new Leito({ ...d });
  }

  get id() { return this.d.id; }
  get codigo() { return this.d.codigo; }
  get ala() { return this.d.ala; }
  get tipo() { return this.d.tipo; }
  get status() { return this.d.status; }
  get versao() { return this.d.versao; }

  ocupar(): void {
    if (this.d.status !== StatusLeito.LIVRE) throw new LeitoIndisponivelError(this.d.codigo, this.d.status);
    this.d.status = StatusLeito.OCUPADO;
  }

  /** Na alta ou transferência, o leito vai para higienização antes de voltar a ficar livre. */
  liberarParaHigienizacao(): void {
    if (this.d.status !== StatusLeito.OCUPADO) throw new RegraNegocioError(`Leito ${this.d.codigo} não está ocupado.`);
    this.d.status = StatusLeito.HIGIENIZACAO;
  }

  concluirHigienizacao(): void {
    if (this.d.status !== StatusLeito.HIGIENIZACAO && this.d.status !== StatusLeito.MANUTENCAO) {
      throw new RegraNegocioError(`Leito ${this.d.codigo} não está em higienização ou manutenção.`);
    }
    this.d.status = StatusLeito.LIVRE;
  }

  colocarEmManutencao(): void {
    if (this.d.status === StatusLeito.OCUPADO) throw new RegraNegocioError('Leito ocupado não pode entrar em manutenção.');
    this.d.status = StatusLeito.MANUTENCAO;
  }

  comId(id: string): Leito {
    return new Leito({ ...this.d, id });
  }
}
