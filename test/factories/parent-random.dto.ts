import { faker } from '@faker-js/faker';
import { CreateTeacherDTO } from 'src/common/dtos/create-teacher.dto';

export const getRandomCreateParentDTO = (): CreateTeacherDTO => {
  const teacherDTO: CreateTeacherDTO = {
    user: {
      email: `p${String(Date.now()).slice(-5)}${faker.internet.email()}`,
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
    },
    documentNumber: faker.string.numeric(8),
    phone: `9${faker.string.numeric(8)}`,
    password: `A1!a${faker.internet.password({ length: 8 })}`,
  };
  return teacherDTO;
};
