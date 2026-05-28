import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminAddUserToGroupCommand,
  AdminSetUserPasswordCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { DataSource } from 'typeorm';
import { faker } from '@faker-js/faker';
import { ROLES } from '../src/common/enums/roles.enum';
import { DayOfWeek } from '../src/common/enums/day-of-week.enum';

import { UserEntity } from '../src/modules/user/entities/user.entity';
import { TeacherEntity } from '../src/modules/teachers/entities/teacher.entity';
import { ParentEntity } from '../src/modules/parents/entities/parent.entity';
import { StudentEntity } from '../src/modules/students/entities/student.entity';
import { CourseEntity } from '../src/modules/courses/entities/course.entity';
import { ClassroomEntity } from '../src/modules/classroom/entities/classroom.entity';
import { AcademicYearEntity } from '../src/modules/academic-classes/entities/academic-year.entity';
import { ClassroomCourseTeacherEntity } from '../src/modules/academic-classes/entities/classroom-course-teacher.entity';
import { ScheduleEntity } from '../src/modules/academic-classes/entities/schedule.entity';
import { EnrollmentEntity } from '../src/modules/academic-classes/entities/enrollment.entity';
import { TeacherCourseEntity } from 'src/modules/teachers/entities/teacher-course.entity';

const requiredEnvVars = [
  'DB_HOST',
  'DB_PORT',
  'DB_USERNAME',
  'DB_PASSWORD',
  'DB_NAME',
  'AWS_COGNITO_USER_POOL_ID',
  'AWS_COGNITO_REGION',
  'BASE_ADMIN_EMAIL',
  'BASE_ADMIN_PASSWORD',
  'BASE_ADMIN_FIRST_NAME',
  'BASE_ADMIN_LAST_NAME',
  'BASE_TEACHER_EMAIL',
  'BASE_TEACHER_PASSWORD',
  'BASE_TEACHER_FIRST_NAME',
  'BASE_TEACHER_LAST_NAME',
  'BASE_PARENT_EMAIL',
  'BASE_PARENT_PASSWORD',
  'BASE_PARENT_FIRST_NAME',
  'BASE_PARENT_LAST_NAME',
] as const;

function loadEnv() {
  const envFile = process.env.SEED_ENV_FILE || '.env.seed';
  try {
    const dotenv = require('dotenv');
    dotenv.config({ path: envFile });
  } catch (error) {
    console.log(
      `[Warning] Could not load ${envFile}, falling back to process.env. Error:`,
      error,
    );
  }

  const missing = requiredEnvVars.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }
}

async function createCognitoUser(
  client: CognitoIdentityProviderClient,
  userPoolId: string,
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  role: ROLES,
) {
  let userExisted = false;

  try {
    await client.send(
      new AdminCreateUserCommand({
        UserPoolId: userPoolId,
        Username: email,
        TemporaryPassword: password,
        UserAttributes: [
          { Name: 'email', Value: email },
          { Name: 'name', Value: `${firstName} ${lastName}` },
          { Name: 'given_name', Value: firstName },
          { Name: 'family_name', Value: lastName },
        ],
        MessageAction: 'SUPPRESS',
      }),
    );

    await client.send(
      new AdminAddUserToGroupCommand({
        UserPoolId: userPoolId,
        Username: email,
        GroupName: role,
      }),
    );
  } catch (error: any) {
    if (error.name === 'UsernameExistsException') {
      userExisted = true;
    } else {
      throw error;
    }
  }

  if (!userExisted) {
    await client.send(
      new AdminSetUserPasswordCommand({
        UserPoolId: userPoolId,
        Username: email,
        Password: password,
        Permanent: true,
      }),
    );
  }
}

