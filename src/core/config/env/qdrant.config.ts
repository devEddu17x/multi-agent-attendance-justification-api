import { registerAs } from '@nestjs/config';

export default registerAs('qdrant', () => {
  const { QDRANT__SERVICE__URL, QDRANT__SERVICE__API_KEY } = process.env;

  const missingVars = [
    ['QDRANT__SERVICE__URL', QDRANT__SERVICE__URL],
    ['QDRANT__SERVICE__API_KEY', QDRANT__SERVICE__API_KEY],
  ]
    .filter(
      ([, value]) => typeof value !== 'string' || value.trim().length === 0,
    )
    .map(([name]) => name);

  if (missingVars.length) {
    throw new Error(
      `Missing required Qdrant env vars: ${missingVars.join(', ')}`,
    );
  }

  return {
    url: QDRANT__SERVICE__URL,
    apiKey: QDRANT__SERVICE__API_KEY,
  };
});
