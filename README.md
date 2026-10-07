# roadrage backend

Backend for a CarPlay app that lets drivers rate the drivers around them.
NestJS, Postgres (Prisma for schema and migrations, Kysely for queries),
Redis for live positions, Socket.IO for the device connection.

## Run

```bash
cp .env.example .env        # set both JWT secrets
docker compose up -d        # Postgres + Redis
yarn db:deploy              # apply migrations
yarn start:dev
```

Swagger UI is at `/api/docs` (JSON at `/api/docs-json`) on dev only: it is not
served when `NODE_ENV=production`.

After changing `prisma/schema.prisma`, run `yarn db:migrate`. It also
regenerates the Kysely types in `src/common/services/database/types.ts`.

## Auth (REST)

All routes are under `/api/v1`. Every route needs a Bearer access token unless
marked `@Public()`; register, login and refresh are public.

| Method | Path             | Body                     | Returns                         |
| ------ | ---------------- | ------------------------ | ------------------------------- |
| POST   | `/auth/register` | `{ username, password }` | `{ accessToken, refreshToken }` |
| POST   | `/auth/login`    | `{ username, password }` | `{ accessToken, refreshToken }` |
| POST   | `/auth/refresh`  | `{ refreshToken }`       | `{ accessToken, refreshToken }` |
| POST   | `/auth/logout`   | none (Bearer access)     | `null`                          |
| GET    | `/auth/me`       | none (Bearer access)     | `{ id, username }`              |

The "Returns" column is the `data` field of the standard envelope:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Operation successful",
  "data": { "accessToken": "…", "refreshToken": "…" },
  "error": null,
  "meta": { "timestamp": "2026-10-07T09:44:18.463Z" }
}
```

On failure `success` is false, `data` is null and `error` is
`{ code, details }`, with codes from `src/common/constants/error-codes.ts`.

Usernames are unique, case-insensitive, 3-24 characters of `a-z 0-9 _ .`.
Access and refresh tokens are signed with different secrets. A refresh
replaces the refresh token; the old one stops working, as it does on logout.

## Locations (Socket.IO)

Connect with the access token:

```js
const socket = io(URL, { auth: { token: accessToken } });
```

A bad or expired token fails the connection with `Unauthorized`: refresh and
reconnect.

| Event      | Direction        | Payload           | Reply / data                                                    |
| ---------- | ---------------- | ----------------- | --------------------------------------------------------------- |
| `location` | client to server | `{ lat, long }`   | ack `{ bboxId }`                                                |
| `nearby`   | client to server | `{ radius? }`     | ack `{ devices: [...] }`                                        |
| `location` | server to client |                   | `{ userId, username, lat, long, heading, bboxId, updatedAt }`   |
| `left`     | server to client |                   | `{ userId }`                                                    |
| `exception`| server to client |                   | `{ status: 'error', message }` for a rejected event             |

A device in `nearby` looks like:

```json
{
  "userId": "…",
  "username": "akhmed",
  "lat": 41.3121,
  "long": 69.2797,
  "distance": 111,
  "direction": 90,
  "heading": 180,
  "updatedAt": 1791378940000
}
```

Angles are clockwise with **0 = left, 90 = north, 180 = right, 270 = south**:

- `direction`: where that device is, seen from the requester's last position.
- `heading`: where that device is moving, from its tail. `null` until it has
  moved at least 3 m.

`distance` and `radius` are metres. Devices are sorted nearest first.

## Layout

- `src/common`: shared config, decorators, guard, filter, interceptor, and the
  database (Kysely) and Redis services.
- `src/modules`: `auth` (REST) and `locations` (socket gateway).

## How bboxes work

The world is a fixed grid of `BBOX_CELL_DEG` cells (0.005° ≈ 555 m of
latitude). A bbox id is `bbox:{x}:{y}`, computed from the coordinates, and is
used as both the Redis key and the socket room.

- `bbox:{x}:{y}` is a Redis hash: user id → `{ username, tail }`, where `tail`
  holds the last `TAIL_SIZE` points `{ lat, long, ts }`, oldest first.
- `user:{id}:bbox` remembers which bbox a user is in, so the entry (with its
  tail) moves when the device crosses into another cell.
- On `location` the socket leaves its old bbox room and joins the new one. The
  update is broadcast to that room and the 8 rooms around it.
- `nearby` reads the requester's bbox plus its 8 neighbours, so a car just
  across a cell border is still found. This caps the useful radius at about
  one cell.
- A device is dropped when its socket disconnects, or when it has sent nothing
  for `STALE_SECONDS`.
