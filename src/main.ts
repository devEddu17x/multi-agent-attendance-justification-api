import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

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
    .get<{ prefix: string; version: string }>('api')!;

  app.setGlobalPrefix(`${apiConfig.prefix}/v${apiConfig.version}`);
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
