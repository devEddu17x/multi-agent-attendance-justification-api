import { Injectable } from '@nestjs/common';
import { LlmService } from './llm.service';
import { AgentState } from '../interfaces/agent-state.interface';
import { COMMUNICATOR_SYSTEM_PROMPT } from '../prompts/communicator-system.prompt';
import { SystemMessage } from '@langchain/core/messages';

@Injectable()
export class CommunicatorAgentService {
  constructor(private readonly llmService: LlmService) {}

  async execute(state: AgentState): Promise<Partial<AgentState>> {
    const model = this.llmService.getModel();

    let contextInfo = '';
    if (state.extractedData || state.historyOutput || state.regulationsOutput) {
      contextInfo = '\n\n[CONTEXTO INTERNO DEL SISTEMA]';
      if (state.extractedData) {
        contextInfo += `\n- Datos Extraídos: ${JSON.stringify(state.extractedData)}`;
      }
      if (state.historyOutput) {
        contextInfo += `\n- Historial del Alumno: ${JSON.stringify(state.historyOutput)}`;
      }
      if (state.regulationsOutput) {
        contextInfo += `\n- Normativas/Reglas: ${JSON.stringify(state.regulationsOutput)}`;
      }
      contextInfo +=
        '\nUsa esta información para dar una respuesta precisa y guiar al usuario.';
    }

    const messages = [
      new SystemMessage(COMMUNICATOR_SYSTEM_PROMPT + contextInfo),
      ...state.messages,
    ];

    const response = await model.invoke(messages);
    const content = response.content as string;

    return {
      finalResponse: content,
      nextAgent: 'end',
    };
  }
}
