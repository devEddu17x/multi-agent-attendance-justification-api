import { faker } from '@faker-js/faker';
import { CreateClassroomDTO } from 'src/modules/classroom/dto/create-classroom.dto';

export const getRandomCreateClassroomDTO = (): CreateClassroomDTO => {
  const classroomDTO: CreateClassroomDTO = {
    building: faker.location.buildingNumber(),
    capacity: faker.number.int({ min: 1, max: 64 }),
    name: faker.string.alpha({ length: { min: 1, max: 64 } }),
  };
  return classroomDTO;
};
