import { Convenio, Cpf, Perfil } from '@sgh/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useAuth } from '../../shared/auth';
import { Campo, Estado, Formulario, Modal, Pagina, Selo, fmtData, mensagemDe, useConfirmar } from '../../shared/ui';
import { DadosPaciente, Paciente, pacientesApi } from './api';

const VAZIO: DadosPaciente = { nome: '', cpf: '', nascimento: '', telefone: '', email: '', convenio: Convenio.PARTICULAR, numeroCarteirinha: '' };

export function PacientesPage() {
  const { tem } = useAuth();
  const podeEditar = tem(Perfil.ADMIN, Perfil.RECEPCIONISTA);
  const qc = useQueryClient();
  const confirmar = useConfirmar();
  const [termo, setTermo] = useState('');
  const [editando, setEditando] = useState<Paciente | 'novo' | null>(null);
  const consulta = useQuery({ queryKey: ['pacientes', termo], queryFn: () => pacientesApi.pesquisar(termo) });

  const inativar = useMutation({
    mutationFn: (id: string) => pacientesApi.inativar(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pacientes'] }),
  });

  return (
    <Pagina
      titulo="Pacientes"
      subtitulo="Cadastro único do paciente"
      acoes={podeEditar && <button className="btn" onClick={() => setEditando('novo')}>Novo paciente</button>}
    >
      <input className="busca" placeholder="Buscar por nome ou CPF…" value={termo} onChange={(e) => setTermo(e.target.value)} aria-label="Buscar pacientes" />
      <Estado consulta={consulta}>
        {(lista) => (
          <div className="tabela-rolagem">
            <table className="tabela">
              <thead><tr><th>Nome</th><th>CPF</th><th>Nascimento</th><th>Convênio</th><th>Contato</th>{podeEditar && <th />}</tr></thead>
              <tbody>
                {lista.map((p) => (
                  <tr key={p.id}>
                    <td>{p.nome}</td>
                    <td className="mono">{p.cpf}</td>
                    <td>{fmtData(p.nascimento)}</td>
                    <td><Selo cor="azul">{p.convenio}</Selo></td>
                    <td>{p.email ?? p.telefone ?? '—'}</td>
                    {podeEditar && (
                      <td className="acoes-linha">
                        <button className="btn sec mini" onClick={() => setEditando(p)}>Editar</button>
                        <button
                          className="btn perigo mini"
                          disabled={inativar.isPending}
                          onClick={async () => {
                            if (await confirmar('Inativar paciente', `Inativar ${p.nome}? O histórico é preservado; o paciente deixa de aparecer nas buscas.`, 'Inativar'))
                              inativar.mutate(p.id);
                          }}
                        >
                          Inativar
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
      {editando && <FormPaciente paciente={editando === 'novo' ? null : editando} aoFechar={() => setEditando(null)} />}
    </Pagina>
  );
}

function FormPaciente({ paciente, aoFechar }: { paciente: Paciente | null; aoFechar: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState<DadosPaciente>(paciente ? { ...paciente, telefone: paciente.telefone ?? '', email: paciente.email ?? '', numeroCarteirinha: paciente.numeroCarteirinha ?? '' } : VAZIO);
  // Mesma validação de CPF da API (packages/shared) — conascência de algoritmo eliminada.
  const cpfInvalido = f.cpf.length > 0 && !Cpf.ehValido(f.cpf);
  const exigeCarteirinha = f.convenio !== Convenio.PARTICULAR && f.convenio !== Convenio.SUS;

  const salvar = useMutation({
    mutationFn: () => {
      const dados = { ...f, telefone: f.telefone || undefined, email: f.email || undefined, numeroCarteirinha: f.numeroCarteirinha || undefined } as DadosPaciente;
      return paciente ? pacientesApi.editar(paciente.id, dados) : pacientesApi.criar(dados);
    },
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['pacientes'] }); aoFechar(); },
  });
  const set = (k: keyof DadosPaciente) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  return (
    <Modal titulo={paciente ? 'Editar paciente' : 'Novo paciente'} aoFechar={aoFechar}>
      <Formulario aoEnviar={() => !cpfInvalido && salvar.mutate()} enviando={salvar.isPending} erro={salvar.isError ? mensagemDe(salvar.error) : null}>
        <Campo rotulo="Nome completo"><input value={f.nome} onChange={set('nome')} required minLength={3} /></Campo>
        <div className="grade2">
          <Campo rotulo="CPF" dica={cpfInvalido ? 'CPF inválido' : 'Somente dados fictícios'}>
            <input value={f.cpf} onChange={set('cpf')} required aria-invalid={cpfInvalido} className={cpfInvalido ? 'invalido' : ''} />
          </Campo>
          <Campo rotulo="Nascimento"><input type="date" value={f.nascimento} onChange={set('nascimento')} required /></Campo>
          <Campo rotulo="Telefone"><input value={f.telefone ?? ''} onChange={set('telefone')} /></Campo>
          <Campo rotulo="E-mail"><input type="email" value={f.email ?? ''} onChange={set('email')} /></Campo>
          <Campo rotulo="Convênio">
            <select value={f.convenio} onChange={set('convenio')}>{Object.values(Convenio).map((c) => <option key={c}>{c}</option>)}</select>
          </Campo>
          <Campo rotulo="Carteirinha" dica={exigeCarteirinha ? 'Obrigatória para este convênio' : undefined}>
            <input value={f.numeroCarteirinha ?? ''} onChange={set('numeroCarteirinha')} required={exigeCarteirinha} />
          </Campo>
        </div>
      </Formulario>
    </Modal>
  );
}
