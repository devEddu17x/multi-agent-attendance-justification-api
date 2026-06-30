import { Injectable, Logger } from '@nestjs/common';
import { LlmService } from './llm.service';
import { AgentState } from '../interfaces/agent-state.interface';
import { AnthropicContentBlock } from '../interfaces/anthropic-content-block.interface';
import { EXTRACTOR_SYSTEM_PROMPT } from '../prompts/extractor-system.prompt';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ExtractedEvidence } from '../interfaces/justification-workflow.interface';
import {
  asBoolean,
  asNumber,
  asString,
  asStringArray,
  parseLlmJson,
} from '../utils/llm-json.util';

@Injectable()
export class ExtractorAgentService {
  private readonly logger = new Logger(ExtractorAgentService.name);

  constructor(private readonly llmService: LlmService) {}

  async execute(state: AgentState): Promise<Partial<AgentState>> {
    const text = state.messages
      .filter((message) => message.getType() === 'human')
      .slice(-4)
      .map((message) =>
        typeof message.content === 'string' ? message.content : '',
      )
      .filter((content) => content.trim().length > 0)
      .join('\n');
    this.logger.log(
      `[EXTRACTOR] Processing message: "${text.substring(0, 100)}...", attachments=${state.attachments?.length || 0}`,
    );

    let extracted: ExtractedEvidence;
    if (state.attachments?.length) {
      extracted = await this.extractFromAttachments(state.attachments, text);
    } else {
      // Even without attachments, extract intent from text
      extracted = await this.extractFromText(text);
    }

    // Track retry count to prevent infinite loops
    if (extracted.error === 'parse_failed') {
      const currentRetry = (state.extractedData?.retryCount || 0) as number;
      extracted.retryCount = currentRetry + 1;
      this.logger.warn(
        `[EXTRACTOR] Parse failed. Retry count: ${extracted.retryCount}`,
      );
    }

    this.logger.log(
      `[EXTRACTOR] Extracted data: dates=${extracted.absenceDates.length}, documentType=${extracted.documentType}, category=${extracted.reasonCategory}, error=${extracted.error ?? 'none'}`,
    );
    return { extractedData: extracted };
  }

  private async extractFromAttachments(
    attachments: AnthropicContentBlock[],
    text: string,
  ): Promise<ExtractedEvidence> {
    const model = this.llmService.getModel();
    const safeAttachments = attachments.map((attachment) => ({
      type: attachment.type,
      text: attachment.text,
      source: attachment.source,
    }));

    const messages = [
      new SystemMessage(EXTRACTOR_SYSTEM_PROMPT),
      new HumanMessage({
        content: [
          {
            type: 'text',
            text: `Fecha actual: ${currentDate()}\nMensaje del padre: "${text}"\n\nAnaliza el/los siguiente(s) documento(s) adjunto(s) y extrae la información solicitada.`,
          },
          ...(safeAttachments as any[]),
        ],
      }),
    ];

    const response = await model.invoke(messages);
    return parseLlmJson(
      response.content,
      fallbackExtractedEvidence('parse_failed', response.content),
      normalizeExtractedEvidence,
    );
  }

  private async extractFromText(text: string): Promise<ExtractedEvidence> {
    const model = this.llmService.getModel();

    const messages = [
      new SystemMessage(EXTRACTOR_SYSTEM_PROMPT),
      new HumanMessage({
        content: `Fecha actual: ${currentDate()}\nMensaje del padre: "${text}"\n\nExtrae la información solicitada del mensaje del padre. Si no hay fechas específicas, infiere el número de días del mensaje (ej. "faltó 1 día" → numDias: 1).`,
      }),
    ];

    const response = await model.invoke(messages);
    return parseLlmJson(
      response.content,
      fallbackExtractedEvidence('parse_failed', response.content),
      normalizeExtractedEvidence,
    );
  }
}

function currentDate(): string {
  return new Date().toISOString().split('T')[0];
}

