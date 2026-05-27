import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AdministrationService } from 'src/modules/admin/admin.service';
import { App } from 'supertest/types';
import { authenticateUser } from './authenticate-user.helper';
import { getRandomCreateTeacherDTO } from './../factories/teacher-random.dto';
import {
  CognitoIdentityProvider,
  AdminConfirmSignUpCommand,
} from '@aws-sdk/client-cognito-identity-provider';

export const getTeacherToken = async (app: INestApplication<App>) => {
  const dto = getRandomCreateTeacherDTO();
  const administrationService = app.get(AdministrationService);
  await administrationService.createTeacher(dto);

  const { region, userPoolId } = app.get(ConfigService).get('cognito');
  const cognitoClient = new CognitoIdentityProvider({ region });
  await cognitoClient.send(
    new AdminConfirmSignUpCommand({
      UserPoolId: userPoolId,
      Username: dto.user.email,
    }),
  );

  const idToken = await authenticateUser(app, dto.user.email, dto.password);
  return idToken;
};
