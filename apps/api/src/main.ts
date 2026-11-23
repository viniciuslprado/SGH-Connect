import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configurarApp } from './configurar-app';

function carregarEnv() {
  try {
    process.loadEnvFile('.env'); // Node 20.12+: lê apps/api/.env (não sobrescreve variáveis já definidas)
  } catch {
    /* sem .env: usa variáveis do ambiente e os padrões de desenvolvimento */
  }
}

async function bootstrap() {
  carregarEnv();
  const app = configurarApp(await NestFactory.create(AppModule));
  const porta = Number(process.env.API_PORT ?? 3333);
  await app.listen(porta);
  Logger.log(`API em http://localhost:${porta}/api  •  Swagger em http://localhost:${porta}/api/docs`, 'SGH Connect');
}

void bootstrap();
