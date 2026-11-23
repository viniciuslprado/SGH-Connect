import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { FiltroErrosGlobal } from './shared/erros/filtro-erros';

/** Configuração comum à aplicação real e aos testes e2e. */
export function configurarApp(app: INestApplication, comSwagger = true): INestApplication {
  app.setGlobalPrefix('api');
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new FiltroErrosGlobal());

  if (comSwagger) {
    const config = new DocumentBuilder()
      .setTitle('SGH Connect API')
      .setDescription(
        'Sistema Integrado de Gestão Hospitalar — monólito modular. ' +
          'Datas em ISO 8601 UTC. Erros no formato { statusCode, erro, mensagem, detalhes? }. ' +
          'Projeto acadêmico: somente dados fictícios.',
      )
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));
  }
  return app;
}
