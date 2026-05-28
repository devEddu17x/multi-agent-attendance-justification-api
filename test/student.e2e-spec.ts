import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TestingModule, Test } from '@nestjs/testing';
import { AppModule } from 'src/app.module';
import { App } from 'supertest/types';
import { getAdminToken } from './helpers/admin-token.helper';
import { getTeacherToken } from './helpers/teacher-token.helper';
import { getRandomCreateStudentDTO } from './factories/student-random.dto';
import request from 'supertest';
import { getParentEntity } from './helpers/get-parent.helper';
import { randomUUID } from 'node:crypto';
import { getClassroomEntity } from './helpers/get-classroom.helper';
import { getStudentEntity } from './helpers/get-student.helper';
import { getRandomCreateParentDTO } from './factories/parent-random.dto';
import { authenticateUser } from './helpers/authenticate-user.helper';
import { confirmUser } from './helpers/confirm-user.helper';
describe('StudentController (e2e)', () => {
  let app: INestApplication<App>;
  let adminToken: string;
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
    adminToken = await getAdminToken(app);
    teacherToken = await getTeacherToken(app);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/students (POST)', () => {
    it('should failed from a non-admin and non-teacher user', async () => {
      const dto = getRandomCreateStudentDTO();
      await request(app.getHttpServer())
        .post(`/${baseUrl}/students`)
        .send(dto)
        .expect(401);
    });
  });

  describe('/students (POST)', () => {
    describe('without parent id, rekognition id, baseclassroom id', () => {
      it('should create a student from an admin user )', async () => {
        const dto = getRandomCreateStudentDTO();
        await request(app.getHttpServer())
          .post(`/${baseUrl}/students`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(dto)
          .expect(201);
      });
    });
    describe('without parent id, rekognition id, baseclassroom id', () => {
      it('should create a student from an teacher user ', async () => {
        const dto = getRandomCreateStudentDTO();
        await request(app.getHttpServer())
          .post(`/${baseUrl}/students`)
          .set('Authorization', `Bearer ${teacherToken}`)
          .send(dto)
          .expect(201);
      });
    });
  });
  describe('/students (POST)', () => {
    describe('with parent id', () => {
      it('should create a student)', async () => {
        const dto = getRandomCreateStudentDTO();
        const parentEntity = await getParentEntity(app);
        dto.parentId = parentEntity.id;
        await request(app.getHttpServer())
          .post(`/${baseUrl}/students`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(dto)
          .expect(201);
      });
    });
    describe('with rekognition id', () => {
      it('should create a student', async () => {
        const dto = getRandomCreateStudentDTO();
        dto.rekognitionId = randomUUID();
        await request(app.getHttpServer())
          .post(`/${baseUrl}/students`)
          .set('Authorization', `Bearer ${teacherToken}`)
          .send(dto)
          .expect(201);
      });
    });
    describe('with baseclassroom id', () => {
      it('should create a student', async () => {
        const dto = getRandomCreateStudentDTO();
        const classroom = await getClassroomEntity(app);
        dto.baseClassroomId = classroom.id;
        await request(app.getHttpServer())
          .post(`/${baseUrl}/students`)
          .set('Authorization', `Bearer ${teacherToken}`)
          .send(dto)
          .expect(201);
      });
    });
    describe('with parent id, rekognition id, baseclassroom id', () => {
      it('should create a student', async () => {
        const dto = getRandomCreateStudentDTO();
        const parentEntity = await getParentEntity(app);
        dto.parentId = parentEntity.id;
        const classroom = await getClassroomEntity(app);
        dto.baseClassroomId = classroom.id;
        dto.rekognitionId = randomUUID();
        await request(app.getHttpServer())
          .post(`/${baseUrl}/students`)
          .set('Authorization', `Bearer ${teacherToken}`)
          .send(dto)
          .expect(201);
      });
    });
  });

  describe('/students (GET)', () => {
    it('should get all students from an admin user', async () => {
      await request(app.getHttpServer())
        .get(`/${baseUrl}/students`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  describe('/students (GET)', () => {
    it('should get only students from an parent user', async () => {
      const parentDTO = getRandomCreateParentDTO();
      const parentEntity = await getParentEntity(app, parentDTO);
      const studentDTO = getRandomCreateStudentDTO({
        parentId: parentEntity.id,
      });
      const studentEntity = await getStudentEntity(app, studentDTO);
      await confirmUser(app, parentDTO.user.email);
      const parentToken = await authenticateUser(
        app,
        parentDTO.user.email,
        parentDTO.password,
      );
      const response = await request(app.getHttpServer())
        .get(`/${baseUrl}/students/own`)
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(200);

      expect(response.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: studentEntity.id }),
        ]),
      );
    });
  });
});
