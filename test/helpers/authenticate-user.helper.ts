import { CognitoIdentityProvider } from '@aws-sdk/client-cognito-identity-provider';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { App } from 'supertest/types';

export const authenticateUser = async (
  app: INestApplication<App>,
  email: string,
  password: string,
) => {
  const { region, clientId } = app.get(ConfigService).get('cognito');
  const cognitoClient = new CognitoIdentityProvider({ region });
  const response = await cognitoClient.initiateAuth({
    AuthFlow: 'USER_PASSWORD_AUTH',
    ClientId: clientId,
    AuthParameters: {
      USERNAME: email,
      PASSWORD: password,
    },
  });
  const idToken = response.AuthenticationResult?.IdToken;
  return idToken ?? '';
};
