import { useQuery } from '@tanstack/react-query';
import { api } from '../../shared/api';
import { Estado, Pagina, Selo, fmtDataHora } from '../../shared/ui';

interface Registro {
  id: string;
  atorEmail: string | null;
  acao: string;
  entidade: string;
  entidadeId: string | null;
  criadoEm: string;
}

export function AuditoriaPage() {
  const consulta = useQuery({ queryKey: ['auditoria'], queryFn: () => api<Registro[]>('GET', '/auditoria') });
  return (
    <Pagina titulo="Auditoria" subtitulo="Quem fez o quê e quando — nunca o conteúdo clínico">
      <Estado consulta={consulta}>
        {(lista) => (
          <div className="tabela-rolagem">
            <table className="tabela">
              <thead><tr><th>Quando</th><th>Usuário</th><th>Ação</th><th>Entidade</th><th>Id</th></tr></thead>
              <tbody>
                {lista.map((r) => (
                  <tr key={r.id}>
                    <td>{fmtDataHora(r.criadoEm)}</td>
                    <td>{r.atorEmail ?? 'sistema'}</td>
                    <td><Selo cor={r.acao === 'PRONTUARIO_LIDO' ? 'laranja' : 'azul'}>{r.acao}</Selo></td>
                    <td>{r.entidade}</td>
                    <td className="mono">{r.entidadeId?.slice(0, 8) ?? '—'}</td>
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
