import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { CognitoService } from './services/cognito.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  providers: [CognitoService, JwtStrategy],
  exports: [CognitoService, PassportModule],
})
export class AuthModule {}
