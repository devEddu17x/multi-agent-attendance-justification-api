import { CreateTeacherDTO } from 'src/common/dtos/create-teacher.dto';
const {
  BASE_TEACHER_EMAIL,
  BASE_TEACHER_FIRST_NAME,
  BASE_TEACHER_LAST_NAME,
  BASE_TEACHER_DOCUMENT_NUMBER,
  BASE_TEACHER_PHONE,
  BASE_TEACHER_PASSWORD,
  BASE_PARENT_EMAIL,
  BASE_PARENT_FIRST_NAME,
  BASE_PARENT_LAST_NAME,
  BASE_PARENT_DOCUMENT_NUMBER,
  BASE_PARENT_PHONE,
  BASE_PARENT_PASSWORD,
} = process.env;
export const teacherDto: CreateTeacherDTO = {
  user: {
    email: BASE_TEACHER_EMAIL!,
    firstName: BASE_TEACHER_FIRST_NAME!,
    lastName: BASE_TEACHER_LAST_NAME!,
  },
  documentNumber: BASE_TEACHER_DOCUMENT_NUMBER!,
  phone: BASE_TEACHER_PHONE!,
  password: BASE_TEACHER_PASSWORD!,
};

export const parentDto: CreateTeacherDTO = {
  user: {
    email: BASE_PARENT_EMAIL!,
    firstName: BASE_PARENT_FIRST_NAME!,
    lastName: BASE_PARENT_LAST_NAME!,
  },
  documentNumber: BASE_PARENT_DOCUMENT_NUMBER!,
  phone: BASE_PARENT_PHONE!,
  password: BASE_PARENT_PASSWORD!,
};
