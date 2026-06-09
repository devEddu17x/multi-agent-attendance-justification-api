import { Injectable } from '@nestjs/common';
import { HumanMessage, AIMessage, BaseMessage } from '@langchain/core/messages';
import { ChatMessageEntity } from '../entities/chat-message.entity';
import { ChatMessageRole } from '../enums/chat-message-role.enum';

@Injectable()
export class MessageMapperService {
  toLangChainMessages(entities: ChatMessageEntity[]): BaseMessage[] {
    return entities.map((m) => {
      if (m.role === ChatMessageRole.USER) {
        return new HumanMessage(m.content);
      }
      return new AIMessage(m.content);
    });
  }
}
