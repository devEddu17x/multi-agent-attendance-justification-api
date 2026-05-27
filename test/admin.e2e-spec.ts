import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { ConfigService } from '@nestjs/config';
import { CreateTeacherDTO } from 'src/common/dtos/create-teacher.dto';
import { CognitoIdentityProvider } from '@aws-sdk/client-cognito-identity-provider';
import { ROLES } from 'src/common/enums/roles.enum';
import { CreateParentDTO } from 'src/common/dtos/create-parent.dto';

describe('Admin Controller (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    const apiConfig = app.get(ConfigService).get('api');
    app.setGlobalPrefix(`${apiConfig.prefix}/v${apiConfig.version}`);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/administration/teacher (POST)', () => {
    it('should failed from a non-admin user', async () => {
      const dto: CreateTeacherDTO = {
        user: {
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
        },
        documentNumber: '87654321',
        phone: '987654321',
        password: '@StrongP455w0rd',
      };

      await request(app.getHttpServer())
        .post('/api/v1/administration/teacher')
        .send(dto)
        .expect(401);
    });
  });

  describe('/administration/parent (POST)', () => {
    it('should failed from a non-admin user', async () => {
      const dto: CreateParentDTO = {
        user: {
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
        },
        documentNumber: '87654321',
        phone: '987654321',
        password: '@StrongP455w0rd',
      };

      await request(app.getHttpServer())
        .post('/api/v1/administration/parent')
        .send(dto)
        .expect(401);
    });
  });

  describe('/administration/teacher (POST)', () => {
    it('should create a new teacher from an admin user', async () => {
      const { region, clientId } = app.get(ConfigService).get('cognito');
      const cognitoClient = new CognitoIdentityProvider({ region });
      const response = await cognitoClient.initiateAuth({
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: clientId,
        AuthParameters: {
          USERNAME: process.env.BASE_ADMIN_EMAIL!,
          PASSWORD: process.env.BASE_ADMIN_PASSWORD!,
        },
      });

      const adminToken = response.AuthenticationResult?.IdToken;

      const payload = JSON.parse(
        Buffer.from(
          adminToken!.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'),
          'base64',
        ).toString('utf8'),
      );
      const groups: string[] = payload['cognito:groups'] || [];

      expect(groups).toContain(ROLES.ADMIN);
      const dto: CreateTeacherDTO = {
        user: {
          email: 'teacher@example.com',
          firstName: 'Teacher',
          lastName: 'User',
        },
        documentNumber: '87654321',
        phone: '987654321',
        password: '@StrongP455w0rd',
      };

      await request(app.getHttpServer())
        .post('/api/v1/administration/teacher')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(dto)
        .expect(201);
    });
  });

  describe('/administration/parent (POST)', () => {
    it('should create a new parent from an admin user', async () => {
      const { region, clientId } = app.get(ConfigService).get('cognito');
      const cognitoClient = new CognitoIdentityProvider({ region });
      const response = await cognitoClient.initiateAuth({
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: clientId,
        AuthParameters: {
          USERNAME: process.env.BASE_ADMIN_EMAIL!,
          PASSWORD: process.env.BASE_ADMIN_PASSWORD!,
        },
      });

      const adminToken = response.AuthenticationResult?.IdToken;

      const payload = JSON.parse(
        Buffer.from(
          adminToken!.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'),
          'base64',
        ).toString('utf8'),
      );
      const groups: string[] = payload['cognito:groups'] || [];

      expect(groups).toContain(ROLES.ADMIN);
      const dto: CreateParentDTO = {
        user: {
          email: 'parent@example.com',
          firstName: 'Parent',
          lastName: 'User',
        },
        documentNumber: '87654320',
        phone: '987654321',
        password: '@StrongP455w0rd',
      };

      await request(app.getHttpServer())
        .post('/api/v1/administration/parent')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(dto)
        .expect(201);
    });
  });
});
