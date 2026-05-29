import { Body, Controller, Post } from '@nestjs/common';
import { CognitoService } from './services/cognito.service';
import { LoginDTO } from './dto/login.dto';
import { ApiDocLogin } from './docs/auth.doc';

@Controller('auth')
export class AuthController {
  constructor(private readonly cognitoService: CognitoService) {}

  @Post('login')
  @ApiDocLogin()
  login(@Body() dto: LoginDTO) {
    return this.cognitoService.signIn(dto.email, dto.password);
  }
}
