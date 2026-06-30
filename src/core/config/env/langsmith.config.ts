import { registerAs } from '@nestjs/config';

export default registerAs('langsmith', () => {
  const {
    LANGSMITH_TRACING,
    LANGSMITH_API_KEY,
    LANGSMITH_PROJECT,
    LANGSMITH_ENDPOINT,
  } = process.env;
  const missingVars = [
    ['LANGSMITH_TRACING', LANGSMITH_TRACING],
    ['LANGSMITH_API_KEY', LANGSMITH_API_KEY],
    ['LANGSMITH_PROJECT', LANGSMITH_PROJECT],
    ['LANGSMITH_ENDPOINT', LANGSMITH_ENDPOINT],
  ]
    .filter(
      ([, value]) => typeof value !== 'string' || value.trim().length === 0,
    )
    .map(([name]) => name);

  if (missingVars.length) {
    throw new Error(
      `Missing required Langsmith env vars: ${missingVars.join(', ')}`,
    );
  }

  const tracingEnabled = LANGSMITH_TRACING === 'true';
  return {
    tracingEnabled,
    apiKey: LANGSMITH_API_KEY,
    project: LANGSMITH_PROJECT,
    endpoint: LANGSMITH_ENDPOINT,
  };
});
