/**
 * Seed de DESENVOLVIMENTO — somente dados fictícios.
 * Recria todos os dados: usuários (um por perfil), profissionais, pacientes, leitos e consultas.
 * Uso: npm run seed   (senha de todos os usuários: sgh@2026)
 */
import { Prisma, PrismaClient } from '@prisma/client';
import { Convenio, Cpf, Perfil, StatusConsulta, StatusLeito, TipoLeito, TipoProfissional } from '@sgh/shared';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';

const prisma = new PrismaClient();
const SENHA = 'sgh@2026';

async function limpar() {
  await prisma.$transaction([
    prisma.itemConta.deleteMany(),
    prisma.conta.deleteMany(),
    prisma.eventoProcessadoFaturamento.deleteMany(),
    prisma.notificacao.deleteMany(),
    prisma.projecaoConsultas.deleteMany(),
    prisma.projecaoProducao.deleteMany(),
    prisma.projecaoOcupacao.deleteMany(),
    prisma.registroClinico.deleteMany(),
    prisma.triagem.deleteMany(),
    prisma.atendimento.deleteMany(),
    prisma.internacao.deleteMany(),
    prisma.leito.deleteMany(),
    prisma.consulta.deleteMany(),
    prisma.profissional.deleteMany(),
    prisma.paciente.deleteMany(),
    prisma.usuario.deleteMany(),
    prisma.registroAuditoria.deleteMany(),
    prisma.outboxEvento.deleteMany(),
  ]);
}

