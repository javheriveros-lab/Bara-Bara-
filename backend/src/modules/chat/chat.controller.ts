import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ParseObjectIdPipe } from '../../common/validation/parse-object-id.pipe';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthUser } from '../auth/jwt-payload';
import { ChatService } from './chat.service';
import { ListMessagesQuery, StartConversationDto } from './dto/chat.dto';

/** REST complementario al socket: abrir conversaciones y cargar historial. */
@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Post()
  start(@CurrentUser() user: AuthUser, @Body() dto: StartConversationDto) {
    return this.chat.startConversation(user.id, dto);
  }

  @Get()
  listMine(@CurrentUser() user: AuthUser) {
    return this.chat.listMine(user.id);
  }

  // Antes de ':id' para que no lo capture el ParseObjectIdPipe.
  @Get('unread-count')
  unreadCount(@CurrentUser() user: AuthUser) {
    return this.chat.unreadCount(user.id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id', ParseObjectIdPipe) id: string) {
    return this.chat.getConversation(id, user.id);
  }

  @Get(':id/messages')
  messages(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseObjectIdPipe) id: string,
    @Query() query: ListMessagesQuery,
  ) {
    return this.chat.listMessages(id, user.id, query);
  }
}
