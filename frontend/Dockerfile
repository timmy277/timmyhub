# Multi-stage Dockerfile cho frontend (Next.js 16 Standalone)
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.5.2 --activate
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Stage 1: Cài đặt dependencies
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY shared/contracts/package.json ./shared/contracts/
COPY frontend/package.json ./frontend/

RUN pnpm install --frozen-lockfile

# Stage 2: Build Next.js
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/shared/contracts/node_modules ./shared/contracts/node_modules
COPY --from=deps /app/frontend/node_modules ./frontend/node_modules

COPY . .

# Build contracts trước để frontend có types
RUN pnpm --filter @timmyhub/contracts build

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN pnpm --filter timmyhub-nextjs build

# Stage 3: Runner siêu nhẹ với Next.js Standalone
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy static assets và standalone build
COPY --from=builder /app/frontend/public ./frontend/public
COPY --from=builder --chown=nextjs:nodejs /app/frontend/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/frontend/.next/static ./frontend/.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "frontend/server.js"]
