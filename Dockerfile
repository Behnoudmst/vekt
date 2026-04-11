# ─── Stage 1: Install ALL dependencies (needed for build) ────────────────────
# Includes build tools required by the native better-sqlite3 module.
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat python3 make g++
RUN corepack enable && corepack prepare pnpm@10.18.1 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --frozen-lockfile --prefer-offline

# ─── Stage 1b: Prune to production dependencies only (for runner) ────────────
FROM deps AS deps-prod
RUN pnpm prune --prod

# ─── Stage 2: Build ───────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@10.18.1 --activate
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Prisma 7 resolves DATABASE_URL at generate time — a placeholder is enough
ENV DATABASE_URL="file:/tmp/build-placeholder.db"
RUN pnpm prisma generate --schema=schema/schema.prisma \
 && pnpm run build

# ─── Stage 3: Production runner ───────────────────────────────────────────────
FROM node:22-alpine AS runner
RUN apk add --no-cache libc6-compat
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# Override at runtime via -e / docker-compose environment:
ENV DATABASE_URL="file:/data/app.db"

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# Next.js standalone bundle
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public        ./public

# Full production node_modules — ensures better-sqlite3 native module, Prisma CLI,
# and @prisma/adapter-better-sqlite3 are all present at runtime
COPY --from=deps-prod --chown=nextjs:nodejs /app/node_modules ./node_modules

# Prisma schema, generated client, and config (required by migrate deploy)
COPY --from=builder --chown=nextjs:nodejs /app/schema          ./schema
COPY --from=builder --chown=nextjs:nodejs /app/generated       ./generated
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/scripts         ./scripts

# Persistent data directories — mount as Docker volumes
RUN mkdir -p /data public/uploads \
 && chown nextjs:nodejs /data public/uploads

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh \
 && chown nextjs:nodejs /docker-entrypoint.sh

USER nextjs
EXPOSE 3000
ENTRYPOINT ["/docker-entrypoint.sh"]
