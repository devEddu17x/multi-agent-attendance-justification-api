import { faker } from '@faker-js/faker';
import { CreateStudentDTO } from 'src/modules/students/dto/create-student.dto';

export const getRandomCreateStudentDTO = (
  metadata?: {
    rekognitionId?: string;
    parentId?: string;
    baseClassroomId?: string;
  } | null,
): CreateStudentDTO => {
  const studentDTO: CreateStudentDTO = {
    documentNumber: faker.string.numeric(8),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    rekognitionId: metadata?.rekognitionId,
    parentId: metadata?.parentId,
    baseClassroomId: metadata?.baseClassroomId,
  };
  return studentDTO;
};
