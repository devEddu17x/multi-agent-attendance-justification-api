import { Injectable } from '@nestjs/common';
import { AgentState } from '../interfaces/agent-state.interface';

@Injectable()
export class ExtractorAgentService {
  async execute(state: AgentState): Promise<Partial<AgentState>> {
    // TODO: Processes attached documents (PDFs, images) and extracts structured entities
    return {
      extractedData: {},
      nextAgent: 'history',
    };
  }
}
