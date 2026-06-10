import { Injectable, Logger } from '@nestjs/common';
import { StateGraph, END, START, Annotation } from '@langchain/langgraph';
import { IterableReadableStream } from '@langchain/core/utils/stream';
import { OrchestratorAgentService } from './orchestrator-agent.service';
import { CommunicatorAgentService } from './communicator-agent.service';
import { ExtractorAgentService } from './extractor-agent.service';
import { HistoryAgentService } from './history-agent.service';
import { RegulationsAgentService } from './regulations-agent.service';
import { TransactionalAgentService } from './transactional-agent.service';
import { AgentState } from '../interfaces/agent-state.interface';

const AgentStateAnnotation = Annotation.Root({
  messages: Annotation<any[]>(),
  sessionId: Annotation<string>(),
  userId: Annotation<string>(),
  studentId: Annotation<string | undefined>(),
  attachments: Annotation<any[] | undefined>(),
  nextAgent: Annotation<string | undefined>(),
  extractedData: Annotation<Record<string, unknown> | undefined>(),
  historyOutput: Annotation<Record<string, unknown> | undefined>(),
  regulationsOutput: Annotation<Record<string, unknown> | undefined>(),
  finalVerdict: Annotation<Record<string, unknown> | undefined>(),
  finalResponse: Annotation<string | undefined>(),
});

type AgentStateType = typeof AgentStateAnnotation.State;

@Injectable()
export class GraphService {
  private compiledGraph: any;
  private readonly logger = new Logger(GraphService.name);

  constructor(
    private readonly orchestratorAgent: OrchestratorAgentService,
    private readonly communicatorAgent: CommunicatorAgentService,
    private readonly extractorAgent: ExtractorAgentService,
    private readonly historyAgent: HistoryAgentService,
    private readonly regulationsAgent: RegulationsAgentService,
    private readonly transactionalAgent: TransactionalAgentService,
  ) {
    const graph = new StateGraph(AgentStateAnnotation);

    const logNode = (name: string, fn: (state: AgentStateType) => Promise<any>) => {
      return async (state: AgentStateType) => {
        this.logger.log(`[GRAPH] Executing node: ${name}`);
        try {
          const result = await fn(state);
          this.logger.log(`[GRAPH] Node ${name} completed. Keys: ${Object.keys(result || {}).join(', ')}`);
          return result;
        } catch (error) {
          this.logger.error(`[GRAPH] Node ${name} failed: ${error.message}`, error.stack);
          // Return safe fallback so the graph can continue to communicator
          return this.getFallbackForNode(name);
        }
      };
    };

    graph
      .addNode('orchestrator', logNode('orchestrator', (state) =>
        this.orchestratorAgent.execute(state as any),
      ))
      .addNode('communicator', logNode('communicator', (state) =>
        this.communicatorAgent.execute(state as any),
      ))
      .addNode('extractor', logNode('extractor', (state) =>
        this.extractorAgent.execute(state as any),
      ))
      .addNode('history', logNode('history', (state) =>
        this.historyAgent.execute(state as any),
      ))
      .addNode('regulations', logNode('regulations', (state) =>
        this.regulationsAgent.execute(state as any),
      ))
      .addNode('transactional', logNode('transactional', (state) =>
        this.transactionalAgent.execute(state as any),
      ))
      .addEdge(START, 'orchestrator')
      .addConditionalEdges(
        'orchestrator',
        (state: AgentStateType) => {
          const next = state.nextAgent || 'communicator';
          this.logger.log(`[GRAPH] Orchestrator routing to: ${next}`);
          return next;
        },
        {
          communicator: 'communicator',
          extractor: 'extractor',
          history: 'history',
          regulations: 'regulations',
          transactional: 'transactional',
        },
      )
      .addEdge('extractor', 'orchestrator')
      .addEdge('history', 'orchestrator')
      .addEdge('regulations', 'orchestrator')
      .addEdge('transactional', 'orchestrator')
      .addEdge('communicator', END);

    this.compiledGraph = graph.compile();
  }

  invoke(state: AgentState): Promise<Partial<AgentState>> {
    return this.compiledGraph.invoke(state);
  }

  stream(state: AgentState): Promise<IterableReadableStream<Partial<AgentState>>> {
    return this.compiledGraph.stream(state, { streamMode: 'updates' });
  }

  private getFallbackForNode(nodeName: string): Partial<AgentState> {
    switch (nodeName) {
      case 'extractor':
        return { extractedData: { error: 'api_error', available: false } };
      case 'history':
        return { historyOutput: { available: false, error: 'api_error' } };
      case 'regulations':
        return { regulationsOutput: { available: false, error: 'api_error' } };
      case 'transactional':
        return { finalVerdict: { available: false, error: 'api_error' } };
      case 'communicator':
        return { finalResponse: 'Lo siento, ocurrió un error al procesar tu solicitud. Por favor, inténtalo de nuevo más tarde.' };
      default:
        return {};
    }
  }
}
