import { registerAs } from '@nestjs/config';

export default registerAs('storage', () => {
  const {
    BUCKET_NAME,
    BUCKET_REGION,
    BUCKET_REGIONAL_DOMAIN_NAME,
    STORAGE_ACCESS_KEY_ID,
    STORAGE_SECRET_ACCESS_KEY,
  } = process.env;

  const missingVars = [
    ['BUCKET_NAME', BUCKET_NAME],
    ['BUCKET_REGION', BUCKET_REGION],
    ['BUCKET_REGIONAL_DOMAIN_NAME', BUCKET_REGIONAL_DOMAIN_NAME],
    ['STORAGE_ACCESS_KEY_ID', STORAGE_ACCESS_KEY_ID],
    ['STORAGE_SECRET_ACCESS_KEY', STORAGE_SECRET_ACCESS_KEY],
  ]
    .filter(
      ([, value]) => typeof value !== 'string' || value.trim().length === 0,
    )
    .map(([name]) => name);

  if (missingVars.length) {
    throw new Error(`Missing required S3 env vars: ${missingVars.join(', ')}`);
  }

  const credentials =
    STORAGE_ACCESS_KEY_ID && STORAGE_SECRET_ACCESS_KEY
      ? {
          accessKeyId: STORAGE_ACCESS_KEY_ID,
          secretAccessKey: STORAGE_SECRET_ACCESS_KEY,
        }
      : undefined;

  return {
    config: {
      region: BUCKET_REGION,
      ...(credentials && { credentials }),
    },
    bucket: BUCKET_NAME,
    baseUrl: `https://${BUCKET_REGIONAL_DOMAIN_NAME}`,
  };
});
