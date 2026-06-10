import { Injectable, Logger } from '@nestjs/common';
import { LlmService } from './llm.service';
import { AgentState } from '../interfaces/agent-state.interface';
import { COMMUNICATOR_SYSTEM_PROMPT } from '../prompts/communicator-system.prompt';
import { SystemMessage } from '@langchain/core/messages';

@Injectable()
export class CommunicatorAgentService {
  private readonly logger = new Logger(CommunicatorAgentService.name);

  constructor(private readonly llmService: LlmService) {}

  async execute(state: AgentState): Promise<Partial<AgentState>> {
    // Check if previous agents failed
    const hasError =
      state.extractedData?.error === 'api_error' ||
      state.historyOutput?.error === 'api_error' ||
      state.regulationsOutput?.error === 'api_error' ||
      state.finalVerdict?.error === 'api_error';

    if (hasError) {
      this.logger.warn(
        '[COMMUNICATOR] Previous agent failed with API error, returning safe message',
      );
      return {
        finalResponse:
          'Lo siento, ha ocurrido un problema técnico al procesar tu solicitud. Por favor, inténtalo de nuevo en unos momentos.',
        nextAgent: 'end',
      };
    }

    const model = this.llmService.getModel();

    let contextInfo = '';
    if (
      state.extractedData ||
      state.historyOutput ||
      state.regulationsOutput ||
      state.finalVerdict
    ) {
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
      if (state.finalVerdict) {
        contextInfo += `\n- Veredicto Final: ${JSON.stringify(state.finalVerdict)}`;
      }
      contextInfo +=
        '\nUsa esta información para dar una respuesta precisa y guiar al usuario.';
    }

    try {
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
    } catch (error) {
      this.logger.error(`[COMMUNICATOR] LLM invocation failed: ${error}`);
      return {
        finalResponse:
          'Lo siento, ha ocurrido un problema técnico al procesar tu solicitud. Por favor, inténtalo de nuevo en unos momentos.',
        nextAgent: 'end',
      };
    }
  }
}
