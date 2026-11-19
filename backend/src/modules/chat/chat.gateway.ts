import { HttpException, Logger, UsePipes, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import type { Namespace, Socket } from 'socket.io';
import { extractBearer, isSuspended, verifyAccessToken } from '../auth/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthUser } from '../auth/jwt-payload';
import { ChatService } from './chat.service';
import { ConversationRefDto, SendMessageDto } from './dto/chat.dto';

type AuthedSocket = Socket & { data: { user: AuthUser } };

/** Cada usuario escucha en su propia sala; así recibe los mensajes de todas sus conversaciones. */
const userRoom = (userId: string) => `user:${userId}`;

/**
 * Chat de negociación entre vecinos.
 *
 * Cliente:
 *   io(`${API}/chat`, { auth: { token } })
 *   socket.emit('message:send', { conversationId, body }, (ack) => …)
 *   socket.on('message:new', (msg) => …)
 *   socket.on('exception', (err) => …)
 *
 * Solo viajan userIds y texto; nunca email/teléfono.
 * Pendiente: cerrar sockets cuando expire el token (hoy siguen vivos hasta desconectarse).
 */
@WebSocketGateway({
  namespace: '/chat',
  // El socket se autentica con token (no cookies), así que CORS no es la barrera de seguridad aquí.
  cors: { origin: true },
})
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    stopAtFirstError: true,
    transform: true,
    exceptionFactory: (errors) =>
      new WsException(errors.flatMap((e) => Object.values(e.constraints ?? {})).join('; ')),
  }),
)
export class ChatGateway implements OnGatewayInit, OnGatewayConnection {
  private readonly logger = new Logger(ChatGateway.name);

  @WebSocketServer()
  private readonly server: Namespace;

  constructor(
    private readonly jwt: JwtService,
    private readonly chat: ChatService,
    private readonly prisma: PrismaService,
  ) {}

  /** Middleware de handshake: sin JWT válido la conexión se rechaza (`connect_error` en el cliente). */
  afterInit(nsp: Namespace) {
    nsp.use(async (socket, next) => {
      const token =
        (socket.handshake.auth?.token as string | undefined) ??
        extractBearer(socket.handshake.headers.authorization);
      if (!token) return next(new Error('Falta el token de acceso'));

      try {
        const user = await verifyAccessToken(this.jwt, token, { allowSocket: true });
        if (await isSuspended(this.prisma, user.id)) return next(new Error('Cuenta suspendida'));
        socket.data.user = user;
        next();
      } catch {
        next(new Error('Token inválido o expirado'));
      }
    });
  }

  async handleConnection(client: AuthedSocket) {
    await client.join(userRoom(client.data.user.id));
    this.logger.debug(`Vecino ${client.data.user.id} conectado (${client.id})`);
  }

  /** Para otros módulos (tratos): emite un evento a todas las pestañas de estos vecinos. */
  notify(userIds: string[], event: string, payload: unknown) {
    if (userIds.length) this.server.to(userIds.map(userRoom)).emit(event, payload);
  }

  @SubscribeMessage('message:send')
  async send(@ConnectedSocket() client: AuthedSocket, @MessageBody() dto: SendMessageDto) {
    try {
      const { message, recipientIds } = await this.chat.saveMessage(
        dto.conversationId,
        client.data.user.id,
        dto.body,
      );
      this.server.to(recipientIds.map(userRoom)).emit('message:new', message);
      return message;
    } catch (e) {
      // Nest solo reenvía al cliente WsException; el resto sale como "Internal server error".
      if (e instanceof HttpException) throw new WsException(e.message);
      throw e;
    }
  }

  /** El vecino tiene la conversación abierta: marca como leído lo recibido hasta ahora. */
  @SubscribeMessage('conversation:read')
  async read(@ConnectedSocket() client: AuthedSocket, @MessageBody() dto: ConversationRefDto) {
    try {
      await this.chat.markRead(dto.conversationId, client.data.user.id);
      return { ok: true };
    } catch (e) {
      if (e instanceof HttpException) throw new WsException(e.message);
      throw e;
    }
  }
}
