import { Perfil, ROTULO_PERFIL } from '@sgh/shared';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../shared/api';
import { useAuth } from '../../shared/auth';
import { Estado, Pagina, fmtData } from '../../shared/ui';

interface Ocupacao { internadosAgora: number; porAla: { ala: string; internadosAgora: number; altas: number; mediaPermanenciaDias: number | null }[] }
interface Producao { totalAtendimentos: number; porProfissional: { profissional: string; atendimentos: number }[] }
interface Consultas { total: number; canceladas: number; porDia: { data: string; agendadas: number; canceladas: number }[] }

function Barras({ itens }: { itens: { rotulo: string; valor: number; extra?: string }[] }) {
  const max = Math.max(1, ...itens.map((i) => i.valor));
  if (!itens.length) return <p className="sub">Sem dados ainda.</p>;
  return (
    <ul className="barras">
      {itens.map((i) => (
        <li key={i.rotulo}>
          <span className="rotulo">{i.rotulo}</span>
          <span className="trilho"><span className="barra" style={{ width: `${(i.valor / max) * 100}%` }} /></span>
          <span className="valor">{i.valor}{i.extra && <small> {i.extra}</small>}</span>
        </li>
      ))}
    </ul>
  );
}

export function DashboardPage() {
  const { usuario, tem } = useAuth();
  const admin = tem(Perfil.ADMIN);
  const veOcupacao = tem(Perfil.ADMIN, Perfil.GESTOR_LEITOS);
  const veConsultas = tem(Perfil.ADMIN, Perfil.RECEPCIONISTA);
  const ocupacao = useQuery({ queryKey: ['rel', 'ocupacao'], queryFn: () => api<Ocupacao>('GET', '/relatorios/ocupacao'), enabled: veOcupacao });
  const producao = useQuery({ queryKey: ['rel', 'producao'], queryFn: () => api<Producao>('GET', '/relatorios/producao'), enabled: admin });
  const consultas = useQuery({ queryKey: ['rel', 'consultas'], queryFn: () => api<Consultas>('GET', '/relatorios/consultas'), enabled: veConsultas });

  return (
    <Pagina titulo={`Olá, ${usuario?.nome.split(' ')[0]}`} subtitulo={`Perfil: ${usuario ? ROTULO_PERFIL[usuario.perfil] : ''} · Indicadores montados por eventos (módulo Relatórios)`}>
      {!veOcupacao && !veConsultas && (
        <div className="estado vazio">
          Use o menu para acessar suas funções. {tem(Perfil.MEDICO, Perfil.ENFERMEIRO) && <Link to="/atendimentos">Ver atendimentos abertos →</Link>}
          {tem(Perfil.FATURISTA) && <Link to="/contas">Ver contas abertas →</Link>}
        </div>
      )}
      <div className="painel">
        {veOcupacao && (
          <article className="cartao">
            <h3>Internados agora</h3>
            <Estado consulta={ocupacao} vazio={() => false}>
              {(o) => (
                <>
                  <div className="numero">{o.internadosAgora}</div>
                  <Barras itens={o.porAla.map((a) => ({ rotulo: a.ala, valor: a.internadosAgora, extra: a.mediaPermanenciaDias != null ? `· média ${a.mediaPermanenciaDias} d` : '' }))} />
                </>
              )}
            </Estado>
          </article>
        )}
        {admin && (
          <article className="cartao">
            <h3>Atendimentos finalizados</h3>
            <Estado consulta={producao} vazio={() => false}>
              {(p) => (
                <>
                  <div className="numero">{p.totalAtendimentos}</div>
                  <Barras itens={p.porProfissional.map((x) => ({ rotulo: x.profissional, valor: x.atendimentos }))} />
                </>
              )}
            </Estado>
          </article>
        )}
        {veConsultas && (
          <article className="cartao largo">
            <h3>Consultas por dia</h3>
            <Estado consulta={consultas} vazio={() => false}>
              {(c) => (
                <>
                  <div className="numero">{c.total} <small>({c.canceladas} canceladas)</small></div>
                  <Barras itens={c.porDia.map((d) => ({ rotulo: fmtData(d.data), valor: d.agendadas, extra: d.canceladas ? `+${d.canceladas} canc.` : '' }))} />
                </>
              )}
            </Estado>
          </article>
        )}
      </div>
    </Pagina>
  );
}
