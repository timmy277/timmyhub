# Multi-stage Dockerfile cho @timmyhub/api (NestJS Monolith)
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.5.2 --activate
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# Stage 1: Cài đặt dependencies với layer caching
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY shared/contracts/package.json ./shared/contracts/
COPY shared/common/package.json ./shared/common/
COPY backend/libs/prisma/package.json ./backend/libs/prisma/
COPY backend/libs/modules/package.json ./backend/libs/modules/
COPY backend/apps/api/package.json ./backend/apps/api/

RUN pnpm install --frozen-lockfile --ignore-scripts

# Stage 2: Build toàn bộ dependencies & API application
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/shared/contracts/node_modules ./shared/contracts/node_modules
COPY --from=deps /app/shared/common/node_modules ./shared/common/node_modules
COPY --from=deps /app/backend/libs/prisma/node_modules ./backend/libs/prisma/node_modules
COPY --from=deps /app/backend/libs/modules/node_modules ./backend/libs/modules/node_modules
COPY --from=deps /app/backend/apps/api/node_modules ./backend/apps/api/node_modules

COPY . .

# Sinh Prisma Client và build các thư viện liên quan
RUN pnpm --filter @timmyhub/prisma prisma:generate || true
RUN pnpm --filter @timmyhub/contracts build
RUN pnpm --filter @timmyhub/common build
RUN pnpm --filter @timmyhub/prisma build
RUN pnpm --filter @timmyhub/modules build
RUN pnpm --filter @timmyhub/api build

# Stage 3: Production Runner nhẹ, an toàn với user non-root
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

COPY --from=builder --chown=nestjs:nodejs /app ./

USER nestjs
EXPOSE 3001

CMD ["node", "backend/apps/api/dist/main"]
