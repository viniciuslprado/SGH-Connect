import { ClassificacaoRisco, Perfil, StatusAtendimento } from '@sgh/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, qs } from '../../shared/api';
import { useAuth } from '../../shared/auth';
import { Aviso, Campo, Estado, Formulario, Modal, Pagina, Selo, fmtDataHora, mensagemDe, useConfirmar } from '../../shared/ui';
import { corpoClinicoApi } from '../corpo-clinico/api';
import { pacientesApi } from '../pacientes/api';

interface Resumo {
  id: string;
  pacienteNome: string;
  profissionalNome: string;
  status: StatusAtendimento;
  classificacaoRisco: ClassificacaoRisco | null;
  inicio: string;
  fim: string | null;
}

interface Prontuario extends Resumo {
  triagem: { classificacaoRisco: ClassificacaoRisco; queixaPrincipal: string; pressaoArterial?: string; temperatura?: number; frequenciaCardiaca?: number; saturacao?: number; registradaEm: string } | null;
  registros: { id: string; anamnese?: string; cid?: string; conduta: string; prescricao?: string; criadoEm: string }[];
}

const COR_RISCO: Record<ClassificacaoRisco, string> = {
  VERMELHO: 'vermelho', LARANJA: 'laranja', AMARELO: 'amarelo', VERDE: 'verde', AZUL: 'azul',
};

