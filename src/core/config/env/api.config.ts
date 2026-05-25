import { registerAs } from '@nestjs/config';

export default registerAs('api', () => {
  const { API_PREFIX, API_PORT, API_VERSION } = process.env;
  const missingVars = [
    ['API_PREFIX', API_PREFIX],
    ['API_PORT', API_PORT],
    ['API_VERSION', API_VERSION],
  ]
    .filter(
      ([, value]) => typeof value !== 'string' || value.trim().length === 0,
    )
    .map(([name]) => name);

  if (missingVars.length) {
    throw new Error(`Missing required API env vars: ${missingVars.join(', ')}`);
  }
  if (API_PORT === undefined) {
    throw new Error(`API_PORT cannot be undefined`);
  }
  return {
    prefix: API_PREFIX || 'api',
    version: API_VERSION || '1',
    port: parseInt(API_PORT, 10) || 3000,
  };
});
