import { Module, Global } from '@nestjs/common';
import {
  ConfigService,
  ConfigModule as NestConfigModule,
} from '@nestjs/config';
import * as config from './env';
import { TypeOrmModule } from '@nestjs/typeorm';

const NODE_ENV = process.env.NODE_ENV || 'development';
const paths: Record<string, string> = {
  local: '.env.local',
  seed: '.env.seed',
  development: '.env.development',
  test: '.env.test',
  production: '.env.production',
};
const envFilePath = paths[NODE_ENV] || paths.development;

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      envFilePath,
      isGlobal: true,
      load: [
        config.typeormConfig,
        config.cognitoConfig,
        config.apiConfig,
        config.rekognitionConfig,
      ],
    }),
    TypeOrmModule.forRootAsync({
      useFactory: (configService: ConfigService) => {
        return configService.get('typeorm')!;
      },
      inject: [ConfigService],
    }),
  ],
})
export class ConfigModule {}
