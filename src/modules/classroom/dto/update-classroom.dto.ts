import { PartialType } from '@nestjs/mapped-types';
import { CreateClassroomDTO } from './create-classroom.dto';

export class UpdateClassroomDto extends PartialType(CreateClassroomDTO) {}
