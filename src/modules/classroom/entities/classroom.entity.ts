import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TeacherEntity } from '../../teachers/entities/teacher.entity';

@Entity('classrooms')
export class ClassroomEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'int' })
  capacity: number;

  @Column({ type: 'varchar' })
  building: string;

  @Column({ name: 'tutor_id', type: 'uuid', nullable: true })
  tutorId: string | null;

  @ManyToOne(() => TeacherEntity, { nullable: true })
  @JoinColumn({ name: 'tutor_id' })
  tutor: TeacherEntity;
}
