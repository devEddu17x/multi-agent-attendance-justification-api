import { Column, Entity, PrimaryGeneratedColumn, ManyToMany } from 'typeorm';
import { TeacherEntity } from '../../teachers/entities/teacher.entity';

@Entity('courses')
export class CourseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', unique: true, length: 100 })
  code: string;

  @ManyToMany(() => TeacherEntity, (teacher) => teacher.courses)
  teachers: TeacherEntity[];
}
