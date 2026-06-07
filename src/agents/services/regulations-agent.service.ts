import { Injectable, Logger } from '@nestjs/common';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { AgentState } from '../interfaces/agent-state.interface';
import { LlmService } from './llm.service';
import { QdrantService } from '../../modules/qdrant/qdrant.service';
import { AttendanceRulePayload } from '../../common/interfaces/attendance-rule.interface';
import { REGULATIONS_SYSTEM_PROMPT } from '../prompts/regulations-system.prompt';
import { QDRANT_COLLECTIONS } from '../constants/collections.constant';
import { RegulationsAnalysis } from '../interfaces/regulations-analysis.interface';

const EMPTY_ANALYSIS: RegulationsAnalysis = {
  article: null,
  score: 0,
  requiredDocuments: [],
  keyRulesSummary: [],
  matchedRules: [],
  expectedOutcome: 'needs_review',
  reasoning: '',
};

@Injectable()
export class RegulationsAgentService {
  private readonly logger = new Logger(RegulationsAgentService.name);

  constructor(
    private readonly llmService: LlmService,
    private readonly qdrantService: QdrantService,
  ) {}

  async execute(state: AgentState): Promise<Partial<AgentState>> {
    try {
      // 1. Precargar todos los artículos del reglamento desde Qdrant (solo lectura, sin generar embeddings)
      const scrollResult = await this.qdrantService.scroll(
        QDRANT_COLLECTIONS.ATTENDANCE_RULES,
        100,
      );

      const payloads = scrollResult.points
        .map((p) => p.payload as AttendanceRulePayload)
        .filter(
          (p): p is AttendanceRulePayload =>
            p !== null &&
            p !== undefined &&
            typeof p.article_id === 'number' &&
            typeof p.article_number === 'string',
        );

      if (payloads.length === 0) {
        this.logger.warn(
          'No se encontraron artículos del reglamento en Qdrant',
        );
        return {
          regulationsOutput: {
            available: false,
            reason: 'no_rules_found',
            ...EMPTY_ANALYSIS,
            reasoning:
              'No hay reglamento disponible para evaluar la justificación.',
          },
        };
      }

      this.logger.log(
        `Reglamento cargado: ${payloads.length} artículos para evaluación LLM`,
      );

      // 2. Construir contexto: reglamento + datos extraídos + historial del estudiante
      const model = this.llmService.getModel();

      const humanContent = [
        `REGLAMENTO DE ASISTENCIA (${payloads.length} artículos):`,
        JSON.stringify(payloads, null, 2),
        ``,
        `DATOS EXTRAÍDOS DE LA SOLICITUD DEL PADRE:`,
        JSON.stringify(state.extractedData ?? {}, null, 2),
        ``,
        `ANÁLISIS DEL HISTORIAL DEL ESTUDIANTE:`,
        JSON.stringify(state.historyOutput ?? {}, null, 2),
        ``,
        `Determina qué artículo aplica a esta justificación y devuelve tu evaluación en JSON.`,
      ].join('\n');

      const response = await model.invoke([
        new SystemMessage(REGULATIONS_SYSTEM_PROMPT),
        new HumanMessage(humanContent),
      ]);

      const raw = (response.content as string).trim();
      const analysis = JSON.parse(raw) as RegulationsAnalysis;

      this.logger.log(
        `Regulations analysis: article=${analysis.article?.articleNumber ?? 'none'}, score=${analysis.score}, outcome=${analysis.expectedOutcome}`,
      );

      return {
        regulationsOutput: {
          available: true,
          ...analysis,
        },
      };
    } catch (error) {
      this.logger.error('Regulations agent falló inesperadamente', error);
      return {
        regulationsOutput: {
          available: false,
          reason: 'regulations_query_failed',
          ...EMPTY_ANALYSIS,
          reasoning: 'No se pudieron evaluar los reglamentos aplicables.',
        },
      };
    }
  }
}
