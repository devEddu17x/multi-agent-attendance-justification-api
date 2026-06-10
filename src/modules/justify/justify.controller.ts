import { Controller, Post, Body, Res, UseGuards, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { JustifyChatService } from './services/justify-chat.service';
import { JustifyStorageService } from './services/justify-storage.service';
import { ChatMessageDTO } from './dto/chat-message.dto';
import { PresignedUrlsDTO } from './dto/presigned-urls.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ROLES } from '../../common/enums/roles.enum';
import { SseEventService } from './services/sse-event.service';
import { ApiDocChat, ApiDocGetPresignedUrls } from './docs/justify.doc';
import type { User } from 'src/common/interfaces/user.interface';

@Controller('attendance/justify')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLES.PARENT)
export class JustifyController {
  private readonly logger = new Logger(JustifyController.name);
  constructor(
    private readonly justifyChatService: JustifyChatService,
    private readonly justifyStorageService: JustifyStorageService,
    private readonly sse: SseEventService,
  ) {}

  @ApiDocChat()
  @Post('chat')
  async chat(
    @Body() dto: ChatMessageDTO,
    @Res() res: Response,
    @CurrentUser() user: User,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      await this.justifyChatService.handleChat(dto, res, user);
    } catch (error: any) {
      this.logger.error('Error handling chat', error);
      this.sse.emitError(res, 'An error occurred');
    } finally {
      this.sse.close(res);
    }
  }

  @ApiDocGetPresignedUrls()
  @Post('presigned-urls')
  async getPresignedUrls(
    @Body() dto: PresignedUrlsDTO,
    @CurrentUser() user: User,
  ) {
    return this.justifyStorageService.getPresignedUrlsForJustification(
      dto.files,
      user.sub,
      dto.studentId,
    );
  }
}
