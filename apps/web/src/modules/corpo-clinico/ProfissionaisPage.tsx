import { Perfil, TipoProfissional } from '@sgh/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useAuth } from '../../shared/auth';
import { Campo, Estado, Formulario, Modal, Pagina, Selo, mensagemDe, useConfirmar } from '../../shared/ui';
import { corpoClinicoApi } from './api';

export function ProfissionaisPage() {
  const { tem } = useAuth();
  const admin = tem(Perfil.ADMIN);
  const qc = useQueryClient();
  const confirmar = useConfirmar();
  const [aberto, setAberto] = useState(false);
  const [f, setF] = useState({ nome: '', tipo: TipoProfissional.MEDICO, registro: '', especialidade: '' });
  const consulta = useQuery({ queryKey: ['profissionais', 'todos'], queryFn: () => corpoClinicoApi.listar(undefined, true) });

  const criar = useMutation({
    mutationFn: () => corpoClinicoApi.criar(f),
    onSuccess: () => { setAberto(false); void qc.invalidateQueries({ queryKey: ['profissionais'] }); },
  });
  const alternar = useMutation({
    mutationFn: ({ id, ativo }: { id: string; ativo: boolean }) => corpoClinicoApi.alterarAtivo(id, ativo),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profissionais'] }),
  });

  return (
    <Pagina titulo="Corpo clínico" subtitulo="Médicos e enfermeiros" acoes={admin && <button className="btn" onClick={() => setAberto(true)}>Novo profissional</button>}>
      <Estado consulta={consulta}>
        {(lista) => (
          <div className="tabela-rolagem">
            <table className="tabela">
              <thead><tr><th>Nome</th><th>Tipo</th><th>Registro</th><th>Especialidade</th><th>Situação</th>{admin && <th />}</tr></thead>
              <tbody>
                {lista.map((p) => (
                  <tr key={p.id} className={p.ativo ? '' : 'inativo'}>
                    <td>{p.nome}</td>
                    <td>{p.tipo === TipoProfissional.MEDICO ? 'Médico' : 'Enfermeiro'}</td>
                    <td className="mono">{p.registro}</td>
                    <td>{p.especialidade}</td>
                    <td>{p.ativo ? <Selo cor="verde">Ativo</Selo> : <Selo cor="cinza">Inativo</Selo>}</td>
                    {admin && (
                      <td className="acoes-linha">
                        <button
                          className={`btn mini ${p.ativo ? 'perigo' : 'sec'}`}
                          onClick={async () => {
                            if (!p.ativo || (await confirmar('Inativar profissional', `Inativar ${p.nome}? Ele deixará de aparecer na agenda.`, 'Inativar')))
                              alternar.mutate({ id: p.id, ativo: !p.ativo });
                          }}
                        >
                          {p.ativo ? 'Inativar' : 'Reativar'}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Estado>
      {aberto && (
        <Modal titulo="Novo profissional" aoFechar={() => setAberto(false)}>
          <Formulario aoEnviar={() => criar.mutate()} enviando={criar.isPending} erro={criar.isError ? mensagemDe(criar.error) : null}>
            <Campo rotulo="Nome"><input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} required /></Campo>
            <div className="grade2">
              <Campo rotulo="Tipo">
                <select value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value as TipoProfissional })}>
                  <option value={TipoProfissional.MEDICO}>Médico</option>
                  <option value={TipoProfissional.ENFERMEIRO}>Enfermeiro</option>
                </select>
              </Campo>
              <Campo rotulo="Registro" dica={f.tipo === TipoProfissional.MEDICO ? 'Ex.: CRM-SP 123456' : 'Ex.: COREN-SP 123456'}>
                <input value={f.registro} onChange={(e) => setF({ ...f, registro: e.target.value })} required />
              </Campo>
            </div>
            <Campo rotulo="Especialidade"><input value={f.especialidade} onChange={(e) => setF({ ...f, especialidade: e.target.value })} required /></Campo>
          </Formulario>
        </Modal>
      )}
    </Pagina>
  );
}
