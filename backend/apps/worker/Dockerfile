# Multi-stage Dockerfile cho @timmyhub/worker (BullMQ & Outbox Dispatcher)
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.5.2 --activate
RUN apk add --no-cache libc6-compat openssl ffmpeg

WORKDIR /app

# Stage 1: Cài đặt dependencies với layer caching
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY shared/contracts/package.json ./shared/contracts/
COPY shared/common/package.json ./shared/common/
COPY backend/libs/prisma/package.json ./backend/libs/prisma/
COPY backend/libs/modules/package.json ./backend/libs/modules/
COPY backend/apps/worker/package.json ./backend/apps/worker/

RUN pnpm install --frozen-lockfile --ignore-scripts

# Stage 2: Build toàn bộ dependencies & Worker application
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/shared/contracts/node_modules ./shared/contracts/node_modules
COPY --from=deps /app/shared/common/node_modules ./shared/common/node_modules
COPY --from=deps /app/backend/libs/prisma/node_modules ./backend/libs/prisma/node_modules
COPY --from=deps /app/backend/libs/modules/node_modules ./backend/libs/modules/node_modules
COPY --from=deps /app/backend/apps/worker/node_modules ./backend/apps/worker/node_modules

COPY . .

# Sinh Prisma Client và build các thư viện liên quan
RUN pnpm --filter @timmyhub/prisma prisma:generate || true
RUN pnpm --filter @timmyhub/contracts build
RUN pnpm --filter @timmyhub/common build
RUN pnpm --filter @timmyhub/prisma build
RUN pnpm --filter @timmyhub/modules build
RUN pnpm --filter @timmyhub/worker build

# Stage 3: Production Runner cho Worker
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 workeruser

COPY --from=builder --chown=workeruser:nodejs /app ./

USER workeruser

CMD ["node", "backend/apps/worker/dist/main.js"]
