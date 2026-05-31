import { Injectable } from '@nestjs/common';
import { HumanMessage, AIMessage, BaseMessage } from '@langchain/core/messages';
import { ChatMessageEntity } from '../entities/chat-message.entity';
import { ChatMessageRole } from '../enums/chat-message-role.enum';
import { AnthropicContentBlock } from '../../../agents/interfaces/agent-state.interface';

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

  appendMultimodal(
    messages: BaseMessage[],
    content: string,
    blocks: AnthropicContentBlock[],
  ): void {
    const lastMessage = messages[messages.length - 1];
    if (!(lastMessage instanceof HumanMessage)) {
      return;
    }

    const contentBlocks: any[] = [{ type: 'text', text: content }];
    for (const block of blocks) {
      contentBlocks.push(block);
    }

    messages[messages.length - 1] = new HumanMessage({
      content: contentBlocks,
    });
  }
}
