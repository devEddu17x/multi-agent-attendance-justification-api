import { Injectable } from '@nestjs/common';
import { AgentState } from '../interfaces/agent-state.interface';

@Injectable()
export class TransactionalAgentService {
  async execute(state: AgentState): Promise<Partial<AgentState>> {
    // TODO: Agent that writes justifications in database, pre and post absent
    return {
      nextAgent: 'communicator',
    };
  }
}
