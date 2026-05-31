import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JustifyController } from './justify.controller';
import { JustifyChatService } from './services/justify-chat.service';
import { SessionManagerService } from './services/session-manager.service';
import { MessageMapperService } from './services/message-mapper.service';
import { AttachmentProcessorService } from './services/attachment-processor.service';
import { AgentStateBuilderService } from './services/agent-state-builder.service';
import { SseEventService } from './services/sse-event.service';
import { JustifyStorageService } from './services/justify-storage.service';
import { StorageModule } from '../storage/storage.module';
import { AgentsModule } from '../../agents/agents.module';
import { JustificationSessionEntity } from './entities/justification-session.entity';
import { ChatMessageEntity } from './entities/chat-message.entity';

@Module({
  imports: [
    StorageModule,
    AgentsModule,
    TypeOrmModule.forFeature([JustificationSessionEntity, ChatMessageEntity]),
  ],
  controllers: [JustifyController],
  providers: [
    JustifyChatService,
    SessionManagerService,
    MessageMapperService,
    AttachmentProcessorService,
    AgentStateBuilderService,
    SseEventService,
    JustifyStorageService,
  ],
  exports: [JustifyChatService, JustifyStorageService],
})
export class JustifyModule {}
