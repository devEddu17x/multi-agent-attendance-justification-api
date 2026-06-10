import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { AgentState } from '../interfaces/agent-state.interface';
import { LlmService } from './llm.service';
import { QdrantService } from '../../modules/qdrant/qdrant.service';
import { AttendanceRulePayload } from '../../common/interfaces/attendance-rule.interface';
import { REGULATIONS_SYSTEM_PROMPT } from '../prompts/regulations-system.prompt';
import { QDRANT_COLLECTIONS } from '../constants/collections.constant';
import { RegulationsAnalysis } from '../interfaces/regulations-analysis.interface';
import { GeminiEmbeddingResponse } from '../interfaces/embedding-response.interface';

@Injectable()
export class RegulationsAgentService {
  constructor(
    private readonly llmService: LlmService,
    private readonly qdrantService: QdrantService,
    private readonly configService: ConfigService,
  ) {}

  async execute(state: AgentState): Promise<Partial<AgentState>> {
    const query = this.buildQuery(state);
    const vector = await this.embedText(query);

    const searchResults = await this.qdrantService.search(
      QDRANT_COLLECTIONS.ATTENDANCE_RULES,
      vector,
      3,
    );

    const payloads = searchResults.map(
      (p) => p.payload as AttendanceRulePayload,
    );

    if (payloads.length === 0) {
      return {
        regulationsOutput: {
          available: false,
          reason: 'no_rules_found',
          article: null,
          score: 0,
          requiredDocuments: [],
          keyRulesSummary: [],
          matchedRules: [],
          expectedOutcome: 'needs_review',
          reasoning:
            'No hay reglamento disponible para evaluar la justificación.',
        },
      };
    }

    const model = this.llmService.getModel();

    const extractedData = state.extractedData ?? {};
    const diasAusencia =
      typeof extractedData.numDias === 'number' && extractedData.numDias > 0
        ? extractedData.numDias
        : Array.isArray(extractedData.fechasAusencia)
          ? extractedData.fechasAusencia.length
          : 1;

    const humanContent = [
      `CASO: ${query}`,
      ``,
      `DÍAS DE AUSENCIA: ${diasAusencia}`,
      ``,
      `REGLAS RELEVANTES (top ${payloads.length} por similitud semántica):`,
      JSON.stringify(
        payloads.map((p) => ({
          article: p.article_number,
          title: p.title,
          category: p.category,
          text: p.full_text,
          rules: p.business_rules,
        })),
        null,
        2,
      ),
      ``,
      `DATOS EXTRAÍDOS:`,
      JSON.stringify(extractedData, null, 2),
      ``,
      `HISTORIAL DEL ESTUDIANTE:`,
      JSON.stringify(state.historyOutput ?? {}, null, 2),
      ``,
      `Determina qué artículo aplica y devuelve tu evaluación en JSON.`,
    ].join('\n');

    const response = await model.invoke([
      new SystemMessage(REGULATIONS_SYSTEM_PROMPT),
      new HumanMessage(humanContent),
    ]);

    const analysis = JSON.parse(response.content as string) as Omit<
      RegulationsAnalysis,
      'available'
    >;

    return {
      regulationsOutput: {
        available: true,
        ...analysis,
      },
    };
  }

  private buildQuery(state: AgentState): string {
    const extracted = state.extractedData ?? {};
    const history = state.historyOutput ?? {};

    const parts = [
      extracted.motivoAusencia,
      extracted.tipoDocumento,
      extracted.diagnostico,
      Array.isArray(history.patterns) ? history.patterns.join(', ') : undefined,
      Array.isArray(history.riskFlags)
        ? history.riskFlags.join(', ')
        : undefined,
    ].filter((p): p is string => typeof p === 'string' && p.length > 0);

    return parts.join('. ') || 'justificación de asistencia escolar';
  }

  private async embedText(text: string): Promise<number[]> {
    const config = this.configService.get<{ apiKey: string; model: string }>(
      'googleEmbeddings',
    );
    if (!config) {
      throw new Error('Google Embeddings configuration not found');
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:embedContent?key=${config.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: `models/${config.model}`,
          content: { parts: [{ text }] },
        }),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Gemini embeddings API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as GeminiEmbeddingResponse;
    const values = data.embedding?.values;

    if (!values || !Array.isArray(values)) {
      throw new Error('Invalid embedding response from Gemini API');
    }

    return values;
  }
}
