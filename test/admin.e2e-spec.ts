import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { ConfigService } from '@nestjs/config';
import { CreateTeacherDTO } from 'src/common/dtos/create-teacher.dto';

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
        .expect(403);
    });
  });
});
