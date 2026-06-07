import { Injectable } from '@nestjs/common';
import { StateGraph, END, START, Annotation } from '@langchain/langgraph';
import { OrchestratorAgentService } from './orchestrator-agent.service';
import { CommunicatorAgentService } from './communicator-agent.service';
import { ExtractorAgentService } from './extractor-agent.service';
import { HistoryAgentService } from './history-agent.service';
import { RegulationsAgentService } from './regulations-agent.service';
import { TransactionalAgentService } from './transactional-agent.service';

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
  finalResponse: Annotation<string | undefined>(),
});

type AgentStateType = typeof AgentStateAnnotation.State;

@Injectable()
export class GraphService {
  private compiledGraph: any;

  constructor(
    private readonly orchestratorAgent: OrchestratorAgentService,
    private readonly communicatorAgent: CommunicatorAgentService,
    private readonly extractorAgent: ExtractorAgentService,
    private readonly historyAgent: HistoryAgentService,
    private readonly regulationsAgent: RegulationsAgentService,
    private readonly transactionalAgent: TransactionalAgentService,
  ) {
    const graph = new StateGraph(AgentStateAnnotation);

    graph
      .addNode('orchestrator', (state: AgentStateType) =>
        this.orchestratorAgent.execute(state as any),
      )
      .addNode('communicator', (state: AgentStateType) =>
        this.communicatorAgent.execute(state as any),
      )
      .addNode('extractor', (state: AgentStateType) =>
        this.extractorAgent.execute(state as any),
      )
      .addNode('history', (state: AgentStateType) =>
        this.historyAgent.execute(state as any),
      )
      .addNode('regulations', (state: AgentStateType) =>
        this.regulationsAgent.execute(state as any),
      )
      .addNode('transactional', (state: AgentStateType) =>
        this.transactionalAgent.execute(state as any),
      )
      .addEdge(START, 'orchestrator')
      .addConditionalEdges(
        'orchestrator',
        (state: AgentStateType) => state.nextAgent || 'communicator',
        {
          communicator: 'communicator',
          extractor: 'extractor',
          history: 'history',
          regulations: 'regulations',
          transactional: 'transactional',
          end: END,
        },
      )
      .addEdge('extractor', 'history')
      .addEdge('history', 'regulations')
      .addEdge('regulations', 'transactional')
      .addEdge('transactional', 'communicator')
      .addEdge('communicator', END);

    this.compiledGraph = graph.compile();
  }

  invoke(state: unknown): Promise<unknown> {
    return (
      this.compiledGraph as { invoke(s: unknown): Promise<unknown> }
    ).invoke(state);
  }
}