function fallbackExtractedEvidence(
  error: string,
  rawContent?: unknown,
): ExtractedEvidence {
  return {
    available: false,
    absenceDates: [],
    absenceDays: null,
    reasonCategory: 'desconocido',
    documentType: 'ninguno',
    diagnosis: null,
    patientName: null,
    issuer: null,
    responsiblePerson: null,
    issuedAt: null,
    isLegible: false,
    isEvidenceValid: false,
    confidence: 0,
    observations: [
      rawContent === undefined
        ? 'No se pudo extraer informacion.'
        : `No se pudo parsear la respuesta del modelo: ${JSON.stringify(rawContent).slice(0, 200)}`,
    ],
    missingCriticalFields: ['absenceDates'],
    error,
  };
}

function normalizeExtractedEvidence(value: unknown): ExtractedEvidence {
  const data =
    typeof value === 'object' && value !== null
      ? (value as Record<string, unknown>)
      : {};
  const absenceDates = asStringArray(
    data.absenceDates ?? data.fechasAusencia,
  ).filter(isIsoDate);
  const rawDays = data.absenceDays ?? data.numDias;
  const absenceDays =
    rawDays === null || rawDays === undefined ? null : asNumber(rawDays, 0);
  const documentType = normalizeDocumentType(
    data.documentType ?? data.tipoDocumento,
  );
  const reasonCategory = normalizeReasonCategory(
    data.reasonCategory ?? data.motivoAusencia,
  );
  const missingCriticalFields: string[] = [];

  if (absenceDates.length === 0 && !absenceDays) {
    missingCriticalFields.push('absenceDates');
  }

  return {
    available: true,
    absenceDates,
    absenceDays: absenceDays && absenceDays > 0 ? absenceDays : null,
    reasonCategory,
    documentType,
    diagnosis: nullableString(data.diagnosis ?? data.diagnostico),
    patientName: nullableString(data.patientName ?? data.paciente),
    issuer: nullableString(data.issuer ?? data.institucionEmisora),
    responsiblePerson: nullableString(
      data.responsiblePerson ?? data.medicoOResponsable,
    ),
    issuedAt: nullableIsoDate(data.issuedAt ?? data.fechaEmision),
    isLegible: asBoolean(data.isLegible, true),
    isEvidenceValid: asBoolean(data.isEvidenceValid ?? data.esValido, true),
    confidence: clamp(asNumber(data.confidence, 0.7)),
    observations: asStringArray(data.observations ?? data.observaciones),
    missingCriticalFields,
    rawSummary: nullableString(data.rawSummary) ?? undefined,
  };
}

function nullableString(value: unknown): string | null {
  const text = asString(value).trim();
  return text.length > 0 ? text : null;
}

function nullableIsoDate(value: unknown): string | null {
  const text = nullableString(value);
  return text && isIsoDate(text) ? text : null;
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function normalizeReasonCategory(
  value: unknown,
): ExtractedEvidence['reasonCategory'] {
  const text = asString(value).toLowerCase();
  if (text.includes('salud') || text.includes('enfer')) return 'salud';
  if (text.includes('duelo') || text.includes('fallec')) return 'duelo';
  if (text.includes('tard')) return 'tardanza';
  if (text.includes('represent') || text.includes('convoc'))
    return 'representacion';
  if (text.includes('fuerza') || text.includes('mayor')) return 'fuerza_mayor';
  if (text.length > 0) return 'otro';
  return 'desconocido';
}

function normalizeDocumentType(
  value: unknown,
): ExtractedEvidence['documentType'] {
  const text = asString(value).toLowerCase().replace(/\s+/g, '_');
  if (text.includes('certificado')) return 'certificado_medico';
  if (text.includes('receta')) return 'receta';
  if (text.includes('constancia')) return 'constancia_atencion';
  if (text.includes('defunc')) return 'acta_defuncion';
  if (text.includes('convoc')) return 'carta_convocatoria';
  if (text.includes('foto') || text.includes('imagen')) return 'foto';
  if (text.includes('nota') && text.includes('med')) return 'nota_medica';
  if (text.includes('nota')) return 'nota_apoderado';
  if (text.includes('ninguno') || text.length === 0) return 'ninguno';
  return 'otro';
}
