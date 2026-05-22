import { Column, Entity, PrimaryGeneratedColumn, OneToOne } from 'typeorm';
import { TeacherEntity } from '../../teachers/entities/teacher.entity';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'first_name', type: 'varchar' })
  firstName: string;

  @Column({ name: 'last_name', type: 'varchar' })
  lastName: string;

  @Column({
    type: 'varchar',
    unique: true,
  })
  email: string;

  @OneToOne(() => TeacherEntity, (teacher) => teacher.user)
  teacher: TeacherEntity;
}
