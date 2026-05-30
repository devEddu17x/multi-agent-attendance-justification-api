import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QdrantClient } from '@qdrant/js-client-rest';

@Injectable()
export class QdrantService {
  private readonly logger = new Logger(QdrantService.name);
  private qdrantClient: QdrantClient;
  private qdrantUrl: string;
  private qdrantApiKey: string;

  constructor(private readonly configService: ConfigService) {
    const qdrantConfig = configService.get('qdrant');
    this.qdrantUrl = qdrantConfig.url;
    this.qdrantApiKey = qdrantConfig.apiKey;
    this.qdrantClient = new QdrantClient({
      url: this.qdrantUrl,
      apiKey: this.qdrantApiKey,
      https: false,
      checkCompatibility: false,
    });
  }

  async search(
    collectionName: string,
    vector: number[],
    limit = 5,
    filter?: Record<string, unknown>,
  ) {
    return this.qdrantClient.search(collectionName, {
      vector,
      limit,
      filter: filter as any,
      with_payload: true,
    });
  }

  async scroll(
    collectionName: string,
    limit = 100,
    filter?: Record<string, unknown>,
  ) {
    return this.qdrantClient.scroll(collectionName, {
      limit,
      filter: filter as any,
      with_payload: true,
      with_vector: false,
    });
  }

  async retrieve(collectionName: string, ids: (string | number)[]) {
    return this.qdrantClient.retrieve(collectionName, {
      ids,
      with_payload: true,
    });
  }

  async count(
    collectionName: string,
    filter?: Record<string, unknown>,
  ) {
    return this.qdrantClient.count(collectionName, {
      filter: filter as any,
    });
  }

  async getCollection(collectionName: string) {
    return this.qdrantClient.getCollection(collectionName);
  }

  async getCollections() {
    return this.qdrantClient.getCollections();
  }
}
