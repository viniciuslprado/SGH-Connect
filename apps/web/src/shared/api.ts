/**
 * Cliente HTTP único. O front-end conhece apenas a API REST (DTOs), nunca o banco
 * nem as classes do back-end — conascência de nome/tipo via contrato HTTP.
 */
export interface ErroApi {
  statusCode: number;
  erro: string;
  mensagem: string;
  detalhes?: unknown;
}

export class FalhaApi extends Error {
  constructor(readonly corpo: ErroApi) {
    super(corpo.mensagem);
  }
  get status() {
    return this.corpo.statusCode;
  }
  /** Mensagem pronta para exibir (inclui detalhes de validação, se houver). */
  get descricao(): string {
    const d = this.corpo.detalhes;
    return Array.isArray(d) && d.length ? `${this.corpo.mensagem} ${d.join(' ')}` : this.corpo.mensagem;
  }
}

const CHAVE_TOKEN = 'sgh.token';

export const sessao = {
  token: (): string | null => {
    try {
      return localStorage.getItem(CHAVE_TOKEN);
    } catch {
      return null;
    }
  },
  salvar: (t: string) => {
    try {
      localStorage.setItem(CHAVE_TOKEN, t);
    } catch {
      /* navegação privada: segue só em memória */
    }
  },
  limpar: () => {
    try {
      localStorage.removeItem(CHAVE_TOKEN);
    } catch {
      /* ignore */
    }
  },
};

let aoExpirar: () => void = () => undefined;
export const definirAoExpirar = (fn: () => void) => (aoExpirar = fn);

export async function api<T>(metodo: 'GET' | 'POST' | 'PATCH', caminho: string, corpo?: unknown): Promise<T> {
  const token = sessao.token();
  let resposta: Response;
  try {
    resposta = await fetch(`/api${caminho}`, {
      method: metodo,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    });
  } catch {
    throw new FalhaApi({ statusCode: 0, erro: 'Sem conexão', mensagem: 'Não foi possível falar com a API. Ela está rodando?' });
  }
  const texto = await resposta.text();
  const json = texto ? JSON.parse(texto) : undefined;
  if (!resposta.ok) {
    if (resposta.status === 401 && caminho !== '/auth/login') aoExpirar();
    throw new FalhaApi(json ?? { statusCode: resposta.status, erro: 'Erro', mensagem: resposta.statusText });
  }
  return json as T;
}

export const qs = (params: Record<string, string | undefined>) => {
  const p = Object.entries(params).filter(([, v]) => v) as [string, string][];
  return p.length ? `?${new URLSearchParams(p).toString()}` : '';
};
