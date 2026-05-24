import { Module, Global } from '@nestjs/common';
import {
  ConfigService,
  ConfigModule as NestConfigModule,
} from '@nestjs/config';
import * as config from './env';
import { TypeOrmModule } from '@nestjs/typeorm';
@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      envFilePath: [
        '.env.local',
        '.env.development.local',
        '.env.production.local',
      ],
      isGlobal: true,
      load: [config.typeormConfig, config.cognitoConfig],
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
