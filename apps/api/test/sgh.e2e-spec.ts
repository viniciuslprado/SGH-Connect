import { EventEmitter2 } from '@nestjs/event-emitter';
import { StatusInternacao, StatusLeito } from '@sgh/shared';
import { OUTBOX, Outbox } from '../src/shared/eventos/outbox';
import { Contexto, bearer, futuro, subirApp } from './apoio';

let c: Contexto;

beforeAll(async () => {
  c = await subirApp();
});

afterAll(async () => {
  await c?.app.close();
});

/* ======================================================================= segurança e validação */
describe('Segurança (RBAC) e validação de entrada', () => {
  it('sem token → 401 com mensagem clara', async () => {
    const r = await c.http().get('/api/pacientes').expect(401);
    expect(r.body).toEqual({ statusCode: 401, erro: 'Não autenticado', mensagem: 'Faça login para acessar este recurso.' });
  });

  it('login com senha errada → 401 com mensagem específica', async () => {
    const r = await c.http().post('/api/auth/login').send({ email: 'admin@teste.local', senha: 'errada' }).expect(401);
    expect(r.body.mensagem).toBe('E-mail ou senha inválidos.');
  });

  it('token inválido → 401', async () => {
    await c.http().get('/api/pacientes').set(bearer('token.falso.qualquer')).expect(401);
  });

  it('perfil sem permissão → 403 (recepcionista tentando ler prontuário)', async () => {
    const r = await c.http().get('/api/atendimentos/00000000-0000-4000-8000-000000000000').set(bearer(c.tokens.recepcao)).expect(403);
    expect(r.body.mensagem).toBe('Seu perfil não tem permissão para esta ação.');
  });

  it('perfil sem permissão → 403 (médico tentando fechar conta)', async () => {
    await c.http().patch('/api/contas/00000000-0000-4000-8000-000000000000/fechar').set(bearer(c.tokens.medico)).expect(403);
  });

  it('CPF inválido → 400 com mensagem do value object compartilhado', async () => {
    const r = await c
      .http()
      .post('/api/pacientes')
      .set(bearer(c.tokens.recepcao))
      .send({ nome: 'Fulano de Tal', cpf: '123.456.789-00', nascimento: '1990-05-10', convenio: 'PARTICULAR' })
      .expect(400);
    expect(r.body.mensagem).toBe('CPF inválido: 123.456.789-00');
  });

  it('data fora do ISO 8601 e campo desconhecido → 400 com lista de detalhes', async () => {
    const r = await c
      .http()
      .post('/api/pacientes')
      .set(bearer(c.tokens.recepcao))
      .send({ nome: 'Fulano de Tal', cpf: '529.982.247-25', nascimento: '10/05/1990', convenio: 'PARTICULAR', campoInvalido: 1 })
      .expect(400);
    expect(r.body.mensagem).toBe('Dados de entrada inválidos.');
    expect(r.body.detalhes).toEqual(
      expect.arrayContaining(['Data de nascimento deve estar no formato AAAA-MM-DD.', 'property campoInvalido should not exist']),
    );
  });

  it('CPF duplicado → 409', async () => {
    await c
      .http()
      .post('/api/pacientes')
      .set(bearer(c.tokens.recepcao))
      .send({ nome: 'Duplicado', cpf: '529.982.247-25', nascimento: '1990-05-10', convenio: 'PARTICULAR' })
      .expect(409);
  });
});

/* ======================================================================= agendamento */
describe('Agendamento — conflito de horário', () => {
  const agendar = (inicio: string, pacienteIdx = 0) =>
    c.http().post('/api/consultas').set(bearer(c.tokens.recepcao)).send({ pacienteId: c.pacientes[pacienteIdx], profissionalId: c.medicoId, inicio, duracaoMin: 30 });

  it('agendamento conflitante para o mesmo profissional → 409', async () => {
    await agendar(futuro(2, 13, 0)).expect(201);
    const r = await agendar(futuro(2, 13, 15), 1).expect(409);
    expect(r.body.mensagem).toBe('O profissional já possui consulta neste horário.');
  });

  it('dois agendamentos SIMULTÂNEOS no mesmo horário: um 201 e um 409', async () => {
    const horario = futuro(3, 15, 0);
    const [a, b] = await Promise.all([agendar(horario, 1), agendar(horario, 2)]);
    expect([a.status, b.status].sort()).toEqual([201, 409]);
  });

  it('publica ConsultaAgendada pelo outbox, gerando notificação e projeção', async () => {
    await c.processarEventos();
    expect(await c.prisma.notificacao.count()).toBeGreaterThanOrEqual(2);
    expect(await c.prisma.projecaoConsultas.count()).toBeGreaterThanOrEqual(2);
  });
});

