import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JustifyController } from './justify.controller';
import { JustifyChatService } from './services/justify-chat.service';
import { SessionManagerService } from './services/session-manager.service';
import { StateBuilderService } from './services/state-builder.service';
import { AttachmentProcessorService } from './services/attachment-processor.service';
import { SseEventService } from './services/sse-event.service';
import { JustifyStorageService } from './services/justify-storage.service';
import { JustificationService } from './services/justification.service';
import { StorageModule } from '../storage/storage.module';
import { AgentsModule } from '../../agents/agents.module';
import { AttendanceModule } from '../attendance/attendance.module';
import { JustificationSessionEntity } from './entities/justification-session.entity';
import { ChatMessageEntity } from './entities/chat-message.entity';
import { StudentsModule } from '../students/students.module';

@Module({
  imports: [
    StorageModule,
    StudentsModule,
    AttendanceModule,
    forwardRef(() => AgentsModule),
    TypeOrmModule.forFeature([JustificationSessionEntity, ChatMessageEntity]),
  ],
  controllers: [JustifyController],
  providers: [
    JustifyChatService,
    SessionManagerService,
    StateBuilderService,
    AttachmentProcessorService,
    SseEventService,
    JustifyStorageService,
    JustificationService,
  ],
  exports: [JustifyChatService, JustifyStorageService, JustificationService],
})
export class JustifyModule {}