async function main() {
  loadEnv();

  const {
    DB_HOST,
    DB_PORT,
    DB_USERNAME,
    DB_PASSWORD,
    DB_NAME,
    DB_SSL,
    AWS_COGNITO_USER_POOL_ID,
    AWS_COGNITO_REGION,
    BASE_TEACHER_EMAIL,
    BASE_TEACHER_PASSWORD,
    BASE_TEACHER_FIRST_NAME,
    BASE_TEACHER_LAST_NAME,
    BASE_PARENT_EMAIL,
    BASE_PARENT_PASSWORD,
    BASE_PARENT_FIRST_NAME,
    BASE_PARENT_LAST_NAME,
  } = process.env;

  const cognitoClient = new CognitoIdentityProviderClient({
    region: AWS_COGNITO_REGION,
  });

  const dataSource = new DataSource({
    type: 'postgres',
    host: DB_HOST,
    port: Number(DB_PORT),
    username: DB_USERNAME,
    password: DB_PASSWORD,
    database: DB_NAME,
    ssl: DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    synchronize: true,
    entities: [
      UserEntity,
      TeacherEntity,
      ParentEntity,
      StudentEntity,
      CourseEntity,
      TeacherCourseEntity,
      ClassroomEntity,
      AcademicYearEntity,
      ClassroomCourseTeacherEntity,
      ScheduleEntity,
      EnrollmentEntity,
    ],
  });

  try {
    await dataSource.initialize();
    console.log('[Database] Connected');

    // 1. Create Academic Year
    let academicYear = new AcademicYearEntity();
    academicYear.year = new Date().getFullYear();
    academicYear.startDate = new Date(academicYear.year, 2, 1);
    academicYear.endDate = new Date(academicYear.year, 11, 15);
    academicYear.isActive = true;
    await dataSource.getRepository(AcademicYearEntity).save(academicYear);
    console.log(`[Seed] Academic Year ${academicYear.year} created`);

    // 2. Create 10 Courses
    const courses: CourseEntity[] = [];
    for (let i = 1; i <= 10; i++) {
      const c = new CourseEntity();
      c.name = `Course ${i} - ${faker.lorem.words(2)}`;
      c.code = `C${academicYear.year}-${i.toString().padStart(3, '0')}`;
      await dataSource.getRepository(CourseEntity).save(c);
      courses.push(c);
    }
    console.log(`[Seed] 10 Courses created`);

    // 3. Create 10 Teachers
    const teachers: TeacherEntity[] = [];
    for (let i = 0; i < 10; i++) {
      const isBase = i === 0;
      const email = isBase
        ? BASE_TEACHER_EMAIL!
        : faker.internet.email().toLowerCase();
      const password = isBase ? BASE_TEACHER_PASSWORD! : 'Temp1234!';
      const firstName = isBase
        ? BASE_TEACHER_FIRST_NAME!
        : faker.person.firstName();
      const lastName = isBase
        ? BASE_TEACHER_LAST_NAME!
        : faker.person.lastName();

      await createCognitoUser(
        cognitoClient,
        AWS_COGNITO_USER_POOL_ID!,
        email,
        password,
        firstName,
        lastName,
        ROLES.TEACHER,
      );

      let user = new UserEntity();
      user.email = email;
      user.firstName = firstName;
      user.lastName = lastName;
      user.isAdmin = false;
      await dataSource.getRepository(UserEntity).save(user);

      let teacher = new TeacherEntity();
      teacher.userId = user.id;
      teacher.documentNumber = faker.string.numeric(8);
      teacher.phone = faker.string.numeric(9);
      teacher.isActive = true;
      await dataSource.getRepository(TeacherEntity).save(teacher);

      teachers.push(teacher);
    }
    console.log(`[Seed] 10 Teachers created (Tutor included)`);

    // 4. Create 1 Classroom
    let classroom = new ClassroomEntity();
    classroom.name = 'Classroom A';
    classroom.capacity = 30;
    classroom.building = 'Building A';
    classroom.tutorId = teachers[0].id;
    await dataSource.getRepository(ClassroomEntity).save(classroom);
    console.log(`[Seed] Classroom created`);

    // 5. Create 20 Parents & 20 Students
    const students: StudentEntity[] = [];
    const NUM_PARENTS = 20;
    const STUDENTS_PER_PARENT = 1;

    for (let i = 0; i < NUM_PARENTS; i++) {
      const isBaseParent = i === 0;
      const email = isBaseParent
        ? BASE_PARENT_EMAIL!
        : faker.internet.email().toLowerCase();
      const password = isBaseParent ? BASE_PARENT_PASSWORD! : 'Temp1234!';
      const firstName = isBaseParent
        ? BASE_PARENT_FIRST_NAME!
        : faker.person.firstName();
      const lastName = isBaseParent
        ? BASE_PARENT_LAST_NAME!
        : faker.person.lastName();

      await createCognitoUser(
        cognitoClient,
        AWS_COGNITO_USER_POOL_ID!,
        email,
        password,
        firstName,
        lastName,
        ROLES.PARENT,
      );

      let pUser = new UserEntity();
      pUser.email = email;
      pUser.firstName = firstName;
      pUser.lastName = lastName;
      pUser.isAdmin = false;
      await dataSource.getRepository(UserEntity).save(pUser);

      let parent = new ParentEntity();
      parent.userId = pUser.id;
      parent.documentNumber = faker.string.numeric(8);
      parent.phone = faker.string.numeric(9);
      await dataSource.getRepository(ParentEntity).save(parent);

      for (let j = 0; j < STUDENTS_PER_PARENT; j++) {
        let student = new StudentEntity();
        student.parentId = parent.id;
        student.baseClassroomId = classroom.id;
        student.firstName = faker.person.firstName();
        student.lastName = faker.person.lastName();
        student.documentNumber = faker.string.numeric(8);
        student.isActive = true;
        await dataSource.getRepository(StudentEntity).save(student);
        students.push(student);
      }
    }
    console.log(
      `[Seed] ${NUM_PARENTS} Parents and ${students.length} Students created`,
    );

    // 6. Link CCT, Enrollments & Schedules
    const days = [
      DayOfWeek.MONDAY,
      DayOfWeek.TUESDAY,
      DayOfWeek.WEDNESDAY,
      DayOfWeek.THURSDAY,
      DayOfWeek.FRIDAY,
    ];

    for (let i = 0; i < 10; i++) {
      let cct = new ClassroomCourseTeacherEntity();
      cct.academicYearId = academicYear.id;
      cct.classroomId = classroom.id;
      cct.courseId = courses[i].id;
      cct.teacherId = teachers[i].id;
      await dataSource.getRepository(ClassroomCourseTeacherEntity).save(cct);

      for (const student of students) {
        let enr = new EnrollmentEntity();
        enr.studentId = student.id;
        enr.classroomCourseTeacherId = cct.id;
        await dataSource.getRepository(EnrollmentEntity).save(enr);
      }

      const day = days[Math.floor(i / 2)];
      const slot = i % 2;

      let sch = new ScheduleEntity();
      sch.classroomCourseTeacherId = cct.id;
      sch.dayOfWeek = day;
      sch.startTime = slot === 0 ? '07:00:00' : '10:00:00';
      sch.endTime = slot === 0 ? '10:00:00' : '13:00:00';
      await dataSource.getRepository(ScheduleEntity).save(sch);
    }
    console.log(
      `[Seed] 10 Courses linked to Classroom with Schedules and ${students.length} enrollments each`,
    );

    console.log('[Seed] Seeding process completed successfully!');
  } catch (error) {
    console.error('[Seed] Failed:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
    cognitoClient.destroy();
  }
}

main();
