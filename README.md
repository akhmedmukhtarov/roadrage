# roadrage backend

Backend for a CarPlay app that lets drivers rate the drivers around them.
NestJS, Postgres (Prisma for the schema, Kysely for queries),
Redis for live positions, Socket.IO for the device connection.

## Run

```bash
cp .env.example .env        # fill in the passwords, MinIO keys and JWT secrets
yarn start:dev
```

Swagger UI is at `/api/docs` (JSON at `/api/docs-json`) on dev only: it is not
served when `NODE_ENV=production`.

Nothing runs locally besides the app: Postgres, Redis and MinIO are the shared
ones on the server, and local development uses the same database
(`roadrage_dev`) and Redis db as the dev deployment.

There are no migration files for now: the database is synced straight from
`prisma/schema.prisma` with `prisma db push`. After changing the schema, run
`yarn db:push`; it updates the dev database on the server and regenerates the
Kysely types
in `src/common/services/database/types.ts`. Deployed containers run the same
sync on start. A change that would lose data (dropping a column or table that
has rows) is refused instead of applied.

## Auth (REST)

All routes are under `/api/v1`. Every route needs a Bearer access token unless
marked `@Public()`; register, login and refresh are public.

| Method | Path             | Body                     | Returns                         |
| ------ | ---------------- | ------------------------ | ------------------------------- |
| POST   | `/auth/register` | `{ username, password }` | `{ accessToken, refreshToken }` |
| POST   | `/auth/login`    | `{ username, password }` | `{ accessToken, refreshToken }` |
| POST   | `/auth/refresh`  | `{ refreshToken }`       | `{ accessToken, refreshToken }` |
| POST   | `/auth/logout`   | none (Bearer access)     | `null`                          |
| GET    | `/auth/me`       | none (Bearer access)     | `{ id, username, role, coins, selectedSkin }` |

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

## Files (REST)

| Method | Path                               | Who    | Does                                              |
| ------ | ---------------------------------- | ------ | ------------------------------------------------- |
| POST   | `/files/upload`                    | admin  | Multipart field `file`; returns the file record   |
| GET    | `/files/open?fileId=&download=`    | public | Streams the file (inline, or attachment if `download=true`) |

Uploads are png, jpeg, webp or a Lottie JSON (`application/json`) up to 5 MB, stored in MinIO as `{id}{ext}` with a
row in `files`. `open` returns the raw file, not the JSON envelope, and is
cacheable forever because a file never changes under its id.

## Skins and coins (REST)

Skins have a price in coins; price 0 is free. A user can select any free skin
and any skin they bought. `selectedSkin: null` means the default car.

| Method | Path                      | Who   | Does                                                  |
| ------ | ------------------------- | ----- | ----------------------------------------------------- |
| GET    | `/skins`                  | user  | The shop: published skins with `owned` and `selected` |
| GET    | `/skins/mine`             | user  | Skins the user can select (free + purchased)          |
| POST   | `/skins/:id/purchase`     | user  | Buy with coins; returns the new balance               |
| PUT    | `/skins/selected`         | user  | `{ skinId }`, or `{ skinId: null }` for the default   |
| GET    | `/admin/skins`            | admin | All skins, including hidden                           |
| POST   | `/admin/skins`            | admin | `{ name, price, isActive?, imageFileId }`             |
| PATCH  | `/admin/skins/:id`        | admin | Any of the same fields                                |
| POST   | `/admin/users/:id/coins`  | admin | `{ amount }`: positive grants, negative takes away    |

- A skin's image is a file: upload it first (see Files), then pass its id as
  `imageFileId`. Skins return `imageFileId`; load the image from
  `/files/open?fileId=`.
- Hiding a skin (`isActive: false`) removes it from the shop; owners keep it.
  Skins are never deleted.
- Every balance change is a row in `coin_transactions`. Coins currently come
  only from the admin grant endpoint.
- There is no endpoint to create an admin. Promote a user in SQL, then log in
  again (the role is carried in the access token):
  `update users set role = 'ADMIN' where username = '...';`

## Reaction packs (REST)

A reaction is what a driver sends to rate a passing driver: an icon, an optional
animation and a `rating` from -10 (worst) to 10 (best). Reactions are sold in
packs, priced like skins: price 0 is free, anything else is bought with coins.

| Method | Path                                             | Who   | Does                                              |
| ------ | ------------------------------------------------ | ----- | ------------------------------------------------- |
| GET    | `/reaction-packs`                                | user  | The shop: published packs with `owned` and their reactions |
| GET    | `/reaction-packs/mine`                           | user  | Packs the user can use (free + purchased)         |
| POST   | `/reaction-packs/:id/purchase`                   | user  | Buy with coins; returns the new balance           |
| GET    | `/admin/reaction-packs`                          | admin | All packs, including hidden                       |
| POST   | `/admin/reaction-packs`                          | admin | `{ name, price, isActive? }`                      |
| PATCH  | `/admin/reaction-packs/:id`                      | admin | Any of the same fields                            |
| POST   | `/admin/reaction-packs/:id/reactions`            | admin | `{ name, iconFileId, animationFileId?, rating }`  |
| PATCH  | `/admin/reaction-packs/:id/reactions/:reactionId`| admin | Any of the same fields; `animationFileId: null` removes the animation |
| DELETE | `/admin/reaction-packs/:id/reactions/:reactionId`| admin | Removes the reaction from the pack                |

- The icon is an image and the animation a Lottie JSON, both uploaded first (see
  Files) and loaded from `/files/open?fileId=`. A reaction without an animation
  shows its icon still.
- Hiding a pack (`isActive: false`) removes it from the shop; owners keep it.
  Packs are never deleted.

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
| `location` | server to client |                   | `{ userId, username, skinFileId, lat, long, heading, bboxId, updatedAt }` |
| `left`     | server to client |                   | `{ userId }`                                                    |
| `exception`| server to client |                   | `{ status: 'error', message }` for a rejected event             |

A device in `nearby` looks like:

```json
{
  "userId": "…",
  "username": "akhmed",
  "skinFileId": "…",
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

- `skinFileId`: image of the skin that driver selected, to load from
  `/files/open?fileId=`; `null` for the default car.

`distance` and `radius` are metres. Devices are sorted nearest first.

## Layout

- `src/common`: shared config, decorators, guard, filter, interceptor, and the
  database (Kysely) and Redis services.
- `src/modules`: `auth`, `files`, `reactions`, `skins`, `users` (REST) and `locations` (socket
  gateway).

## How bboxes work

The world is a fixed grid of `BBOX_CELL_DEG` cells (0.005° ≈ 555 m of
latitude). A bbox id is `bbox:{x}:{y}`, computed from the coordinates, and is
used as both the Redis key and the socket room.

- `bbox:{x}:{y}` is a Redis hash: user id → `{ username, skinFileId, tail }`, where `tail`
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
