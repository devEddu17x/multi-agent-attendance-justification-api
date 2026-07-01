import { QdrantClient } from '@qdrant/js-client-rest';
import type { AttendanceRulePoint } from '../src/common/interfaces/attendance-rule.interface';
import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

const requiredEnvVars = [
  'QDRANT__SERVICE__URL',
  'QDRANT__SERVICE__API_KEY',
  'GOOGLE_EMBEEDINGS_MODEL_API_KEY',
] as const;

const EMBEDDING_MODEL = 'gemini-embedding-2';
const EMBEDDING_DIM = 3072;
const EMBEDDING_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent`;

function loadEnv() {
  const envFile = process.env.SEED_ENV_FILE || '.env.seed';
  try {
    config({ path: envFile });
  } catch (error) {
    console.log(
      `[Warning] Could not load ${envFile}, falling back to process.env. Error:`,
      error,
    );
  }

  const missing = requiredEnvVars.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }
}

async function embedText(text: string, apiKey: string): Promise<number[]> {
  const response = await fetch(`${EMBEDDING_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: `models/${EMBEDDING_MODEL}`,
      content: { parts: [{ text }] },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Embedding API error ${response.status}: ${errorBody}`);
  }

  const data = (await response.json()) as unknown as {
    embedding?: { values: number[] };
  };

  if (!data.embedding?.values?.length) {
    console.error(
      '[Embedding] Unexpected response:',
      JSON.stringify(data).slice(0, 500),
    );
    throw new Error('Embedding API returned no values');
  }

  console.log(`    → ${data.embedding.values.length} dimensions`);

  return data.embedding.values;
}

async function main() {
  loadEnv();

  console.log('[Qdrant Seed] Starting...');

  const {
    QDRANT__SERVICE__URL,
    QDRANT__SERVICE__API_KEY,
    GOOGLE_EMBEEDINGS_MODEL_API_KEY,
  } = process.env;
  const COLLECTION_NAME = 'attendance_rules';
  const qdrantUrl = new URL(QDRANT__SERVICE__URL!);
  const qdrantPort = qdrantUrl.port
    ? Number(qdrantUrl.port)
    : qdrantUrl.protocol === 'https:'
      ? 443
      : 6333;

  const client = new QdrantClient({
    host: qdrantUrl.hostname,
    port: qdrantPort,
    https: qdrantUrl.protocol === 'https:',
    apiKey: QDRANT__SERVICE__API_KEY,
    checkCompatibility: false,
  });

  try {
    console.log('[Qdrant] Verifying connection...');
    const collections = await client.getCollections();
    console.log(
      `[Qdrant] Connected. Existing collections: ${collections.collections.length}`,
    );

    const exists = collections.collections.some(
      (c) => c.name === COLLECTION_NAME,
    );

    if (exists) {
      console.log(
        `[Qdrant] Collection '${COLLECTION_NAME}' already exists. Recreating to ensure clean state...`,
      );
      await client.deleteCollection(COLLECTION_NAME);
    }

    await client.createCollection(COLLECTION_NAME, {
      vectors: { size: EMBEDDING_DIM, distance: 'Cosine' },
    });
    console.log(
      `[Qdrant] Collection '${COLLECTION_NAME}' created (dim=${EMBEDDING_DIM}, model=${EMBEDDING_MODEL}, distance=Cosine)`,
    );

    const rules = JSON.parse(
      readFileSync(join(__dirname, 'data', 'attendance-rules.json'), 'utf-8'),
    ) as AttendanceRulePoint[];

    console.log(
      `[Embedding] Generating embeddings for ${rules.length} rules...`,
    );

    const points: {
      id: number;
      vector: number[];
      payload: AttendanceRulePoint['payload'];
    }[] = [];
    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i];
      console.log(
        `  [${i + 1}/${rules.length}] Embedding "${rule.payload.title}"...`,
      );
      const vector = await embedText(
        rule.payload.full_text,
        GOOGLE_EMBEEDINGS_MODEL_API_KEY!,
      );
      points.push({
        id: rule.id,
        vector,
        payload: rule.payload,
      });
    }

    console.log(`[Qdrant] Upserting ${points.length} points...`);
    const upsertResult = await client.upsert(COLLECTION_NAME, {
      wait: true,
      points,
    });
    console.log(`[Qdrant] Upsert result: ${JSON.stringify(upsertResult)}`);

    const count = await client.count(COLLECTION_NAME);
    console.log(
      `[Qdrant] Collection '${COLLECTION_NAME}' now has ${count.count} points`,
    );

    console.log('[Qdrant Seed] Completed successfully!');
  } catch (error: any) {
    console.error('[Qdrant Seed] Failed:', error);
    if (error?.data) {
      console.error(
        '[Qdrant Seed] Error details:',
        JSON.stringify(error.data, null, 2),
      );
    }
    process.exit(1);
  }
}

main();
