import {
  IsString,
  IsOptional,
  IsArray,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class FilePlanDTO {
  @IsString()
  filename: string;

  @IsString()
  contentType: string;
}

export class PresignedUrlsDTO {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FilePlanDTO)
  files: FilePlanDTO[];

  @IsUUID()
  @IsOptional()
  studentId?: string;
}
