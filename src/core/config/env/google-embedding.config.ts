import { registerAs } from '@nestjs/config';

export default registerAs('googleEmbeddings', () => {
  const {
    GOOGLE_EMBEDDINGS_MODEL_API_KEY,
    GOOGLE_EMBEDDINGS_MODEL,
    GOOGLE_EMBEEDINGS_MODEL_API_KEY,
    GOOGLE_EMBEEDINGS_MODEL,
  } = process.env;
  const apiKey =
    GOOGLE_EMBEDDINGS_MODEL_API_KEY ?? GOOGLE_EMBEEDINGS_MODEL_API_KEY;
  const model = GOOGLE_EMBEDDINGS_MODEL ?? GOOGLE_EMBEEDINGS_MODEL;

  const missingVars = [
    ['GOOGLE_EMBEDDINGS_MODEL_API_KEY', apiKey],
    ['GOOGLE_EMBEDDINGS_MODEL', model],
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
    apiKey,
    model,
  };
});