export function AtendimentosPage() {
  const { tem } = useAuth();
  const clinico = tem(Perfil.MEDICO, Perfil.ENFERMEIRO);
  const [status, setStatus] = useState<StatusAtendimento | ''>(StatusAtendimento.ABERTO);
  const [abrir, setAbrir] = useState(false);
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const consulta = useQuery({
    queryKey: ['atendimentos', status],
    queryFn: () => api<Resumo[]>('GET', `/atendimentos${qs({ status: status || undefined })}`),
  });

  return (
    <Pagina
      titulo="Atendimentos"
      subtitulo={clinico ? 'Triagem, prontuário e finalização' : 'Visão resumida (sem conteúdo clínico)'}
      acoes={tem(Perfil.RECEPCIONISTA, Perfil.MEDICO, Perfil.ENFERMEIRO) && <button className="btn" onClick={() => setAbrir(true)}>Abrir atendimento</button>}
    >
      <div className="filtros">
        <Campo rotulo="Situação">
          <select value={status} onChange={(e) => setStatus(e.target.value as StatusAtendimento | '')}>
            <option value={StatusAtendimento.ABERTO}>Abertos</option>
            <option value={StatusAtendimento.FINALIZADO}>Finalizados</option>
            <option value="">Todos</option>
          </select>
        </Campo>
      </div>
      <Estado consulta={consulta}>
        {(lista) => (
          <div className="tabela-rolagem">
            <table className="tabela">
              <thead><tr><th>Início</th><th>Paciente</th><th>Profissional</th><th>Risco</th><th>Situação</th>{clinico && <th />}</tr></thead>
              <tbody>
                {lista.map((a) => (
                  <tr key={a.id}>
                    <td>{fmtDataHora(a.inicio)}</td>
                    <td>{a.pacienteNome}</td>
                    <td>{a.profissionalNome}</td>
                    <td>{a.classificacaoRisco ? <Selo cor={COR_RISCO[a.classificacaoRisco]}>{a.classificacaoRisco}</Selo> : '—'}</td>
                    <td>{a.status === StatusAtendimento.ABERTO ? <Selo cor="azul">Aberto</Selo> : <Selo cor="cinza">Finalizado</Selo>}</td>
                    {clinico && <td className="acoes-linha"><button className="btn sec mini" onClick={() => setSelecionado(a.id)}>Prontuário</button></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Estado>
      {abrir && <AbrirAtendimento aoFechar={() => setAbrir(false)} />}
      {selecionado && <ProntuarioModal id={selecionado} aoFechar={() => setSelecionado(null)} />}
    </Pagina>
  );
}

function AbrirAtendimento({ aoFechar }: { aoFechar: () => void }) {
  const qc = useQueryClient();
  const [busca, setBusca] = useState('');
  const pacientes = useQuery({ queryKey: ['pacientes', busca], queryFn: () => pacientesApi.pesquisar(busca) });
  const profissionais = useQuery({ queryKey: ['profissionais', 'ativos'], queryFn: () => corpoClinicoApi.listar() });
  const [f, setF] = useState({ pacienteId: '', profissionalId: '' });
  const abrir = useMutation({
    mutationFn: () => api('POST', '/atendimentos', f),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['atendimentos'] }); aoFechar(); },
  });
  return (
    <Modal titulo="Abrir atendimento" aoFechar={aoFechar}>
      <Formulario aoEnviar={() => abrir.mutate()} enviando={abrir.isPending} erro={abrir.isError ? mensagemDe(abrir.error) : null} rotulo="Abrir">
        <Campo rotulo="Paciente">
          <input placeholder="Filtrar por nome ou CPF…" value={busca} onChange={(e) => setBusca(e.target.value)} />
          <select value={f.pacienteId} onChange={(e) => setF({ ...f, pacienteId: e.target.value })} required>
            <option value="">Selecione…</option>
            {pacientes.data?.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
        </Campo>
        <Campo rotulo="Profissional responsável">
          <select value={f.profissionalId} onChange={(e) => setF({ ...f, profissionalId: e.target.value })} required>
            <option value="">Selecione…</option>
            {profissionais.data?.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
        </Campo>
      </Formulario>
    </Modal>
  );
}

function ProntuarioModal({ id, aoFechar }: { id: string; aoFechar: () => void }) {
  const { tem } = useAuth();
  const qc = useQueryClient();
  const confirmar = useConfirmar();
  const consulta = useQuery({ queryKey: ['prontuario', id], queryFn: () => api<Prontuario>('GET', `/atendimentos/${id}`) });
  const atualizar = () => Promise.all([qc.invalidateQueries({ queryKey: ['prontuario', id] }), qc.invalidateQueries({ queryKey: ['atendimentos'] })]);

  const [t, setT] = useState({ classificacaoRisco: ClassificacaoRisco.VERDE, queixaPrincipal: '', pressaoArterial: '', temperatura: '', saturacao: '' });
  const [r, setR] = useState({ anamnese: '', cid: '', conduta: '', prescricao: '' });

  const triagem = useMutation({
    mutationFn: () =>
      api('PATCH', `/atendimentos/${id}/triagem`, {
        classificacaoRisco: t.classificacaoRisco,
        queixaPrincipal: t.queixaPrincipal,
        pressaoArterial: t.pressaoArterial || undefined,
        temperatura: t.temperatura ? Number(t.temperatura) : undefined,
        saturacao: t.saturacao ? Number(t.saturacao) : undefined,
      }),
    onSuccess: atualizar,
  });
  const registro = useMutation({
    mutationFn: () => api('PATCH', `/atendimentos/${id}/registro-clinico`, { conduta: r.conduta, anamnese: r.anamnese || undefined, cid: r.cid || undefined, prescricao: r.prescricao || undefined }),
    onSuccess: () => { setR({ anamnese: '', cid: '', conduta: '', prescricao: '' }); return atualizar(); },
  });
  const finalizar = useMutation({ mutationFn: () => api('PATCH', `/atendimentos/${id}/finalizar`), onSuccess: atualizar });

  return (
    <Modal titulo="Prontuário" aoFechar={aoFechar}>
      <Estado consulta={consulta}>
        {(p) => {
          const aberto = p.status === StatusAtendimento.ABERTO;
          return (
            <div className="prontuario">
              <p className="sub">
                <strong>{p.pacienteNome}</strong> · {p.profissionalNome} · início {fmtDataHora(p.inicio)}{' '}
                {aberto ? <Selo cor="azul">Aberto</Selo> : <Selo cor="cinza">Finalizado em {fmtDataHora(p.fim)}</Selo>}
              </p>
              <p className="nota">Leitura registrada na auditoria. Use apenas dados fictícios.</p>

              <h3>Triagem</h3>
              {p.triagem ? (
                <p>
                  <Selo cor={COR_RISCO[p.triagem.classificacaoRisco]}>{p.triagem.classificacaoRisco}</Selo> {p.triagem.queixaPrincipal}
                  {p.triagem.pressaoArterial && ` · PA ${p.triagem.pressaoArterial}`}
                  {p.triagem.temperatura != null && ` · ${p.triagem.temperatura} °C`}
                  {p.triagem.saturacao != null && ` · SpO₂ ${p.triagem.saturacao}%`}
                </p>
              ) : aberto ? (
                <Formulario aoEnviar={() => triagem.mutate()} enviando={triagem.isPending} erro={triagem.isError ? mensagemDe(triagem.error) : null} rotulo="Registrar triagem">
                  <div className="grade2">
                    <Campo rotulo="Risco">
                      <select value={t.classificacaoRisco} onChange={(e) => setT({ ...t, classificacaoRisco: e.target.value as ClassificacaoRisco })}>
                        {Object.values(ClassificacaoRisco).map((c) => <option key={c}>{c}</option>)}
                      </select>
                    </Campo>
                    <Campo rotulo="Queixa principal"><input value={t.queixaPrincipal} onChange={(e) => setT({ ...t, queixaPrincipal: e.target.value })} required /></Campo>
                    <Campo rotulo="Pressão arterial"><input placeholder="120x80" value={t.pressaoArterial} onChange={(e) => setT({ ...t, pressaoArterial: e.target.value })} /></Campo>
                    <Campo rotulo="Temperatura (°C)"><input type="number" step="0.1" value={t.temperatura} onChange={(e) => setT({ ...t, temperatura: e.target.value })} /></Campo>
                    <Campo rotulo="Saturação (%)"><input type="number" value={t.saturacao} onChange={(e) => setT({ ...t, saturacao: e.target.value })} /></Campo>
                  </div>
                </Formulario>
              ) : (
                <p className="sub">Sem triagem.</p>
              )}

              <h3>Registros clínicos</h3>
              {p.registros.length === 0 && <p className="sub">Nenhum registro ainda.</p>}
              <ol className="registros">
                {p.registros.map((x) => (
                  <li key={x.id}>
                    <small>{fmtDataHora(x.criadoEm)}{x.cid && ` · CID ${x.cid}`}</small>
                    {x.anamnese && <p><em>Anamnese:</em> {x.anamnese}</p>}
                    <p><em>Conduta:</em> {x.conduta}</p>
                    {x.prescricao && <p><em>Prescrição:</em> {x.prescricao}</p>}
                  </li>
                ))}
              </ol>

              {aberto ? (
                <>
                  <Formulario aoEnviar={() => registro.mutate()} enviando={registro.isPending} erro={registro.isError ? mensagemDe(registro.error) : null} rotulo="Incluir registro">
                    <Campo rotulo="Anamnese"><textarea rows={2} value={r.anamnese} onChange={(e) => setR({ ...r, anamnese: e.target.value })} /></Campo>
                    <div className="grade2">
                      <Campo rotulo="CID" dica="Ex.: I10"><input value={r.cid} onChange={(e) => setR({ ...r, cid: e.target.value })} /></Campo>
                      <Campo rotulo="Prescrição"><input value={r.prescricao} onChange={(e) => setR({ ...r, prescricao: e.target.value })} /></Campo>
                    </div>
                    <Campo rotulo="Conduta"><textarea rows={2} value={r.conduta} onChange={(e) => setR({ ...r, conduta: e.target.value })} required /></Campo>
                  </Formulario>
                  {tem(Perfil.MEDICO) && (
                    <div className="form-acoes">
                      <Aviso>{finalizar.isError ? mensagemDe(finalizar.error) : null}</Aviso>
                      <button
                        className="btn perigo"
                        disabled={finalizar.isPending}
                        onClick={async () => {
                          if (await confirmar('Finalizar atendimento', 'Depois de finalizado, o atendimento não aceita novos registros. A conta do paciente será gerada automaticamente.', 'Finalizar'))
                            finalizar.mutate();
                        }}
                      >
                        Finalizar atendimento
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <p className="nota">Atendimento finalizado: novos registros clínicos são bloqueados pelo domínio (HTTP 422).</p>
              )}
            </div>
          );
        }}
      </Estado>
    </Modal>
  );
}
