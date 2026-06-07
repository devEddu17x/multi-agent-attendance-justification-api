export interface RegulationsAnalysis {
  article: {
    articleId: number;
    articleNumber: string;
    title: string;
    category: string;
  } | null;
  score: number;
  requiredDocuments: string[];
  keyRulesSummary: string[];
  matchedRules: { articleNumber: string; title: string; score: number }[];
  expectedOutcome: 'likely_approved' | 'likely_rejected' | 'needs_review';
  reasoning: string;
}
