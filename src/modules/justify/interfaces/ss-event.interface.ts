export interface SseEvent {
  event: string;
  data: Record<string, unknown>;
}
