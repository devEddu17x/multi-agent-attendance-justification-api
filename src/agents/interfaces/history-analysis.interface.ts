export interface HistoryAnalysis {
  absenceCount: number;
  lateCount: number;
  excusedCount: number;
  unjustifiedAbsenceCount: number;
  maxConsecutiveAbsences: number;
  riskFlags: string[];
  patterns: string[];
  riskScore: number;
  justificationConfidence: number;
  summary: string;
}
