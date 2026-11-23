import { StatusNotificacao } from '@sgh/shared';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../shared/api';
import { Estado, Pagina, Selo, fmtDataHora } from '../../shared/ui';

interface Notificacao {
  id: string;
  destino: string;
  assunto: string;
  mensagem: string;
  status: StatusNotificacao;
  enviadaEm: string;
}

export function NotificacoesPage() {
  const consulta = useQuery({ queryKey: ['notificacoes'], queryFn: () => api<Notificacao[]>('GET', '/notificacoes'), refetchInterval: 5_000 });
  return (
    <Pagina titulo="Notificações" subtitulo="E-mails simulados enviados aos pacientes a partir de eventos">
      <Estado consulta={consulta}>
        {(lista) => (
          <div className="tabela-rolagem">
            <table className="tabela">
              <thead><tr><th>Quando</th><th>Destino</th><th>Assunto</th><th>Mensagem</th><th>Situação</th></tr></thead>
              <tbody>
                {lista.map((n) => (
                  <tr key={n.id}>
                    <td>{fmtDataHora(n.enviadaEm)}</td>
                    <td>{n.destino}</td>
                    <td>{n.assunto}</td>
                    <td className="texto-longo">{n.mensagem}</td>
                    <td>{n.status === StatusNotificacao.ENVIADA ? <Selo cor="verde">Enviada</Selo> : <Selo cor="vermelho">Falhou</Selo>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Estado>
    </Pagina>
  );
}
