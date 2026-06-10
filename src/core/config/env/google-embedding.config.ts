import { registerAs } from '@nestjs/config';

export default registerAs('googleEmbeddings', () => {
  const { GOOGLE_EMBEEDINGS_MODEL_API_KEY, GOOGLE_EMBEEDINGS_MODEL } =
    process.env;

  const missingVars = [
    ['GOOGLE_EMBEEDINGS_MODEL_API_KEY', GOOGLE_EMBEEDINGS_MODEL_API_KEY],
    ['GOOGLE_EMBEEDINGS_MODEL', GOOGLE_EMBEEDINGS_MODEL],
  ]
    .filter(
      ([, value]) => typeof value !== 'string' || value.trim().length === 0,
    )
    .map(([name]) => name);

  if (missingVars.length) {
    throw new Error(
      `Missing required Google Embeddings env vars: ${missingVars.join(', ')}`,
    );
  }

  return {
    apiKey: GOOGLE_EMBEEDINGS_MODEL_API_KEY,
    model: GOOGLE_EMBEEDINGS_MODEL,
  };
});
