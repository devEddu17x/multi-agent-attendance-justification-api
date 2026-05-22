import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { UserEntity } from '../../user/entities/user.entity';

@Entity('parents')
export class ParentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'document_number', type: 'varchar', unique: true })
  documentNumber: string;

  @Column({ type: 'varchar' })
  phone: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @OneToOne(() => UserEntity, (user) => user.parent)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;
}
