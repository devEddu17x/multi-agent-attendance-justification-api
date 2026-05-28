import {
  CognitoIdentityProvider,
  AdminConfirmSignUpCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { App } from 'supertest/types';

export const confirmUser = async (
  app: INestApplication<App>,
  email: string,
) => {
  const { region, userPoolId } = app.get(ConfigService).get('cognito');
  const cognitoClient = new CognitoIdentityProvider({ region });
  await cognitoClient.send(
    new AdminConfirmSignUpCommand({
      UserPoolId: userPoolId,
      Username: email,
    }),
  );
};
