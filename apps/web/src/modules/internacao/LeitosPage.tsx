import { Perfil, ROTULO_STATUS_LEITO, StatusInternacao, StatusLeito, TipoLeito } from '@sgh/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../../shared/api';
import { useAuth } from '../../shared/auth';
import { Aviso, Campo, Estado, Formulario, Modal, Pagina, Selo, fmtDataHora, mensagemDe, useConfirmar } from '../../shared/ui';
import { pacientesApi } from '../pacientes/api';

interface LeitoMapa {
  id: string;
  codigo: string;
  ala: string;
  tipo: TipoLeito;
  status: StatusLeito;
  internacao: { id: string; pacienteNome: string; inicio: string } | null;
}

interface Internacao {
  id: string;
  pacienteNome: string;
  leitoCodigo: string;
  ala: string;
  motivo: string;
  status: StatusInternacao;
  inicio: string;
  alta: string | null;
  diarias: number;
}

const COR: Record<StatusLeito, string> = { LIVRE: 'verde', OCUPADO: 'vermelho', HIGIENIZACAO: 'amarelo', MANUTENCAO: 'cinza' };

export function LeitosPage() {
  const { tem } = useAuth();
  const gestor = tem(Perfil.ADMIN, Perfil.GESTOR_LEITOS);
  const qc = useQueryClient();
  const confirmar = useConfirmar();
  const [acao, setAcao] = useState<{ tipo: 'internar' | 'transferir'; leito: LeitoMapa } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const mapa = useQuery({ queryKey: ['leitos'], queryFn: () => api<LeitoMapa[]>('GET', '/leitos'), refetchInterval: 10_000 });
  const ativas = useQuery({ queryKey: ['internacoes', 'ATIVA'], queryFn: () => api<Internacao[]>('GET', '/internacoes?status=ATIVA') });

  const atualizar = () => Promise.all([qc.invalidateQueries({ queryKey: ['leitos'] }), qc.invalidateQueries({ queryKey: ['internacoes'] })]);
  const operar = useMutation({
    mutationFn: ({ metodo, caminho }: { metodo: 'PATCH'; caminho: string }) => api(metodo, caminho),
    onMutate: () => setErro(null),
    onSuccess: atualizar,
    onError: (e) => setErro(mensagemDe(e)),
  });

  const alas = (lista: LeitoMapa[]) => [...new Set(lista.map((l) => l.ala))];

  return (
    <Pagina titulo="Mapa de leitos" subtitulo="Internação, transferência e alta">
      <div className="legenda">
        {Object.values(StatusLeito).map((s) => <Selo key={s} cor={COR[s]}>{ROTULO_STATUS_LEITO[s]}</Selo>)}
      </div>
      <Aviso>{erro}</Aviso>
      <Estado consulta={mapa}>
        {(lista) => (
          <>
            {alas(lista).map((ala) => (
              <div key={ala} className="ala">
                <h3>{ala}</h3>
                <div className="leitos">
                  {lista.filter((l) => l.ala === ala).map((l) => (
                    <div key={l.id} className={`leito ${COR[l.status]}`}>
                      <div className="leito-topo"><strong>{l.codigo}</strong><small>{l.tipo}</small></div>
                      <div className="leito-status">{ROTULO_STATUS_LEITO[l.status]}</div>
                      {l.internacao && <div className="leito-paciente" title={`Desde ${fmtDataHora(l.internacao.inicio)}`}>{l.internacao.pacienteNome}</div>}
                      <div className="leito-acoes">
                        {gestor && l.status === StatusLeito.LIVRE && <button className="btn mini" onClick={() => setAcao({ tipo: 'internar', leito: l })}>Internar</button>}
                        {l.status === StatusLeito.OCUPADO && l.internacao && tem(Perfil.ADMIN, Perfil.GESTOR_LEITOS, Perfil.MEDICO) && (
                          <button
                            className="btn perigo mini"
                            onClick={async () => {
                              if (await confirmar('Registrar alta', `Dar alta a ${l.internacao!.pacienteNome}? A internação será encerrada e o leito ${l.codigo} irá para higienização.`, 'Registrar alta'))
                                operar.mutate({ metodo: 'PATCH', caminho: `/internacoes/${l.internacao!.id}/alta` });
                            }}
                          >
                            Alta
                          </button>
                        )}
                        {gestor && l.status === StatusLeito.OCUPADO && <button className="btn sec mini" onClick={() => setAcao({ tipo: 'transferir', leito: l })}>Transferir</button>}
                        {(l.status === StatusLeito.HIGIENIZACAO || l.status === StatusLeito.MANUTENCAO) && tem(Perfil.ADMIN, Perfil.GESTOR_LEITOS, Perfil.ENFERMEIRO) && (
                          <button className="btn sec mini" onClick={() => operar.mutate({ metodo: 'PATCH', caminho: `/leitos/${l.id}/liberar` })}>Liberar</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {acao?.tipo === 'internar' && <Internar leito={acao.leito} aoFechar={() => setAcao(null)} aoConcluir={atualizar} />}
            {acao?.tipo === 'transferir' && (
              <Transferir leito={acao.leito} livres={lista.filter((l) => l.status === StatusLeito.LIVRE)} aoFechar={() => setAcao(null)} aoConcluir={atualizar} />
            )}
          </>
        )}
      </Estado>

      <h2 className="secao">Internações ativas</h2>
      <Estado consulta={ativas}>
        {(lista) => (
          <div className="tabela-rolagem">
            <table className="tabela">
              <thead><tr><th>Paciente</th><th>Leito</th><th>Ala</th><th>Motivo</th><th>Desde</th><th>Diárias</th></tr></thead>
              <tbody>
                {lista.map((i) => (
                  <tr key={i.id}><td>{i.pacienteNome}</td><td className="mono">{i.leitoCodigo}</td><td>{i.ala}</td><td>{i.motivo}</td><td>{fmtDataHora(i.inicio)}</td><td>{i.diarias}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Estado>
    </Pagina>
  );
}

function Internar({ leito, aoFechar, aoConcluir }: { leito: LeitoMapa; aoFechar: () => void; aoConcluir: () => Promise<unknown> }) {
  const [busca, setBusca] = useState('');
  const pacientes = useQuery({ queryKey: ['pacientes', busca], queryFn: () => pacientesApi.pesquisar(busca) });
  const [f, setF] = useState({ pacienteId: '', motivo: '' });
  const internar = useMutation({
    mutationFn: () => api('POST', '/internacoes', { ...f, leitoId: leito.id }),
    onSuccess: async () => { await aoConcluir(); aoFechar(); },
  });
  return (
    <Modal titulo={`Internar no leito ${leito.codigo}`} aoFechar={aoFechar}>
      <Formulario aoEnviar={() => internar.mutate()} enviando={internar.isPending} erro={internar.isError ? mensagemDe(internar.error) : null} rotulo="Internar">
        <Campo rotulo="Paciente">
          <input placeholder="Filtrar por nome ou CPF…" value={busca} onChange={(e) => setBusca(e.target.value)} />
          <select value={f.pacienteId} onChange={(e) => setF({ ...f, pacienteId: e.target.value })} required>
            <option value="">Selecione…</option>
            {pacientes.data?.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
        </Campo>
        <Campo rotulo="Motivo (fictício)"><input value={f.motivo} onChange={(e) => setF({ ...f, motivo: e.target.value })} required /></Campo>
      </Formulario>
    </Modal>
  );
}

function Transferir({ leito, livres, aoFechar, aoConcluir }: { leito: LeitoMapa; livres: LeitoMapa[]; aoFechar: () => void; aoConcluir: () => Promise<unknown> }) {
  const [novoLeitoId, setNovo] = useState('');
  const transferir = useMutation({
    mutationFn: () => api('PATCH', `/internacoes/${leito.internacao!.id}/transferir`, { novoLeitoId }),
    onSuccess: async () => { await aoConcluir(); aoFechar(); },
  });
  return (
    <Modal titulo={`Transferir ${leito.internacao?.pacienteNome}`} aoFechar={aoFechar}>
      <Formulario aoEnviar={() => transferir.mutate()} enviando={transferir.isPending} erro={transferir.isError ? mensagemDe(transferir.error) : null} rotulo="Transferir">
        <Campo rotulo="Leito de destino" dica={livres.length ? undefined : 'Nenhum leito livre no momento.'}>
          <select value={novoLeitoId} onChange={(e) => setNovo(e.target.value)} required>
            <option value="">Selecione…</option>
            {livres.map((l) => <option key={l.id} value={l.id}>{l.codigo} — {l.ala} ({l.tipo})</option>)}
          </select>
        </Campo>
      </Formulario>
    </Modal>
  );
}
