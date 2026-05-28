import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import { ClassroomService } from 'src/modules/classroom/classroom.service';
import { getRandomCreateClassroomDTO } from '../factories/classroom.dto';
import { ClassroomEntity } from 'src/modules/classroom/entities/classroom.entity';

export const getClassroomEntity = async (
  app: INestApplication<App>,
): Promise<ClassroomEntity> => {
  const classroomService = app.get(ClassroomService);
  const dto = getRandomCreateClassroomDTO();
  const classroom = await classroomService.create(dto);
  return classroom;
};
