import { UseQueryResult } from '@tanstack/react-query';
import { createContext, FormEvent, ReactNode, useCallback, useContext, useRef, useState } from 'react';
import { FalhaApi } from './api';

/* ------------------------------------------------------------------ formatação (ISO 8601 → pt-BR) */
const TZ = 'America/Sao_Paulo';
export const fmtDataHora = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString('pt-BR', { timeZone: TZ, dateStyle: 'short', timeStyle: 'short' }) : '—';
export const fmtHora = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
export const fmtData = (isoData?: string | null) => (isoData ? isoData.slice(0, 10).split('-').reverse().join('/') : '—');
export const fmtReais = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const hojeIso = () => new Date().toLocaleDateString('sv-SE', { timeZone: TZ });
export const mensagemDe = (e: unknown) => (e instanceof FalhaApi ? e.descricao : (e as Error)?.message ?? 'Erro inesperado.');

/* ------------------------------------------------------------------ cabeçalho de página */
export function Pagina({ titulo, subtitulo, acoes, children }: { titulo: string; subtitulo?: string; acoes?: ReactNode; children: ReactNode }) {
  return (
    <section className="pagina">
      <header className="pagina-topo">
        <div>
          <h1>{titulo}</h1>
          {subtitulo && <p className="sub">{subtitulo}</p>}
        </div>
        {acoes && <div className="acoes">{acoes}</div>}
      </header>
      {children}
    </section>
  );
}

/* ------------------------------------------------------------------ estados: carregando / erro / vazio */
export function Estado<T>({
  consulta,
  vazio,
  children,
}: {
  consulta: UseQueryResult<T>;
  vazio?: (d: T) => boolean;
  children: (d: T) => ReactNode;
}) {
  if (consulta.isPending) return <div className="estado"><span className="spinner" aria-hidden /> Carregando…</div>;
  if (consulta.isError)
    return (
      <div className="estado erro" role="alert">
        <strong>Não foi possível carregar.</strong> {mensagemDe(consulta.error)}
        <button className="btn sec" onClick={() => consulta.refetch()}>Tentar novamente</button>
      </div>
    );
  const dados = consulta.data as T;
  if (vazio?.(dados) ?? (Array.isArray(dados) && dados.length === 0)) return <div className="estado vazio">Nada por aqui ainda.</div>;
  return <>{children(dados)}</>;
}

export function Aviso({ tipo = 'erro', children }: { tipo?: 'erro' | 'ok'; children: ReactNode }) {
  if (!children) return null;
  return <div className={`aviso ${tipo}`} role={tipo === 'erro' ? 'alert' : 'status'}>{children}</div>;
}

export function Selo({ cor, children }: { cor: string; children: ReactNode }) {
  return <span className={`selo ${cor}`}>{children}</span>;
}

export function Campo({ rotulo, children, dica }: { rotulo: string; children: ReactNode; dica?: string }) {
  return (
    <label className="campo">
      <span>{rotulo}</span>
      {children}
      {dica && <small>{dica}</small>}
    </label>
  );
}

/* ------------------------------------------------------------------ modal / formulário */
export function Modal({ titulo, aoFechar, children }: { titulo: string; aoFechar: () => void; children: ReactNode }) {
  return (
    <div className="modal-fundo" onMouseDown={(e) => e.target === e.currentTarget && aoFechar()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={titulo}>
        <header>
          <h2>{titulo}</h2>
          <button className="fechar" onClick={aoFechar} aria-label="Fechar">×</button>
        </header>
        {children}
      </div>
    </div>
  );
}

export function Formulario({ aoEnviar, enviando, erro, rotulo = 'Salvar', children }: {
  aoEnviar: () => void; enviando?: boolean; erro?: string | null; rotulo?: string; children: ReactNode;
}) {
  return (
    <form className="form" onSubmit={(e: FormEvent) => { e.preventDefault(); aoEnviar(); }}>
      {children}
      <Aviso>{erro}</Aviso>
      <div className="form-acoes">
        <button className="btn" disabled={enviando}>{enviando ? 'Salvando…' : rotulo}</button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ confirmação de ações destrutivas */
type Pedido = { titulo: string; mensagem: string; confirmar: string; resolver: (ok: boolean) => void };
const CtxConfirmar = createContext<(titulo: string, mensagem: string, confirmar?: string) => Promise<boolean>>(async () => false);

export function ProvedorConfirmacao({ children }: { children: ReactNode }) {
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const botao = useRef<HTMLButtonElement>(null);
  const confirmar = useCallback(
    (titulo: string, mensagem: string, rotulo = 'Confirmar') =>
      new Promise<boolean>((resolver) => {
        setPedido({ titulo, mensagem, confirmar: rotulo, resolver });
        setTimeout(() => botao.current?.focus(), 0);
      }),
    [],
  );
  const fechar = (ok: boolean) => {
    pedido?.resolver(ok);
    setPedido(null);
  };
  return (
    <CtxConfirmar.Provider value={confirmar}>
      {children}
      {pedido && (
        <Modal titulo={pedido.titulo} aoFechar={() => fechar(false)}>
          <p>{pedido.mensagem}</p>
          <div className="form-acoes">
            <button className="btn sec" onClick={() => fechar(false)}>Voltar</button>
            <button className="btn perigo" ref={botao} onClick={() => fechar(true)}>{pedido.confirmar}</button>
          </div>
        </Modal>
      )}
    </CtxConfirmar.Provider>
  );
}

export const useConfirmar = () => useContext(CtxConfirmar);
