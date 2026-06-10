export interface HistoryAnalysis {
  available: boolean;
  reason?: string;
  riskFlags: string[];
  patterns: string[];
  riskScore: number;
  justificationConfidence: number;
  summary: string;
}
