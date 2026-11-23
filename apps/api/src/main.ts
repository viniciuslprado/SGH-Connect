import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configurarApp } from './configurar-app';

async function bootstrap() {
  const app = configurarApp(await NestFactory.create(AppModule));
  const porta = Number(process.env.PORT ?? 3333);
  await app.listen(porta);
  Logger.log(`API em http://localhost:${porta}/api  •  Swagger em http://localhost:${porta}/api/docs`, 'SGH Connect');
}

void bootstrap();
