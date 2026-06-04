import { Module } from '@nestjs/common';
import { GraphService } from './services/graph.service';
import { OrchestratorAgentService } from './services/orchestrator-agent.service';
import { CommunicatorAgentService } from './services/communicator-agent.service';
import { ExtractorAgentService } from './services/extractor-agent.service';
import { HistoryAgentService } from './services/history-agent.service';
import { RegulationsAgentService } from './services/regulations-agent.service';
import { TransactionalAgentService } from './services/transactional-agent.service';
import { LlmService } from './services/llm.service';
import { QdrantModule } from '../modules/qdrant/qdrant.module';

@Module({
  imports: [QdrantModule],
  providers: [
    LlmService,
    GraphService,
    OrchestratorAgentService,
    CommunicatorAgentService,
    ExtractorAgentService,
    HistoryAgentService,
    RegulationsAgentService,
    TransactionalAgentService,
  ],
  exports: [LlmService, GraphService],
})
export class AgentsModule {}
