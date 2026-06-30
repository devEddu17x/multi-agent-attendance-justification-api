import { registerAs } from '@nestjs/config';

export default registerAs('anthropic', () => {
  const { ANTHROPIC_API_KEY, ANTHROPIC_MODEL, ANTHROPIC_BASE_URL } =
    process.env;
  const missingVars = [
    ['ANTHROPIC_API_KEY', ANTHROPIC_API_KEY],
    ['ANTHROPIC_MODEL', ANTHROPIC_MODEL],
    ['ANTHROPIC_BASE_URL', ANTHROPIC_BASE_URL],
  ]
    .filter(
      ([, value]) => typeof value !== 'string' || value.trim().length === 0,
    )
    .map(([name]) => name);

  if (missingVars.length) {
    throw new Error(
      `Missing required Anthropic env vars: ${missingVars.join(', ')}`,
    );
  }
  return {
    apiKey: ANTHROPIC_API_KEY,
    model: ANTHROPIC_MODEL,
    baseUrl: ANTHROPIC_BASE_URL,
  };
});
