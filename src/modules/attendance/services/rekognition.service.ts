import {
  Injectable,
  InternalServerErrorException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  RekognitionClient,
  IndexFacesCommand,
  SearchFacesByImageCommand,
} from '@aws-sdk/client-rekognition';
import type { RekognitionSearchResult } from '../interfaces/rekognition-result.interface';

@Injectable()
export class RekognitionService {
  private readonly logger = new Logger(RekognitionService.name);
  private readonly rekognitionClient: RekognitionClient;
  private readonly collectionId: string;

  constructor(private readonly configService: ConfigService) {
    const region = this.configService.get<string>('rekognition.region');
    this.collectionId = this.configService.get<string>(
      'rekognition.collectionId',
    )!;

    this.rekognitionClient = new RekognitionClient({
      region,
    });
  }

  async registerFace(photo: Express.Multer.File): Promise<string> {
    try {
      const command = new IndexFacesCommand({
        CollectionId: this.collectionId,
        Image: { Bytes: photo.buffer },
        MaxFaces: 1,
        QualityFilter: 'AUTO',
        DetectionAttributes: ['DEFAULT'],
      });

      const response = await this.rekognitionClient.send(command);
      if (!response.FaceRecords || response.FaceRecords.length === 0) {
        throw new Error('No face detected in the given image');
      }

      const faceId = response.FaceRecords[0].Face?.FaceId;
      if (!faceId) {
        throw new Error('FaceId missing from AWS response');
      }

      return faceId;
    } catch (error) {
      this.logger.error('Failed to register face with AWS Rekognition', error);
      throw new InternalServerErrorException(
        'Failed to process image with Rekognition',
      );
    }
  }

  async searchFace(
    photo: Express.Multer.File,
  ): Promise<RekognitionSearchResult> {
    try {
      const command = new SearchFacesByImageCommand({
        CollectionId: this.collectionId,
        Image: { Bytes: photo.buffer },
        MaxFaces: 1,
        FaceMatchThreshold: 90,
      });

      const response = await this.rekognitionClient.send(command);
      if (
        !response.FaceMatches ||
        response.FaceMatches.length === 0 ||
        !response.FaceMatches[0].Similarity
      ) {
        throw new Error('No matching face found in the collection');
      }

      const matchedFaceId = response.FaceMatches[0].Face?.FaceId;
      if (!matchedFaceId) {
        throw new Error('Matched FaceId missing from AWS response');
      }

      const similarity = response.FaceMatches[0].Similarity;

      return {
        faceId: matchedFaceId,
        confidenceScore: similarity,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException('No match found for the given face');
      }
      this.logger.error('Failed to search face with AWS Rekognition', error);
      throw new InternalServerErrorException(
        'Failed to search image with Rekognition',
      );
    }
  }
}
