export function parseLlmJson<T>(
  raw: unknown,
  fallback: T,
  normalize?: (value: unknown) => T,
): T {
  try {
    const content = extractText(raw);
    const clean = content
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
    const parsed = JSON.parse(clean) as unknown;
    return normalize ? normalize(parsed) : (parsed as T);
  } catch {
    return fallback;
  }
}

export function extractText(raw: unknown): string {
  if (typeof raw === 'string') {
    return raw;
  }

  if (Array.isArray(raw)) {
    const textBlock = raw.find(
      (block): block is { type: string; text: string } =>
        typeof block === 'object' &&
        block !== null &&
        'type' in block &&
        'text' in block &&
        (block as { type?: unknown }).type === 'text' &&
        typeof (block as { text?: unknown }).text === 'string',
    );
    return textBlock?.text ?? JSON.stringify(raw);
  }

  return JSON.stringify(raw);
}

export function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === 'string');
}

export function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

export function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

export function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}
