import { Injectable, Logger } from '@nestjs/common';
import { AgentState } from '../interfaces/agent-state.interface';
import { JustificationService } from '../../modules/justify/services/justification.service';
import { TransactionalDecision } from '../interfaces/justification-workflow.interface';
import { asNumber, asStringArray } from '../utils/llm-json.util';

@Injectable()
export class TransactionalAgentService {
  private readonly logger = new Logger(TransactionalAgentService.name);

  constructor(private readonly justificationService: JustificationService) {}

  async execute(state: AgentState): Promise<Partial<AgentState>> {
    this.logger.log(
      `[TRANSACTIONAL] Starting execution for session=${state.sessionId}`,
    );
    this.logger.log(
      `[TRANSACTIONAL] State: hasExtractedData=${!!state.extractedData}, hasRegulationsOutput=${!!state.regulationsOutput}`,
    );

    const decision = await this.decide(state);
    this.logger.log(`[TRANSACTIONAL] Decision: ${JSON.stringify(decision)}`);

    try {
      await this.justificationService.persist(state, decision);
      this.logger.log('[TRANSACTIONAL] persist() completed successfully');
    } catch (error) {
      this.logger.error(`[TRANSACTIONAL] persist() failed: ${error}`);
      throw error;
    }

    return {
      finalVerdict: {
        available: true,
        verdict: decision.verdict,
        reason: decision.reason,
        appliedArticle: decision.appliedArticle,
        missingDocuments: decision.missingDocuments,
        sessionStatus: decision.sessionStatus,
        requiresHumanReview: decision.requiresHumanReview,
        decisionSource: decision.decisionSource,
      },
    };
  }

  private async decide(state: AgentState): Promise<TransactionalDecision> {
    const extracted = (state.extractedData ?? {}) as Record<string, unknown>;
    const regulations = (state.regulationsOutput ?? {}) as Record<
      string,
      unknown
    >;
    const history = (state.historyOutput ?? {}) as Record<string, unknown>;
    const absenceDates = asStringArray(
      extracted.absenceDates ?? extracted.fechasAusencia,
    );
    const absenceDays =
      asNumber(extracted.absenceDays ?? extracted.numDias, 0) ||
      absenceDates.length;
    const missingDocuments = new Set(
      asStringArray(regulations.missingDocuments),
    );
    const riskFlags = asStringArray(history.riskFlags);
    const score = asNumber(regulations.score, 0);
    const compliant = regulations.compliant === true;
    const article = extractArticleNumber(regulations);
    const documentType = String(
      extracted.documentType ?? extracted.tipoDocumento ?? 'ninguno',
    );
    const reasonCategory = String(
      extracted.reasonCategory ?? extracted.motivoAusencia ?? 'desconocido',
    );

    if (absenceDates.length === 0 && absenceDays <= 0) {
      missingDocuments.add('fechas_de_ausencia');
    }

    applyKnownDocumentRules({
      absenceDays,
      reasonCategory,
      documentType,
      missingDocuments,
    });

    const hasCriticalRisk =
      riskFlags.includes('recurrent_unjustified_absences') ||
      riskFlags.includes('has_rejected_justifications');

    if (score === 0) {
      return {
        verdict: 'REJECTED',
        reason:
          'No se encontro una normativa aplicable para sustentar la justificacion.',
        missingDocuments: [...missingDocuments],
        appliedArticle: article,
        sessionStatus: 'cancelled',
        requiresHumanReview: false,
        decisionSource: 'rules',
      };
    }

    if (missingDocuments.size > 0) {
      return {
        verdict: 'PENDING_REVIEW',
        reason:
          'Falta informacion o documentacion necesaria para completar la evaluacion.',
        missingDocuments: [...missingDocuments],
        appliedArticle: article,
        sessionStatus: 'awaiting_documents',
        requiresHumanReview: true,
        decisionSource: 'rules',
      };
    }

    if (score >= 0.75 && compliant && !hasCriticalRisk) {
      return {
        verdict: 'AUTO_APPROVED',
        reason:
          'La solicitud cumple con la normativa aplicable y no presenta alertas criticas en el historial.',
        missingDocuments: [],
        appliedArticle: article,
        sessionStatus: 'completed',
        requiresHumanReview: false,
        decisionSource: 'rules',
      };
    }

    return {
      verdict: 'PENDING_REVIEW',
      reason: hasCriticalRisk
        ? 'El historial del estudiante requiere revision manual antes de aprobar.'
        : 'La solicitud requiere revision manual por confianza normativa insuficiente.',
      missingDocuments: [],
      appliedArticle: article,
      sessionStatus: 'completed',
      requiresHumanReview: true,
      decisionSource: 'rules',
    };
  }
}

function extractArticleNumber(
  regulations: Record<string, unknown>,
): string | null {
  const article = regulations.article;
  if (typeof article === 'object' && article !== null) {
    const articleNumber = (article as Record<string, unknown>).articleNumber;
    return typeof articleNumber === 'string' ? articleNumber : null;
  }
  const direct = regulations.articleNumber ?? regulations.appliedArticle;
  return typeof direct === 'string' ? direct : null;
}

function applyKnownDocumentRules(input: {
  absenceDays: number;
  reasonCategory: string;
  documentType: string;
  missingDocuments: Set<string>;
}): void {
  const { absenceDays, reasonCategory, documentType, missingDocuments } = input;

  if (reasonCategory !== 'salud') {
    return;
  }

  if (absenceDays <= 1) {
    missingDocuments.delete('nota_apoderado');
    return;
  }

  const validMedicalDocument = [
    'certificado_medico',
    'receta',
    'constancia_atencion',
    'nota_medica',
  ].includes(documentType);

  if (validMedicalDocument) {
    missingDocuments.delete('certificado_medico');
    missingDocuments.delete('receta');
    missingDocuments.delete('constancia_atencion');
    missingDocuments.delete('nota_medica');
  }
}
