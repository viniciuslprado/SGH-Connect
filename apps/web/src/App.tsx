import { Perfil, ROTULO_PERFIL } from '@sgh/shared';
import { ReactNode, useState } from 'react';
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './shared/auth';
import { AgendaPage } from './modules/agendamento/AgendaPage';
import { AtendimentosPage } from './modules/atendimento/AtendimentosPage';
import { AuditoriaPage } from './modules/auditoria/AuditoriaPage';
import { ProfissionaisPage } from './modules/corpo-clinico/ProfissionaisPage';
import { ContasPage } from './modules/faturamento/ContasPage';
import { LoginPage } from './modules/identidade/LoginPage';
import { UsuariosPage } from './modules/identidade/UsuariosPage';
import { LeitosPage } from './modules/internacao/LeitosPage';
import { NotificacoesPage } from './modules/notificacoes/NotificacoesPage';
import { PacientesPage } from './modules/pacientes/PacientesPage';
import { DashboardPage } from './modules/relatorios/DashboardPage';

const { ADMIN, RECEPCIONISTA, MEDICO, ENFERMEIRO, GESTOR_LEITOS, FATURISTA } = Perfil;
const TODOS = Object.values(Perfil);

/** Menu e rotas espelham as mesmas permissões (@Perfis) da API. A API é quem garante o acesso. */
const ROTAS: { caminho: string; rotulo: string; icone: string; perfis: Perfil[]; pagina: ReactNode }[] = [
  { caminho: '/', rotulo: 'Início', icone: '◧', perfis: TODOS, pagina: <DashboardPage /> },
  { caminho: '/pacientes', rotulo: 'Pacientes', icone: '☺', perfis: [ADMIN, RECEPCIONISTA, MEDICO, ENFERMEIRO, GESTOR_LEITOS, FATURISTA], pagina: <PacientesPage /> },
  { caminho: '/agenda', rotulo: 'Agenda', icone: '▦', perfis: [ADMIN, RECEPCIONISTA, MEDICO, ENFERMEIRO], pagina: <AgendaPage /> },
  { caminho: '/atendimentos', rotulo: 'Atendimentos', icone: '✚', perfis: [ADMIN, RECEPCIONISTA, MEDICO, ENFERMEIRO], pagina: <AtendimentosPage /> },
  { caminho: '/leitos', rotulo: 'Leitos', icone: '▭', perfis: [ADMIN, GESTOR_LEITOS, MEDICO, ENFERMEIRO, RECEPCIONISTA], pagina: <LeitosPage /> },
  { caminho: '/contas', rotulo: 'Contas', icone: '$', perfis: [ADMIN, FATURISTA], pagina: <ContasPage /> },
  { caminho: '/profissionais', rotulo: 'Corpo clínico', icone: '⚕', perfis: TODOS, pagina: <ProfissionaisPage /> },
  { caminho: '/notificacoes', rotulo: 'Notificações', icone: '✉', perfis: [ADMIN, RECEPCIONISTA], pagina: <NotificacoesPage /> },
  { caminho: '/usuarios', rotulo: 'Usuários', icone: '⚿', perfis: [ADMIN], pagina: <UsuariosPage /> },
  { caminho: '/auditoria', rotulo: 'Auditoria', icone: '☰', perfis: [ADMIN], pagina: <AuditoriaPage /> },
];

export function App() {
  const { usuario, carregando, sair } = useAuth();
  const [menuAberto, setMenuAberto] = useState(false);
  const local = useLocation();

  if (carregando) return <div className="estado tela-cheia"><span className="spinner" /> Carregando…</div>;
  if (!usuario) return <LoginPage />;

  const permitidas = ROTAS.filter((r) => r.perfis.includes(usuario.perfil));

  return (
    <div className="layout">
      <aside className={`lateral ${menuAberto ? 'aberto' : ''}`}>
        <div className="marca"><span className="logo" aria-hidden>+</span> SGH Connect</div>
        <nav onClick={() => setMenuAberto(false)}>
          {permitidas.map((r) => (
            <NavLink key={r.caminho} to={r.caminho} end={r.caminho === '/'}>
              <span className="icone" aria-hidden>{r.icone}</span> {r.rotulo}
            </NavLink>
          ))}
        </nav>
        <div className="usuario">
          <strong>{usuario.nome}</strong>
          <small>{ROTULO_PERFIL[usuario.perfil]}</small>
          <button className="btn sec mini" onClick={sair}>Sair</button>
        </div>
      </aside>
      <div className="conteudo">
        <header className="barra-movel">
          <button className="btn sec mini" onClick={() => setMenuAberto((v) => !v)} aria-label="Abrir menu">☰ Menu</button>
          <span className="marca"><span className="logo" aria-hidden>+</span> SGH Connect</span>
        </header>
        <main key={local.pathname}>
          <Routes>
            {permitidas.map((r) => <Route key={r.caminho} path={r.caminho} element={r.pagina} />)}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <footer className="rodape">Projeto acadêmico — Uni-FACEF · Arquitetura de Software · somente dados fictícios</footer>
      </div>
    </div>
  );
}
