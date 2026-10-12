import { Logger, UsePipes, ValidationPipe } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { IUser } from '@common/interfaces/user.interface';
import { withNeighbours } from '@common/utils/geo/grid';
import { AuthService } from '@modules/auth/auth.service';
import { LocationDto } from './dto/location.dto';
import { NearbyDto } from './dto/nearby.dto';
import { LocationsService } from './locations.service';

interface SocketData {
  user: IUser;
  skinFileId: string | null;
  bboxId?: string;
}

type DeviceSocket = Socket<any, any, any, SocketData>;

const userRoom = (userId: string) => `user:${userId}`;

@WebSocketGateway({ cors: { origin: true } })
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    exceptionFactory: (errors) =>
      new WsException(
        errors.flatMap((e) => Object.values(e.constraints ?? {})).join('; '),
      ),
  }),
)
export class LocationsGateway implements OnGatewayInit, OnGatewayDisconnect {
  private readonly logger = new Logger(LocationsGateway.name);

  @WebSocketServer()
  private readonly server!: Server;

  constructor(
    private readonly auth: AuthService,
    private readonly locations: LocationsService,
  ) {}

  afterInit(server: Server) {
    // Access token goes in `auth.token` of the handshake (or a Bearer header)
    server.use((socket: DeviceSocket, next) => {
      const header = socket.handshake.headers.authorization;
      const token =
        (socket.handshake.auth as { token?: string }).token ??
        header?.replace(/^Bearer /, '');
      this.auth
        .verifyAccessToken(token ?? '')
        .then(async (user) => {
          socket.data.user = user;
          socket.data.skinFileId = await this.locations.skinFileIdOf(user.id);
          await socket.join(userRoom(user.id));
          next();
        })
        .catch(() => next(new Error('Unauthorized')));
    });
  }

  /**
   * Saves the position, keeps the socket in the room of its bbox and tells
   * devices in that bbox and the ones around it.
   */
  @SubscribeMessage('location')
  async onLocation(
    @ConnectedSocket() client: DeviceSocket,
    @MessageBody() dto: LocationDto,
  ) {
    const { user, skinFileId, bboxId: previous } = client.data;
    const { bboxId, heading, ts } = await this.locations.upsert(
      user,
      dto.lat,
      dto.long,
      skinFileId,
    );

    if (previous !== bboxId) {
      if (previous) await client.leave(previous);
      await client.join(bboxId);
      client.data.bboxId = bboxId;
    }

    client
      .to(withNeighbours(bboxId, this.locations.cellDeg))
      .except(userRoom(user.id))
      .emit('location', {
        userId: user.id,
        username: user.username,
        skinFileId,
        lat: dto.lat,
        long: dto.long,
        heading,
        bboxId,
        updatedAt: ts,
      });

    return { bboxId };
  }

  @SubscribeMessage('nearby')
  async onNearby(
    @ConnectedSocket() client: DeviceSocket,
    @MessageBody() dto: NearbyDto = {},
  ) {
    const devices = await this.locations.nearby(
      client.data.user.id,
      dto.radius,
    );
    if (!devices) throw new WsException('Send a location first');
    return { devices };
  }

  /** The user picked another skin: their next location update carries it. */
  async setSkin(userId: string, skinFileId: string | null) {
    const sockets = await this.server.in(userRoom(userId)).fetchSockets();
    for (const socket of sockets) {
      (socket.data as SocketData).skinFileId = skinFileId;
    }
  }

  async handleDisconnect(client: DeviceSocket) {
    const user = client.data.user;
    // the same user may still be connected from another socket
    if (!user || this.server.sockets.adapter.rooms.has(userRoom(user.id))) {
      return;
    }
    try {
      const bboxId = await this.locations.remove(user.id);
      if (bboxId) {
        this.server
          .to(withNeighbours(bboxId, this.locations.cellDeg))
          .emit('left', { userId: user.id });
      }
    } catch (e) {
      this.logger.error(`Failed to remove ${user.id}`, e);
    }
  }
}