async function main() {
  await limpar();
  const senhaHash = await bcrypt.hash(SENHA, 10);

  // ---------------------------------------------------------------- usuários
  const usuarios = [
    { nome: 'Ana Administradora', email: 'admin@sgh.local', perfil: Perfil.ADMIN },
    { nome: 'Rita Recepção', email: 'recepcao@sgh.local', perfil: Perfil.RECEPCIONISTA },
    { nome: 'Dr. Carlos Mendes', email: 'medico@sgh.local', perfil: Perfil.MEDICO },
    { nome: 'Dra. Helena Ribeiro', email: 'medica@sgh.local', perfil: Perfil.MEDICO },
    { nome: 'Enf. Paulo Lima', email: 'enfermeiro@sgh.local', perfil: Perfil.ENFERMEIRO },
    { nome: 'Gustavo Leitos', email: 'leitos@sgh.local', perfil: Perfil.GESTOR_LEITOS },
    { nome: 'Fernanda Faturamento', email: 'faturamento@sgh.local', perfil: Perfil.FATURISTA },
  ];
  const u: Record<string, string> = {};
  for (const x of usuarios) u[x.email] = (await prisma.usuario.create({ data: { ...x, senhaHash } })).id;

  // ---------------------------------------------------------------- corpo clínico
  const profissionais = [
    { nome: 'Dr. Carlos Mendes', tipo: TipoProfissional.MEDICO, registro: 'CRM-SP 123456', especialidade: 'Clínica médica', usuarioId: u['medico@sgh.local'] },
    { nome: 'Dra. Helena Ribeiro', tipo: TipoProfissional.MEDICO, registro: 'CRM-SP 234567', especialidade: 'Cardiologia', usuarioId: u['medica@sgh.local'] },
    { nome: 'Dr. Marcos Tavares', tipo: TipoProfissional.MEDICO, registro: 'CRM-MG 345678', especialidade: 'Pediatria', usuarioId: null },
    { nome: 'Enf. Paulo Lima', tipo: TipoProfissional.ENFERMEIRO, registro: 'COREN-SP 456789', especialidade: 'Enfermagem geral', usuarioId: u['enfermeiro@sgh.local'] },
    { nome: 'Enf. Juliana Costa', tipo: TipoProfissional.ENFERMEIRO, registro: 'COREN-SP 567890', especialidade: 'Terapia intensiva', usuarioId: null },
  ];
  const medicos: { id: string; nome: string }[] = [];
  for (const p of profissionais) {
    const r = await prisma.profissional.create({ data: p });
    if (p.tipo === TipoProfissional.MEDICO) medicos.push({ id: r.id, nome: r.nome });
  }

  // ---------------------------------------------------------------- pacientes (fictícios)
  const nomes = [
    'Maria Aparecida Souza', 'João Pedro Almeida', 'Beatriz Fernandes', 'Lucas Oliveira Santos', 'Camila Rodrigues',
    'Rafael Gomes Pereira', 'Juliana Martins', 'Pedro Henrique Costa', 'Larissa Barbosa', 'Gabriel Carvalho',
    'Fernanda Ribeiro Lima', 'Thiago Araújo', 'Patrícia Nogueira', 'Bruno Cardoso', 'Aline Moreira',
  ];
  const convenios = [Convenio.PARTICULAR, Convenio.UNIMED, Convenio.BRADESCO_SAUDE, Convenio.SUS];
  const pacientes: string[] = [];
  for (const [i, nome] of nomes.entries()) {
    const convenio = convenios[i % convenios.length];
    const r = await prisma.paciente.create({
      data: {
        nome,
        cpf: Cpf.gerarAPartirDaBase(String(100200300 + i * 7919)).valor,
        nascimento: new Date(Date.UTC(1950 + ((i * 3) % 60), i % 12, 1 + ((i * 5) % 27))),
        telefone: `(16) 9${String(81000000 + i * 1234).slice(0, 4)}-${String(1000 + i * 37).slice(0, 4)}`,
        email: `${nome.split(' ')[0].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')}.${i}@exemplo.test`,
        convenio,
        numeroCarteirinha: convenio === Convenio.UNIMED || convenio === Convenio.BRADESCO_SAUDE ? `CART-${10000 + i}` : null,
      },
    });
    pacientes.push(r.id);
  }

  // ---------------------------------------------------------------- leitos (20, 3 alas)
  const leitos = [
    ...Array.from({ length: 10 }, (_, i) => ({ codigo: `ENF-${101 + i}`, ala: 'Clínica Médica', tipo: TipoLeito.ENFERMARIA })),
    ...Array.from({ length: 5 }, (_, i) => ({ codigo: `APT-${201 + i}`, ala: 'Apartamentos', tipo: TipoLeito.APARTAMENTO })),
    ...Array.from({ length: 5 }, (_, i) => ({ codigo: `UTI-0${1 + i}`, ala: 'UTI Adulto', tipo: TipoLeito.UTI })),
  ];
  for (const l of leitos) await prisma.leito.create({ data: { ...l, status: StatusLeito.LIVRE } });
  await prisma.leito.update({ where: { codigo: 'ENF-110' }, data: { status: StatusLeito.MANUTENCAO } });

  // ---------------------------------------------------------------- consultas futuras (com evento no outbox)
  const amanha = new Date();
  amanha.setUTCDate(amanha.getUTCDate() + 1);
  for (let i = 0; i < 8; i++) {
    const medico = medicos[i % medicos.length];
    const inicio = new Date(Date.UTC(amanha.getUTCFullYear(), amanha.getUTCMonth(), amanha.getUTCDate(), 11 + Math.floor(i / medicos.length), (i % 2) * 30));
    const fim = new Date(inicio.getTime() + 30 * 60_000);
    const consulta = await prisma.consulta.create({
      data: { pacienteId: pacientes[i], profissionalId: medico.id, inicio, fim, status: StatusConsulta.AGENDADA, sala: `S${1 + (i % 3)}` },
    });
    const evento = {
      eventId: randomUUID(),
      tipo: 'ConsultaAgendada',
      ocorridoEm: new Date().toISOString(),
      payload: {
        consultaId: consulta.id,
        pacienteId: consulta.pacienteId,
        profissionalId: medico.id,
        profissionalNome: medico.nome,
        inicio: inicio.toISOString(),
        fim: fim.toISOString(),
        sala: consulta.sala,
      },
    };
    await prisma.outboxEvento.create({ data: { id: evento.eventId, tipo: evento.tipo, payload: evento as unknown as Prisma.InputJsonValue } });
  }

  console.log(`Seed concluído: ${usuarios.length} usuários, ${profissionais.length} profissionais, ${pacientes.length} pacientes, ${leitos.length} leitos, 8 consultas.`);
  console.log(`Senha de todos os usuários de teste: ${SENHA}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
