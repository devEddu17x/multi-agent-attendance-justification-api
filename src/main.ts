import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { filterDocumentedEndpoints } from './utils/filter-documented-endpoints.util';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const apiConfig = app
    .get(ConfigService)
    .get<{ prefix: string; version: string; port: number }>('api')!;

  app.setGlobalPrefix(`${apiConfig.prefix}/v${apiConfig.version}`);
  const config = new DocumentBuilder()
    .setTitle('Multi Agent Attendance Justification API')
    .setDescription(
      'API documentation for the Multi Agent Attendance Justification application',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const documentFactory = () => {
    const document = SwaggerModule.createDocument(app, config);
    return filterDocumentedEndpoints(document);
  };

  SwaggerModule.setup('docs', app, documentFactory, {
    useGlobalPrefix: true,
  });
  await app.listen(apiConfig.port);
}
void bootstrap();
