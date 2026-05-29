import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { CognitoService } from './services/cognito.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AuthController } from './auth.controller';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [AuthController],
  providers: [CognitoService, JwtStrategy],
  exports: [CognitoService, PassportModule],
})
export class AuthModule {}
