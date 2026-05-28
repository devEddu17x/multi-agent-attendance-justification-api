import { INestApplication } from '@nestjs/common';
import { AdministrationService } from 'src/modules/admin/admin.service';
import { App } from 'supertest/types';
import { authenticateUser } from './authenticate-user.helper';
import { getRandomCreateTeacherDTO } from './../factories/teacher-random.dto';
import { confirmUser } from './confirm-user.helper';

export const getTeacherToken = async (app: INestApplication<App>) => {
  const dto = getRandomCreateTeacherDTO();
  const administrationService = app.get(AdministrationService);
  await administrationService.createTeacher(dto);
  await confirmUser(app, dto.user.email);
  const idToken = await authenticateUser(app, dto.user.email, dto.password);
  return idToken;
};
