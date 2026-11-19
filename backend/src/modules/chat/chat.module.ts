import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';

@Module({
  controllers: [ChatController],
  providers: [ChatGateway, ChatService],
  // Los tratos publican avisos en la conversación y los emiten por el mismo socket.
  exports: [ChatGateway, ChatService],
})
export class ChatModule {}
