export interface AttendanceRulePayload {
  article_id: number;
  article_number: string;
  title: string;
  category: string;
  full_text: string;
  business_rules: Record<string, unknown>;
  [key: string]: unknown;
}

export interface AttendanceRulePoint {
  id: number;
  vector: number[];
  payload: AttendanceRulePayload;
}
