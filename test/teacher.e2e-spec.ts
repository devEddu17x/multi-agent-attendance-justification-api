import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { ConfigService } from '@nestjs/config';
import { getRandomCreateParentDTO } from './factories/parent-random.dto';
import { getTeacherToken } from './helpers/teacher-token.helper';
import { decodeJWT } from './helpers/decode-jwt.helper';

describe('Teacher Controller (e2e)', () => {
  let app: INestApplication<App>;
  let teacherToken: string;
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
    baseUrl = `${apiConfig.prefix}/v${apiConfig.version}`;
    await app.init();
    teacherToken = await getTeacherToken(app);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Teacher Token Paylod', () => {
    it('should contain teacher in the groups claim', () => {
      const payload = decodeJWT(teacherToken);
      expect(payload['cognito:groups']).toContain('teacher');
    });
  });

  describe('/administration/parent (POST)', () => {
    it('should failed from a non-teacher user', async () => {
      const dto = getRandomCreateParentDTO();
      await request(app.getHttpServer())
        .post(`/${baseUrl}/administration/teacher`)
        .send(dto)
        .expect(401);
    });
  });

  describe('/administration/parent (POST)', () => {
    it('should create a new parent from an teacher user', async () => {
      const dto = getRandomCreateParentDTO();
      await request(app.getHttpServer())
        .post(`/${baseUrl}/administration/parent`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(dto)
        .expect(201);
    });
  });
});
