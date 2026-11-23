import { useState } from 'react';
import { useAuth } from '../../shared/auth';
import { Aviso, Campo, mensagemDe } from '../../shared/ui';

const CONTAS_DEMO = [
  ['admin@sgh.local', 'Administrador'],
  ['recepcao@sgh.local', 'Recepção'],
  ['medico@sgh.local', 'Médico'],
  ['enfermeiro@sgh.local', 'Enfermeiro'],
  ['leitos@sgh.local', 'Gestor de leitos'],
  ['faturamento@sgh.local', 'Faturista'],
];

export function LoginPage() {
  const { entrar } = useAuth();
  const [email, setEmail] = useState('admin@sgh.local');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const enviar = async () => {
    setErro(null);
    setEnviando(true);
    try {
      await entrar(email, senha);
    } catch (e) {
      setErro(mensagemDe(e));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="login">
      <form className="login-cartao" onSubmit={(e) => { e.preventDefault(); void enviar(); }}>
        <div className="marca grande"><span className="logo" aria-hidden>+</span> SGH Connect</div>
        <p className="sub">Sistema Integrado de Gestão Hospitalar</p>
        <Campo rotulo="E-mail">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required />
        </Campo>
        <Campo rotulo="Senha">
          <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="current-password" required />
        </Campo>
        <Aviso>{erro}</Aviso>
        <button className="btn largo" disabled={enviando}>{enviando ? 'Entrando…' : 'Entrar'}</button>
        <details className="demo">
          <summary>Contas de demonstração (dados fictícios)</summary>
          <p>Senha de todas: <code>sgh@2026</code></p>
          <div className="demo-lista">
            {CONTAS_DEMO.map(([e, r]) => (
              <button type="button" key={e} className="btn sec mini" onClick={() => setEmail(e)}>{r}</button>
            ))}
          </div>
        </details>
      </form>
    </div>
  );
}
