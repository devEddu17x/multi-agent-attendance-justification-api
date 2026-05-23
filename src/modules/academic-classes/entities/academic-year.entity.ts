import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('academic_years')
export class AcademicYearEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int' })
  year: number;

  @Column({ name: 'start_date', type: 'date' })
  startDate: Date;

  @Column({ name: 'end_date', type: 'date' })
  endDate: Date;

  @Column({ name: 'is_active', type: 'boolean', default: false })
  isActive: boolean;
}
