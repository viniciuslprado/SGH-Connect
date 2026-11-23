import { Perfil, StatusConsulta, TipoProfissional } from '@sgh/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, qs } from '../../shared/api';
import { useAuth } from '../../shared/auth';
import { Campo, Estado, Formulario, Modal, Pagina, Selo, fmtHora, hojeIso, mensagemDe, useConfirmar } from '../../shared/ui';
import { corpoClinicoApi } from '../corpo-clinico/api';
import { pacientesApi } from '../pacientes/api';

interface Consulta {
  id: string;
  pacienteNome: string;
  profissionalNome: string;
  inicio: string;
  fim: string;
  status: StatusConsulta;
  sala: string | null;
}

export function AgendaPage() {
  const { tem } = useAuth();
  const podeAgendar = tem(Perfil.ADMIN, Perfil.RECEPCIONISTA);
  const qc = useQueryClient();
  const confirmar = useConfirmar();
  const [data, setData] = useState(hojeIso());
  const [profissionalId, setProfissionalId] = useState('');
  const [novo, setNovo] = useState(false);

  const medicos = useQuery({ queryKey: ['profissionais', 'MEDICO'], queryFn: () => corpoClinicoApi.listar(TipoProfissional.MEDICO) });
  const consultas = useQuery({
    queryKey: ['consultas', data, profissionalId],
    queryFn: () => api<Consulta[]>('GET', `/consultas${qs({ data, profissionalId: profissionalId || undefined })}`),
  });
  const cancelar = useMutation({
    mutationFn: (id: string) => api('PATCH', `/consultas/${id}/cancelar`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['consultas'] }),
  });

  return (
    <Pagina titulo="Agenda" subtitulo="Consultas por dia e profissional" acoes={podeAgendar && <button className="btn" onClick={() => setNovo(true)}>Agendar consulta</button>}>
      <div className="filtros">
        <Campo rotulo="Dia"><input type="date" value={data} onChange={(e) => setData(e.target.value)} /></Campo>
        <Campo rotulo="Profissional">
          <select value={profissionalId} onChange={(e) => setProfissionalId(e.target.value)}>
            <option value="">Todos</option>
            {medicos.data?.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
          </select>
        </Campo>
      </div>
      <Estado consulta={consultas}>
        {(lista) => (
          <ul className="agenda">
            {lista.map((c) => (
              <li key={c.id} className={c.status === StatusConsulta.CANCELADA ? 'cancelada' : ''}>
                <div className="hora">{fmtHora(c.inicio)}<small>{fmtHora(c.fim)}</small></div>
                <div className="info">
                  <strong>{c.pacienteNome}</strong>
                  <span>{c.profissionalNome}{c.sala ? ` · sala ${c.sala}` : ''}</span>
                </div>
                <Selo cor={c.status === StatusConsulta.AGENDADA ? 'verde' : 'cinza'}>{c.status === StatusConsulta.AGENDADA ? 'Agendada' : 'Cancelada'}</Selo>
                {podeAgendar && c.status === StatusConsulta.AGENDADA && (
                  <button
                    className="btn perigo mini"
                    onClick={async () => {
                      if (await confirmar('Cancelar consulta', `Cancelar a consulta de ${c.pacienteNome} às ${fmtHora(c.inicio)}? O paciente será notificado.`, 'Cancelar consulta'))
                        cancelar.mutate(c.id);
                    }}
                  >
                    Cancelar
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Estado>
      {novo && <NovaConsulta dataInicial={data} aoFechar={() => setNovo(false)} />}
    </Pagina>
  );
}

function NovaConsulta({ dataInicial, aoFechar }: { dataInicial: string; aoFechar: () => void }) {
  const qc = useQueryClient();
  const [busca, setBusca] = useState('');
  const pacientes = useQuery({ queryKey: ['pacientes', busca], queryFn: () => pacientesApi.pesquisar(busca) });
  const medicos = useQuery({ queryKey: ['profissionais', 'MEDICO'], queryFn: () => corpoClinicoApi.listar(TipoProfissional.MEDICO) });
  const [f, setF] = useState({ pacienteId: '', profissionalId: '', data: dataInicial, hora: '14:00', duracaoMin: 30, sala: '' });

  const agendar = useMutation({
    // Data/hora local de Brasília convertida para ISO 8601 com fuso explícito.
    mutationFn: () =>
      api('POST', '/consultas', {
        pacienteId: f.pacienteId,
        profissionalId: f.profissionalId,
        inicio: `${f.data}T${f.hora}:00-03:00`,
        duracaoMin: Number(f.duracaoMin),
        sala: f.sala || undefined,
      }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['consultas'] }); aoFechar(); },
  });

  return (
    <Modal titulo="Agendar consulta" aoFechar={aoFechar}>
      <Formulario aoEnviar={() => agendar.mutate()} enviando={agendar.isPending} erro={agendar.isError ? mensagemDe(agendar.error) : null} rotulo="Agendar">
        <Campo rotulo="Paciente">
          <input placeholder="Filtrar por nome ou CPF…" value={busca} onChange={(e) => setBusca(e.target.value)} />
          <select value={f.pacienteId} onChange={(e) => setF({ ...f, pacienteId: e.target.value })} required>
            <option value="">Selecione…</option>
            {pacientes.data?.map((p) => <option key={p.id} value={p.id}>{p.nome} — {p.cpf}</option>)}
          </select>
        </Campo>
        <Campo rotulo="Médico">
          <select value={f.profissionalId} onChange={(e) => setF({ ...f, profissionalId: e.target.value })} required>
            <option value="">Selecione…</option>
            {medicos.data?.map((m) => <option key={m.id} value={m.id}>{m.nome} — {m.especialidade}</option>)}
          </select>
        </Campo>
        <div className="grade2">
          <Campo rotulo="Dia"><input type="date" value={f.data} onChange={(e) => setF({ ...f, data: e.target.value })} required /></Campo>
          <Campo rotulo="Hora"><input type="time" value={f.hora} onChange={(e) => setF({ ...f, hora: e.target.value })} required /></Campo>
          <Campo rotulo="Duração (min)"><input type="number" min={10} max={240} step={5} value={f.duracaoMin} onChange={(e) => setF({ ...f, duracaoMin: Number(e.target.value) })} /></Campo>
          <Campo rotulo="Sala"><input value={f.sala} onChange={(e) => setF({ ...f, sala: e.target.value })} /></Campo>
        </div>
      </Formulario>
    </Modal>
  );
}
