import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Convenio, Perfil, StatusLeito, TipoLeito, TipoProfissional } from '@sgh/shared';
import * as bcrypt from 'bcryptjs';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configurarApp } from '../src/configurar-app';
import { OutboxWorker } from '../src/shared/eventos/outbox.worker';
import { PrismaService } from '../src/shared/prisma/prisma.service';

export interface Contexto {
  app: INestApplication;
  prisma: PrismaService;
  http: () => ReturnType<typeof request>;
  tokens: Record<'admin' | 'recepcao' | 'medico' | 'enfermeiro' | 'leitos' | 'faturista', string>;
  medicoId: string;
  pacientes: string[];
  leitos: string[];
  processarEventos: () => Promise<number>;
}

const SENHA = 'senha-teste';

export async function subirApp(): Promise<Contexto> {
  const modulo = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = configurarApp(modulo.createNestApplication({ logger: false }), false);
  await app.init();
  const prisma = app.get(PrismaService);
  await limparBanco(prisma);

  const hash = await bcrypt.hash(SENHA, 4);
  const perfis = {
    admin: Perfil.ADMIN,
    recepcao: Perfil.RECEPCIONISTA,
    medico: Perfil.MEDICO,
    enfermeiro: Perfil.ENFERMEIRO,
    leitos: Perfil.GESTOR_LEITOS,
    faturista: Perfil.FATURISTA,
  } as const;
  for (const [apelido, perfil] of Object.entries(perfis)) {
    await prisma.usuario.create({ data: { nome: apelido, email: `${apelido}@teste.local`, senhaHash: hash, perfil } });
  }

  const medico = await prisma.profissional.create({
    data: { nome: 'Dr. Teste', tipo: TipoProfissional.MEDICO, registro: 'CRM-SP 999999', especialidade: 'Clínica' },
  });
  const pacientes = [];
  for (const [i, cpf] of ['52998224725', '11144477735', '39053344705'].entries()) {
    pacientes.push(
      (await prisma.paciente.create({
        data: { nome: `Paciente ${i + 1}`, cpf, nascimento: new Date('1980-01-01'), convenio: Convenio.PARTICULAR, email: `p${i}@teste.local` },
      })).id,
    );
  }
  const leitos = [];
  for (const codigo of ['T-01', 'T-02', 'T-03']) {
    leitos.push((await prisma.leito.create({ data: { codigo, ala: 'Teste', tipo: TipoLeito.ENFERMARIA, status: StatusLeito.LIVRE } })).id);
  }

  const http = () => request(app.getHttpServer());
  const tokens = {} as Contexto['tokens'];
  for (const apelido of Object.keys(perfis) as (keyof typeof perfis)[]) {
    const r = await http().post('/api/auth/login').send({ email: `${apelido}@teste.local`, senha: SENHA }).expect(200);
    tokens[apelido] = r.body.token;
  }

  const worker = app.get(OutboxWorker);
  return { app, prisma, http, tokens, medicoId: medico.id, pacientes, leitos, processarEventos: () => worker.processarPendentes() };
}

export async function limparBanco(prisma: PrismaService) {
  const tabelas = await prisma.$queryRaw<{ t: string }[]>`
    SELECT format('%I.%I', table_schema, table_name) AS t FROM information_schema.tables
    WHERE table_schema IN ('shared','identidade','pacientes','corpo_clinico','agendamento','atendimento','internacao','faturamento','notificacoes','relatorios')
      AND table_type = 'BASE TABLE'`;
  await prisma.$executeRawUnsafe(`TRUNCATE ${tabelas.map((x) => x.t).join(', ')} CASCADE`);
}

export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

/** Um horário futuro fixo, em ISO 8601 UTC. */
export const futuro = (dias: number, hora: number, minuto = 0) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + dias);
  d.setUTCHours(hora, minuto, 0, 0);
  return d.toISOString();
};
