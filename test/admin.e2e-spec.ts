import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { ConfigService } from '@nestjs/config';
import { getRandomCreateParentDTO } from './factories/parent-random.dto';
import { getRandomCreateTeacherDTO } from './factories/teacher-random.dto';
import { getAdminToken } from './helpers/admin-token.helper';
import { decodeJWT } from './helpers/decode-jwt.helper';

describe('Admin Controller (e2e)', () => {
  let app: INestApplication<App>;
  let adminToken: string;
  let baseUrl: string;
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
    baseUrl = `/${apiConfig.prefix}/v${apiConfig.version}`;
    await app.init();
    adminToken = await getAdminToken(app);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Admin Token Paylod', () => {
    it('should contain admin in the groups claim', () => {
      const payload = decodeJWT(adminToken);
      expect(payload['cognito:groups']).toContain('admin');
    });
  });

  describe('/administration/teacher (POST)', () => {
    it('should failed from a non-admin user', async () => {
      const dto = getRandomCreateTeacherDTO();
      await request(app.getHttpServer())
        .post(`${baseUrl}/administration/teacher`)
        .send(dto)
        .expect(401);
    });
  });

  describe('/administration/parent (POST)', () => {
    it('should failed from a non-admin user', async () => {
      const dto = getRandomCreateParentDTO();
      await request(app.getHttpServer())
        .post(`${baseUrl}/administration/parent`)
        .send(dto)
        .expect(401);
    });
  });

  describe('/administration/teacher (POST)', () => {
    it('should create a new teacher from an admin user', async () => {
      const dto = getRandomCreateTeacherDTO();
      await request(app.getHttpServer())
        .post(`${baseUrl}/administration/teacher`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(dto)
        .expect(201);
    });
  });

  describe('/administration/parent (POST)', () => {
    it('should create a new parent from an admin user', async () => {
      const dto = getRandomCreateParentDTO();
      await request(app.getHttpServer())
        .post(`${baseUrl}/administration/parent`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(dto)
        .expect(201);
    });
  });
});
