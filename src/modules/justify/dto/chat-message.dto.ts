import { IsString, IsOptional, IsArray, IsUUID } from 'class-validator';

export class ChatMessageDTO {
  @IsUUID()
  @IsOptional()
  sessionId?: string;

  @IsUUID()
  @IsOptional()
  studentId?: string;

  @IsString()
  content: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  attachments?: string[];
}
