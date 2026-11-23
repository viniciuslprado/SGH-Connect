import { Perfil, ROTULO_PERFIL } from '@sgh/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../../shared/api';
import { Usuario } from '../../shared/auth';
import { Campo, Estado, Formulario, Modal, Pagina, mensagemDe } from '../../shared/ui';

export function UsuariosPage() {
  const qc = useQueryClient();
  const consulta = useQuery({ queryKey: ['usuarios'], queryFn: () => api<Usuario[]>('GET', '/usuarios') });
  const [aberto, setAberto] = useState(false);
  const [f, setF] = useState({ nome: '', email: '', senha: '', perfil: Perfil.RECEPCIONISTA });
  const criar = useMutation({
    mutationFn: () => api('POST', '/usuarios', f),
    onSuccess: () => { setAberto(false); void qc.invalidateQueries({ queryKey: ['usuarios'] }); },
  });

  return (
    <Pagina titulo="Usuários" subtitulo="Módulo Identidade e Acesso" acoes={<button className="btn" onClick={() => setAberto(true)}>Novo usuário</button>}>
      <Estado consulta={consulta}>
        {(lista) => (
          <table className="tabela">
            <thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th></tr></thead>
            <tbody>{lista.map((u) => <tr key={u.id}><td>{u.nome}</td><td>{u.email}</td><td>{ROTULO_PERFIL[u.perfil]}</td></tr>)}</tbody>
          </table>
        )}
      </Estado>
      {aberto && (
        <Modal titulo="Novo usuário" aoFechar={() => setAberto(false)}>
          <Formulario aoEnviar={() => criar.mutate()} enviando={criar.isPending} erro={criar.isError ? mensagemDe(criar.error) : null}>
            <Campo rotulo="Nome"><input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} required /></Campo>
            <Campo rotulo="E-mail"><input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required /></Campo>
            <Campo rotulo="Senha" dica="Mínimo de 6 caracteres"><input type="password" value={f.senha} onChange={(e) => setF({ ...f, senha: e.target.value })} required /></Campo>
            <Campo rotulo="Perfil">
              <select value={f.perfil} onChange={(e) => setF({ ...f, perfil: e.target.value as Perfil })}>
                {Object.values(Perfil).map((p) => <option key={p} value={p}>{ROTULO_PERFIL[p]}</option>)}
              </select>
            </Campo>
          </Formulario>
        </Modal>
      )}
    </Pagina>
  );
}