/* ======================================================================= atendimento */
describe('Atendimento — conascência de execução', () => {
  let atendimentoId: string;
  const CONDUTA = 'Texto clínico fictício que NÃO pode ir para a auditoria';

  it('médico registra evolução em atendimento aberto e finaliza', async () => {
    const r = await c.http().post('/api/atendimentos').set(bearer(c.tokens.medico)).send({ pacienteId: c.pacientes[0], profissionalId: c.medicoId }).expect(201);
    atendimentoId = r.body.id;
    await c.http().patch(`/api/atendimentos/${atendimentoId}/registro-clinico`).set(bearer(c.tokens.medico)).send({ conduta: CONDUTA, cid: 'I10' }).expect(200);
    await c.http().patch(`/api/atendimentos/${atendimentoId}/finalizar`).set(bearer(c.tokens.medico)).expect(200);
  });

  it('atendimento FINALIZADO não recebe evolução → 422', async () => {
    const r = await c.http().patch(`/api/atendimentos/${atendimentoId}/registro-clinico`).set(bearer(c.tokens.medico)).send({ conduta: 'Outra' }).expect(422);
    expect(r.body.mensagem).toBe('Atendimento finalizado não permite novos registros clínicos.');
  });

  it('enfermeiro não pode finalizar atendimento → 403', async () => {
    await c.http().patch(`/api/atendimentos/${atendimentoId}/finalizar`).set(bearer(c.tokens.enfermeiro)).expect(403);
  });

  it('auditoria registra as ações SEM o texto clínico', async () => {
    await c.http().get(`/api/atendimentos/${atendimentoId}`).set(bearer(c.tokens.medico)).expect(200);
    const registros = await c.prisma.registroAuditoria.findMany({ where: { entidadeId: atendimentoId } });
    expect(registros.map((r) => r.acao)).toEqual(
      expect.arrayContaining(['ATENDIMENTO_ABERTO', 'REGISTRO_CLINICO_INCLUIDO', 'ATENDIMENTO_FINALIZADO', 'PRONTUARIO_LIDO']),
    );
    expect(JSON.stringify(registros)).not.toContain(CONDUTA);
    expect(registros.every((r) => r.atorEmail === 'medico@teste.local')).toBe(true);
  });

  it('Faturamento reage ao evento e é IDEMPOTENTE (reentrega não duplica itens)', async () => {
    await c.processarEventos();
    const evento = await c.prisma.outboxEvento.findFirstOrThrow({ where: { tipo: 'AtendimentoFinalizado' } });
    const itens = () => c.prisma.itemConta.count({ where: { origemEventoId: evento.id } });
    expect(await itens()).toBe(1);

    // Simula reentrega do MESMO evento (ex.: worker caiu após entregar e antes de marcar como processado).
    await c.app.get(EventEmitter2).emitAsync('AtendimentoFinalizado', evento.payload);
    expect(await itens()).toBe(1);
    expect(await c.prisma.notificacao.count({ where: { eventId: evento.id } })).toBe(1);
  });
});

/* ======================================================================= internação */
describe('Internação — conascência temporal', () => {
  const internar = (pacienteIdx: number, leitoIdx: number) =>
    c.http().post('/api/internacoes').set(bearer(c.tokens.leitos)).send({ pacienteId: c.pacientes[pacienteIdx], leitoId: c.leitos[leitoIdx], motivo: 'Observação (fictício)' });

  it('duas internações CONCORRENTES no mesmo leito: uma 201 e uma 409', async () => {
    const [a, b] = await Promise.all([internar(0, 0), internar(1, 0)]);
    expect([a.status, b.status].sort()).toEqual([201, 409]);
    expect(await c.prisma.internacao.count({ where: { leitoId: c.leitos[0], status: StatusInternacao.ATIVA } })).toBe(1);
  });

  it('leito ocupado → 409 com mensagem do domínio', async () => {
    const r = await internar(2, 0).expect(409);
    expect(r.body.mensagem).toMatch(/Leito T-01 indisponível/);
  });

  it('alta é ATÔMICA: se um passo falhar, internação e leito não mudam', async () => {
    const ativa = await c.prisma.internacao.findFirstOrThrow({ where: { leitoId: c.leitos[0], status: StatusInternacao.ATIVA } });
    const outbox = c.app.get<Outbox>(OUTBOX);
    const espiao = jest.spyOn(outbox, 'adicionar').mockRejectedValueOnce(new Error('falha simulada no meio da transação'));

    await c.http().patch(`/api/internacoes/${ativa.id}/alta`).set(bearer(c.tokens.leitos)).expect(500);
    espiao.mockRestore();

    expect((await c.prisma.internacao.findUniqueOrThrow({ where: { id: ativa.id } })).status).toBe(StatusInternacao.ATIVA);
    expect((await c.prisma.leito.findUniqueOrThrow({ where: { id: c.leitos[0] } })).status).toBe(StatusLeito.OCUPADO);
  });

  it('alta encerra a internação e libera o leito para higienização na mesma transação', async () => {
    const ativa = await c.prisma.internacao.findFirstOrThrow({ where: { leitoId: c.leitos[0], status: StatusInternacao.ATIVA } });
    const r = await c.http().patch(`/api/internacoes/${ativa.id}/alta`).set(bearer(c.tokens.leitos)).expect(200);
    expect(r.body.status).toBe(StatusInternacao.ENCERRADA);
    expect((await c.prisma.leito.findUniqueOrThrow({ where: { id: c.leitos[0] } })).status).toBe(StatusLeito.HIGIENIZACAO);
    expect(await c.prisma.outboxEvento.count({ where: { tipo: 'AltaRegistrada' } })).toBe(1);
  });

  it('AltaRegistrada gera diária na conta e atualiza a projeção de ocupação', async () => {
    await c.processarEventos();
    expect(await c.prisma.itemConta.count({ where: { codigo: 'DIARIA_ENFERMARIA' } })).toBe(1);
    const projecao = await c.prisma.projecaoOcupacao.findFirstOrThrow({ where: { leitoCodigo: 'T-01' } });
    expect(projecao.alta).not.toBeNull();
  });
});
