import { registerAs } from '@nestjs/config';
import { ClassroomEntity } from 'src/modules/classroom/entities/classroom.entity';
import { UserEntity } from 'src/modules/user/entities/user.entity';
import { TeacherEntity } from 'src/modules/teachers/entities/teacher.entity';
import { ParentEntity } from 'src/modules/parents/entities/parent.entity';
import { CourseEntity } from 'src/modules/courses/entities/course.entity';
import { TeacherCourseEntity } from 'src/modules/teachers/entities/teacher-course.entity';
import { AcademicYearEntity } from 'src/modules/academic-classes/entities/academic-year.entity';
import { ClassroomCourseTeacherEntity } from 'src/modules/academic-classes/entities/classroom-course-teacher.entity';
import { ScheduleEntity } from 'src/modules/academic-classes/entities/schedule.entity';
import { StudentEntity } from 'src/modules/students/entities/student.entity';
import { EnrollmentEntity } from 'src/modules/academic-classes/entities/enrollment.entity';
import { AttendanceEntity } from 'src/modules/attendance/entities/attendance.entity';
import { AttendanceJustificationEntity } from 'src/modules/attendance/entities/attendance-justification.entity';
import { JustificationSessionEntity } from 'src/modules/justify/entities/justification-session.entity';
import { ChatMessageEntity } from 'src/modules/justify/entities/chat-message.entity';

export default registerAs('typeorm', () => {
  const { DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_NAME, DB_SSL } =
    process.env;

  const missingVars = [
    ['DB_HOST', DB_HOST],
    ['DB_PORT', DB_PORT],
    ['DB_USERNAME', DB_USERNAME],
    ['DB_NAME', DB_NAME],
  ]
    .filter(
      ([, value]) => typeof value !== 'string' || value.trim().length === 0,
    )
    .map(([name]) => name);

  if (missingVars.length) {
    throw new Error(
      `Missing required database env vars: ${missingVars.join(', ')}`,
    );
  }

  if (!DB_PORT || isNaN(Number(DB_PORT))) {
    throw new Error(`DB_PORT must be a valid number, got: ${DB_PORT}`);
  }

  return {
    type: 'postgres',
    host: DB_HOST,
    port: DB_PORT,
    username: DB_USERNAME,
    password: DB_PASSWORD,
    database: DB_NAME,
    entities: [
      UserEntity,
      TeacherEntity,
      ParentEntity,
      ClassroomEntity,
      CourseEntity,
      TeacherCourseEntity,
      AcademicYearEntity,
      ClassroomCourseTeacherEntity,
      ScheduleEntity,
      StudentEntity,
      EnrollmentEntity,
      AttendanceEntity,
      AttendanceJustificationEntity,
      JustificationSessionEntity,
      ChatMessageEntity,
    ],
    synchronize: process.env.NODE_ENV !== 'production',
    ssl:
      DB_SSL === 'true'
        ? {
            require: true,
            rejectUnauthorized: false,
          }
        : false,
    uuidExtension: 'pgcrypto',
  };
});
