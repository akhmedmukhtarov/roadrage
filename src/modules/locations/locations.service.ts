import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IUser } from '@common/interfaces/user.interface';
import { Database } from '@common/services/database/database.service';
import { RedisService } from '@common/services/redis/redis.service';
import { direction, distance, heading, Point } from '@common/utils/geo/bearing';
import { bboxIdOf, withNeighbours } from '@common/utils/geo/grid';

interface TailPoint extends Point {
  ts: number;
}

/** Value of one field (user id) in a bbox hash. Tail is oldest first. */
interface DeviceEntry {
  username: string;
  /** Empty string when the device drives the default car */
  skinFileId: string;
  tail: TailPoint[];
}

export interface UpsertResult {
  bboxId: string;
  heading: number | null;
  ts: number;
}

export interface NearbyDevice {
  userId: string;
  username: string;
  /** Image file of the car skin, for GET /files/open; null = default car */
  skinFileId: string | null;
  lat: number;
  long: number;
  /** Metres from the requester */
  distance: number;
  /** Where the device is, seen from the requester: 0 left, 90 north, 180 right, 270 south */
  direction: number;
  /** Where the device is moving, same convention; null if standing still */
  heading: number | null;
  updatedAt: number;
}

const userKey = (userId: string) => `user:${userId}:bbox`;

// Appends a point to the user's tail and moves the entry to the new bbox hash
// in one step, so concurrent updates from a device cannot lose points.
// ARGV: userId, username, bboxId, point json, tail size, ttl s, stale-before ms,
//       skin image file id
const UPSERT_LUA = `
local userKey = 'user:' .. ARGV[1] .. ':bbox'
local point = cjson.decode(ARGV[4])
local tail = {}

local oldId = redis.call('GET', userKey)
if oldId then
  local raw = redis.call('HGET', oldId, ARGV[1])
  if raw then
    local prev = cjson.decode(raw).tail
    if prev[#prev].ts >= tonumber(ARGV[7]) then tail = prev end
  end
  if oldId ~= ARGV[3] then redis.call('HDEL', oldId, ARGV[1]) end
end

tail[#tail + 1] = point
while #tail > tonumber(ARGV[5]) do table.remove(tail, 1) end

local entry = cjson.encode({ username = ARGV[2], skinFileId = ARGV[8], tail = tail })
redis.call('HSET', ARGV[3], ARGV[1], entry)
redis.call('EXPIRE', ARGV[3], ARGV[6])
redis.call('SET', userKey, ARGV[3], 'EX', ARGV[6])
return entry
`;

@Injectable()
export class LocationsService {
  readonly cellDeg: number;
  private readonly tailSize: number;
  private readonly staleMs: number;
  private readonly defaultRadius: number;

  constructor(
    private readonly redis: RedisService,
    private readonly db: Database,
    config: ConfigService,
  ) {
    this.cellDeg = Number(config.get('BBOX_CELL_DEG', 0.005));
    this.tailSize = Number(config.get('TAIL_SIZE', 5));
    this.staleMs = Number(config.get('STALE_SECONDS', 30)) * 1000;
    this.defaultRadius = Number(config.get('NEARBY_RADIUS_M', 300));
  }

  /** Image file of the skin the user has selected, null for the default car. */
  async skinFileIdOf(userId: string): Promise<string | null> {
    const row = await this.db
      .selectFrom('users as u')
      .innerJoin('skins as s', 's.id', 'u.selected_skin_id')
      .select('s.image_file_id')
      .where('u.id', '=', userId)
      .executeTakeFirst();
    return row?.image_file_id ?? null;
  }

  async upsert(
    user: IUser,
    lat: number,
    long: number,
    skinFileId: string | null,
  ): Promise<UpsertResult> {
    const ts = Date.now();
    const bboxId = bboxIdOf(lat, long, this.cellDeg);
    const raw = (await this.redis.eval(
      UPSERT_LUA,
      0,
      user.id,
      user.username,
      bboxId,
      JSON.stringify({ lat, long, ts }),
      this.tailSize,
      Math.ceil((this.staleMs * 2) / 1000),
      ts - this.staleMs,
      skinFileId ?? '',
    )) as string;
    const entry = JSON.parse(raw) as DeviceEntry;
    return { bboxId, heading: heading(entry.tail), ts };
  }

  /** Null when the requester has no fresh location yet. */
  async nearby(
    userId: string,
    radius?: number,
  ): Promise<NearbyDevice[] | null> {
    const bboxId = await this.redis.get(userKey(userId));
    if (!bboxId) return null;

    const ids = withNeighbours(bboxId, this.cellDeg);
    const pipeline = this.redis.pipeline();
    ids.forEach((id) => pipeline.hgetall(id));
    const results = (await pipeline.exec()) ?? [];

    const now = Date.now();
    const devices: { userId: string; entry: DeviceEntry; last: TailPoint }[] =
      [];
    let me: TailPoint | undefined;

    for (const [i, [err, hash]] of results.entries()) {
      if (err) throw err;
      for (const [id, raw] of Object.entries(hash as Record<string, string>)) {
        const entry = JSON.parse(raw) as DeviceEntry;
        const last = entry.tail[entry.tail.length - 1];
        if (now - last.ts > this.staleMs) {
          // device vanished without disconnecting
          void this.redis.hdel(ids[i], id);
        } else if (id === userId) {
          me = last;
        } else {
          devices.push({ userId: id, entry, last });
        }
      }
    }
    if (!me) return null;

    const origin = me;
    const maxDistance = radius ?? this.defaultRadius;
    return devices
      .map(({ userId, entry, last }) => ({
        userId,
        username: entry.username,
        skinFileId: entry.skinFileId || null,
        lat: last.lat,
        long: last.long,
        distance: Math.round(distance(origin, last)),
        direction: direction(origin, last),
        heading: heading(entry.tail),
        updatedAt: last.ts,
      }))
      .filter((d) => d.distance <= maxDistance)
      .sort((a, b) => a.distance - b.distance);
  }

  /** Returns the bbox the user was in, if any. */
  async remove(userId: string): Promise<string | null> {
    const bboxId = await this.redis.getdel(userKey(userId));
    if (bboxId) await this.redis.hdel(bboxId, userId);
    return bboxId;
  }
}
