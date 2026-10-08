# Debian-based (not alpine) so argon2's prebuilt native binary matches libc
# in every stage.
FROM node:22-slim AS base
# Prisma needs to find OpenSSL to pick its engine
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Install all deps (dev included) — needed for build
FROM base AS deps
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production=false

# Build
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN yarn build

# Production-only deps (smaller image, no dev deps shipped)
FROM base AS prod-deps
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production=true

# Production runtime
FROM base AS production
ENV NODE_ENV=production

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY package.json prisma.config.ts ./

EXPOSE 3000

# Apply pending migrations, then start
CMD ["sh", "-c", "yarn -s db:deploy && node dist/main.js"]
