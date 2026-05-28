import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ParentEntity } from '../../parents/entities/parent.entity';
import { ClassroomEntity } from '../../classroom/entities/classroom.entity';

@Entity('students')
export class StudentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'document_number', type: 'varchar', unique: true, length: 8 })
  documentNumber: string;

  @Column({ name: 'first_name', type: 'varchar' })
  firstName: string;

  @Column({ name: 'last_name', type: 'varchar' })
  lastName: string;

  @Column({ name: 'parent_id', type: 'uuid', nullable: true })
  parentId: string | null;

  @Column({ name: 'base_classroom_id', type: 'uuid', nullable: true })
  baseClassroomId: string | null;

  @Column({
    name: 'rekognition_id',
    type: 'uuid',
    unique: true,
    nullable: true,
  })
  rekognitionId: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @ManyToOne(() => ParentEntity, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent: ParentEntity;

  @ManyToOne(() => ClassroomEntity, { nullable: true })
  @JoinColumn({ name: 'base_classroom_id' })
  baseClassroom: ClassroomEntity;
}
