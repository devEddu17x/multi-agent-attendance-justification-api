import { registerAs } from '@nestjs/config';

export default registerAs('rekognition', () => {
  const { AWS_REKOGNITION_REGION, AWS_REKOGNITION_COLLECTION_ID } = process.env;

  const missingVars = [
    ['AWS_REKOGNITION_REGION', AWS_REKOGNITION_REGION],
    ['AWS_REKOGNITION_COLLECTION_ID', AWS_REKOGNITION_COLLECTION_ID],
  ]
    .filter(
      ([, value]) => typeof value !== 'string' || value.trim().length === 0,
    )
    .map(([name]) => name);

  if (missingVars.length) {
    throw new Error(
      `Missing required Rekognition env vars: ${missingVars.join(', ')}`,
    );
  }

  return {
    region: AWS_REKOGNITION_REGION,
    collectionId: AWS_REKOGNITION_COLLECTION_ID,
  };
});
