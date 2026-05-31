import { Injectable } from '@nestjs/common';
import { AgentState } from '../interfaces/agent-state.interface';

@Injectable()
export class RegulationsAgentService {
  async execute(state: AgentState): Promise<Partial<AgentState>> {
    // TODO: Query Qdrant via QdrantService to obtain applicable rules
    return {
      regulationsOutput: {
        article: null,
        score: 0,
        requiredDocuments: [],
      },
      nextAgent: 'communicator',
    };
  }
}
