import { StatusConta } from '@sgh/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, qs } from '../../shared/api';
import { Aviso, Campo, Estado, Pagina, Selo, fmtDataHora, fmtReais, mensagemDe, useConfirmar } from '../../shared/ui';

interface Conta {
  id: string;
  pacienteNome: string;
  convenio: string;
  status: StatusConta;
  abertaEm: string;
  fechadaEm: string | null;
  total: number;
  itens: { codigo: string; descricao: string; quantidade: number; valorUnitario: number; subtotal: number }[];
}

export function ContasPage() {
  const qc = useQueryClient();
  const confirmar = useConfirmar();
  const [status, setStatus] = useState<StatusConta | ''>(StatusConta.ABERTA);
  const [aberta, setAberta] = useState<string | null>(null);
  const consulta = useQuery({ queryKey: ['contas', status], queryFn: () => api<Conta[]>('GET', `/contas${qs({ status: status || undefined })}`) });
  const fechar = useMutation({ mutationFn: (id: string) => api('PATCH', `/contas/${id}/fechar`), onSuccess: () => qc.invalidateQueries({ queryKey: ['contas'] }) });

  return (
    <Pagina titulo="Contas hospitalares" subtitulo="Geradas automaticamente por eventos de atendimento e alta">
      <div className="filtros">
        <Campo rotulo="Situação">
          <select value={status} onChange={(e) => setStatus(e.target.value as StatusConta | '')}>
            <option value={StatusConta.ABERTA}>Abertas</option>
            <option value={StatusConta.FECHADA}>Fechadas</option>
            <option value="">Todas</option>
          </select>
        </Campo>
      </div>
      <Aviso>{fechar.isError ? mensagemDe(fechar.error) : null}</Aviso>
      <Estado consulta={consulta}>
        {(lista) => (
          <div className="cartoes">
            {lista.map((c) => (
              <article key={c.id} className="cartao">
                <header>
                  <div><strong>{c.pacienteNome}</strong><small>{c.convenio} · aberta em {fmtDataHora(c.abertaEm)}</small></div>
                  <div className="total">{fmtReais(c.total)}</div>
                </header>
                <div className="cartao-acoes">
                  {c.status === StatusConta.ABERTA ? <Selo cor="azul">Aberta</Selo> : <Selo cor="cinza">Fechada em {fmtDataHora(c.fechadaEm)}</Selo>}
                  <button className="btn sec mini" onClick={() => setAberta(aberta === c.id ? null : c.id)}>{aberta === c.id ? 'Ocultar itens' : `Itens (${c.itens.length})`}</button>
                  {c.status === StatusConta.ABERTA && (
                    <button
                      className="btn perigo mini"
                      onClick={async () => {
                        if (await confirmar('Fechar conta', `Fechar a conta de ${c.pacienteNome} no valor de ${fmtReais(c.total)}? Contas fechadas não recebem novos itens.`, 'Fechar conta'))
                          fechar.mutate(c.id);
                      }}
                    >
                      Fechar conta
                    </button>
                  )}
                </div>
                {aberta === c.id && (
                  <table className="tabela compacta">
                    <thead><tr><th>Item</th><th>Qtd</th><th>Unitário</th><th>Subtotal</th></tr></thead>
                    <tbody>{c.itens.map((i, k) => <tr key={k}><td>{i.descricao}</td><td>{i.quantidade}</td><td>{fmtReais(i.valorUnitario)}</td><td>{fmtReais(i.subtotal)}</td></tr>)}</tbody>
                  </table>
                )}
              </article>
            ))}
          </div>
        )}
      </Estado>
    </Pagina>
  );
}
