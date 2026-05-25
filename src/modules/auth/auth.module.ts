import { Module } from '@nestjs/common';
import { CognitoService } from './services/cognito.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  providers: [CognitoService, JwtStrategy],
  exports: [CognitoService],
})
export class AuthModule {}
