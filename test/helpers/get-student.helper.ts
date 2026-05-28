import { INestApplication } from '@nestjs/common';
import { CreateStudentDTO } from 'src/modules/students/dto/create-student.dto';
import { StudentEntity } from 'src/modules/students/entities/student.entity';
import { StudentsService } from 'src/modules/students/students.service';
import { App } from 'supertest/types';
import { getRandomCreateStudentDTO } from '../factories/student-random.dto';

export const getStudentEntity = async (
  app: INestApplication<App>,
  dto?: CreateStudentDTO,
): Promise<StudentEntity> => {
  const studentService = app.get(StudentsService);
  const student = await studentService.create(
    dto ?? getRandomCreateStudentDTO(),
  );
  return student;
};
