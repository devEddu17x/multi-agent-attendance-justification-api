export type AbsenceReasonCategory =
  | 'salud'
  | 'fuerza_mayor'
  | 'duelo'
  | 'tardanza'
  | 'representacion'
  | 'otro'
  | 'desconocido';

export type EvidenceDocumentType =
  | 'nota_apoderado'
  | 'certificado_medico'
  | 'receta'
  | 'constancia_atencion'
  | 'acta_defuncion'
  | 'carta_convocatoria'
  | 'foto'
  | 'nota_medica'
  | 'otro'
  | 'ninguno';

export interface ExtractedEvidence {
  [key: string]: unknown;
  available: boolean;
  absenceDates: string[];
  absenceDays: number | null;
  reasonCategory: AbsenceReasonCategory;
  documentType: EvidenceDocumentType;
  diagnosis: string | null;
  patientName: string | null;
  issuer: string | null;
  responsiblePerson: string | null;
  issuedAt: string | null;
  isLegible: boolean;
  isEvidenceValid: boolean;
  confidence: number;
  observations: string[];
  missingCriticalFields: string[];
  rawSummary?: string;
  error?: string;
  retryCount?: number;
}

export interface PolicyEvaluation {
  [key: string]: unknown;
  available: boolean;
  reason?: string;
  article: {
    articleId: number;
    articleNumber: string;
    title: string;
    category: string;
  } | null;
  score: number;
  requiredDocuments: string[];
  providedDocuments: string[];
  missingDocuments: string[];
  keyRulesSummary: string[];
  matchedRules: { articleNumber: string; title: string; score: number }[];
  expectedOutcome: 'likely_approved' | 'likely_rejected' | 'needs_review';
  compliant: boolean;
  reasoning: string;
  confidence: number;
}

export interface TransactionalDecision {
  [key: string]: unknown;
  verdict: 'AUTO_APPROVED' | 'PENDING_REVIEW' | 'REJECTED';
  reason: string;
  missingDocuments: string[];
  appliedArticle: string | null;
  sessionStatus: 'completed' | 'awaiting_documents' | 'cancelled';
  requiresHumanReview: boolean;
  decisionSource: 'rules' | 'llm' | 'hybrid';
}
