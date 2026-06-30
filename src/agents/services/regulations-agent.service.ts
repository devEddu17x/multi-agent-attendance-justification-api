import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { AgentState } from '../interfaces/agent-state.interface';
import { LlmService } from './llm.service';
import { QdrantService } from '../../modules/qdrant/qdrant.service';
import { AttendanceRulePayload } from '../../common/interfaces/attendance-rule.interface';
import { REGULATIONS_SYSTEM_PROMPT } from '../prompts/regulations-system.prompt';
import { QDRANT_COLLECTIONS } from '../constants/collections.constant';
import { GeminiEmbeddingResponse } from '../interfaces/embedding-response.interface';
import { PolicyEvaluation } from '../interfaces/justification-workflow.interface';
import {
  asBoolean,
  asNumber,
  asString,
  asStringArray,
  parseLlmJson,
} from '../utils/llm-json.util';

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

    const analysis = parseLlmJson(
      response.content,
      fallbackPolicyEvaluation('parse_failed'),
      normalizePolicyEvaluation,
    );

    return {
      regulationsOutput: analysis,
    };
  }

  private buildQuery(state: AgentState): string {
    const extracted = state.extractedData ?? {};
    const history = state.historyOutput ?? {};

    const parts = [
      extracted.reasonCategory ?? extracted.motivoAusencia,
      extracted.documentType ?? extracted.tipoDocumento,
      extracted.diagnosis ?? extracted.diagnostico,
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

function fallbackPolicyEvaluation(reason: string): PolicyEvaluation {
  return {
    available: false,
    reason,
    article: null,
    score: 0,
    requiredDocuments: [],
    providedDocuments: [],
    missingDocuments: [],
    keyRulesSummary: [],
    matchedRules: [],
    expectedOutcome: 'needs_review',
    compliant: false,
    reasoning:
      'No se pudo evaluar automaticamente el reglamento para este caso.',
    confidence: 0,
  };
}

function normalizePolicyEvaluation(value: unknown): PolicyEvaluation {
  const data =
    typeof value === 'object' && value !== null
      ? (value as Record<string, unknown>)
      : {};
  const article = normalizeArticle(data.article);
  const score = clamp(asNumber(data.score, 0));
  const missingDocuments = asStringArray(data.missingDocuments);
  const requiredDocuments = asStringArray(data.requiredDocuments);
  const expectedOutcome = normalizeExpectedOutcome(data.expectedOutcome);

  return {
    available: true,
    article,
    score,
    requiredDocuments,
    providedDocuments: asStringArray(data.providedDocuments),
    missingDocuments,
    keyRulesSummary: asStringArray(data.keyRulesSummary),
    matchedRules: normalizeMatchedRules(data.matchedRules),
    expectedOutcome,
    compliant: asBoolean(
      data.compliant,
      score >= 0.75 && missingDocuments.length === 0,
    ),
    reasoning: asString(data.reasoning, 'Reglamento evaluado.'),
    confidence: clamp(asNumber(data.confidence, score)),
  };
}

function normalizeArticle(value: unknown): PolicyEvaluation['article'] {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const data = value as Record<string, unknown>;
  const articleNumber = asString(data.articleNumber);
  if (!articleNumber) {
    return null;
  }
  return {
    articleId: asNumber(data.articleId, 0),
    articleNumber,
    title: asString(data.title),
    category: asString(data.category),
  };
}

function normalizeMatchedRules(
  value: unknown,
): PolicyEvaluation['matchedRules'] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter(
      (item): item is Record<string, unknown> =>
        typeof item === 'object' && item !== null,
    )
    .map((item) => ({
      articleNumber: asString(item.articleNumber),
      title: asString(item.title),
      score: clamp(asNumber(item.score, 0)),
    }))
    .filter((item) => item.articleNumber.length > 0);
}

function normalizeExpectedOutcome(
  value: unknown,
): PolicyEvaluation['expectedOutcome'] {
  if (
    value === 'likely_approved' ||
    value === 'likely_rejected' ||
    value === 'needs_review'
  ) {
    return value;
  }
  return 'needs_review';
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}
