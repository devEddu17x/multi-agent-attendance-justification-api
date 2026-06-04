import { Injectable } from '@nestjs/common';
import { AgentState } from '../interfaces/agent-state.interface';
import { AttendanceRulePayload } from '../../common/interfaces/attendance-rule.interface';
import { QdrantService } from '../../modules/qdrant/qdrant.service';

@Injectable()
export class RegulationsAgentService {
  private readonly collectionName = 'attendance_rules';
  private readonly embeddingModel = 'gemini-embedding-2';
  private readonly embeddingApiUrl =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent';

  constructor(private readonly qdrantService: QdrantService) {}

  private static readonly EMPTY_CANDIDATE = {
    payload: undefined,
    score: 0,
  };

  async execute(state: AgentState): Promise<Partial<AgentState>> {
    const query = this.buildRegulationQuery(state);
    if (!query) {
      return {
        regulationsOutput: {
          available: false,
          reason: 'empty_regulation_query',
          article: null,
          score: 0,
          requiredDocuments: [],
        },
        nextAgent: 'communicator',
      };
    }

    try {
      const embedding = await this.embedText(query);
      if (!embedding.length) {
        return {
          regulationsOutput: {
            available: false,
            reason: 'embedding_not_available',
            article: null,
            score: 0,
            requiredDocuments: [],
          },
          nextAgent: 'communicator',
        };
      }

      const points = await this.qdrantService.search(
        this.collectionName,
        embedding,
        5,
      );

      const candidates = points
        .map((point: unknown) => {
          if (!point || typeof point !== 'object') {
            return RegulationsAgentService.EMPTY_CANDIDATE;
          }

          const qdrantPoint = point as { payload?: unknown; score?: unknown };
          return {
            payload: qdrantPoint.payload,
            score:
              typeof qdrantPoint.score === 'number' ? qdrantPoint.score : 0,
          };
        })
        .filter(
          (item): item is { payload: AttendanceRulePayload; score: number } =>
            this.isAttendanceRulePayload(item.payload),
        );

      const bestMatch = candidates.length ? candidates[0] : null;
      if (!bestMatch) {
        return {
          regulationsOutput: {
            available: false,
            reason: 'no_rules_found',
            article: null,
            score: 0,
            requiredDocuments: [],
          },
          nextAgent: 'communicator',
        };
      }

      const requiredDocuments = this.extractRequiredDocuments(
        bestMatch.payload.business_rules,
      );

      return {
        regulationsOutput: {
          available: true,
          article: {
            articleId: bestMatch.payload.article_id,
            articleNumber: bestMatch.payload.article_number,
            title: bestMatch.payload.title,
            category: bestMatch.payload.category,
          },
          score: Number(bestMatch.score.toFixed(3)),
          requiredDocuments,
          keyRulesSummary: this.extractKeySummary(
            bestMatch.payload.business_rules,
          ),
          matchedRules: candidates.slice(0, 3).map((item) => ({
            articleNumber: item.payload.article_number,
            title: item.payload.title,
            score: Number(item.score.toFixed(3)),
          })),
        },
        nextAgent: 'communicator',
      };
    } catch {
      return {
        regulationsOutput: {
          available: false,
          reason: 'regulations_query_failed',
          article: null,
          score: 0,
          requiredDocuments: [],
        },
        nextAgent: 'communicator',
      };
    }
  }

  private buildRegulationQuery(state: AgentState): string {
    const latestMessage = this.getLatestMessageText(state);
    const extracted = state.extractedData
      ? JSON.stringify(state.extractedData)
      : '';
    const history = state.historyOutput
      ? JSON.stringify(state.historyOutput)
      : '';

    return `${latestMessage}\n${extracted}\n${history}`.trim();
  }

  private getLatestMessageText(state: AgentState): string {
    const messages = state.messages || [];
    if (!messages.length) {
      return '';
    }

    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];
      const content =
        message && typeof message === 'object' && 'content' in message
          ? (message as { content?: unknown }).content
          : undefined;
      const text = this.normalizeContentToText(content);
      if (text) {
        return text;
      }
    }

    return '';
  }

  private normalizeContentToText(content: unknown): string {
    if (typeof content === 'string') {
      return content;
    }

    if (Array.isArray(content)) {
      return content
        .map((item) => {
          if (typeof item === 'string') {
            return item;
          }
          if (item && typeof item === 'object' && 'text' in item) {
            const value = (item as { text?: unknown }).text;
            return typeof value === 'string' ? value : '';
          }
          return '';
        })
        .filter(Boolean)
        .join(' ')
        .trim();
    }

    if (content && typeof content === 'object' && 'text' in content) {
      const text = (content as { text?: unknown }).text;
      return typeof text === 'string' ? text : '';
    }

    return '';
  }

  private async embedText(text: string): Promise<number[]> {
    const apiKey =
      process.env.GOOGLE_EMBEEDINGS_MODEL_API_KEY ||
      process.env.GOOGLE_EMBEDDINGS_MODEL_API_KEY;

    if (!apiKey || !text.trim()) {
      return [];
    }

    try {
      const response = await fetch(`${this.embeddingApiUrl}?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: `models/${this.embeddingModel}`,
          content: {
            parts: [{ text }],
          },
        }),
      });

      if (!response.ok) {
        return [];
      }

      const data = (await response.json()) as {
        embedding?: { values?: number[] };
      };

      return Array.isArray(data.embedding?.values) ? data.embedding.values : [];
    } catch {
      return [];
    }
  }

  private isAttendanceRulePayload(
    payload: unknown,
  ): payload is AttendanceRulePayload {
    if (!payload || typeof payload !== 'object') {
      return false;
    }

    const item = payload as Partial<AttendanceRulePayload>;
    return (
      typeof item.article_id === 'number' &&
      typeof item.article_number === 'string' &&
      typeof item.title === 'string' &&
      typeof item.category === 'string' &&
      typeof item.full_text === 'string' &&
      !!item.business_rules &&
      typeof item.business_rules === 'object'
    );
  }

  private extractRequiredDocuments(
    businessRules: Record<string, unknown>,
  ): string[] {
    const documents = new Set<string>();
    const docKeys = [
      'required_document',
      'required_documents',
      'single_day_required_doc',
      'multi_day_required_docs',
      'private_event_required_docs',
    ];

    for (const key of docKeys) {
      const value = businessRules[key];
      if (typeof value === 'string' && value.trim()) {
        documents.add(value);
      }
      if (Array.isArray(value)) {
        for (const item of value) {
          if (typeof item === 'string' && item.trim()) {
            documents.add(item);
          }
        }
      }
    }

    return Array.from(documents);
  }

  private extractKeySummary(businessRules: Record<string, unknown>): string[] {
    const value = businessRules.key_rules_summary;
    if (!Array.isArray(value)) {
      return [];
    }

    return value.filter((item): item is string => typeof item === 'string');
  }
}
