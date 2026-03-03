# syntax=docker/dockerfile:1
# ============================================================
# Stage 1 — Dependencies
# ============================================================
FROM node:22-alpine AS deps

RUN corepack enable pnpm

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
# Cache the pnpm content-addressable store across builds so only changed
# packages are re-downloaded when lockfile changes.
RUN --mount=type=cache,id=pnpm-fe,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# ============================================================
# Stage 2 — Builder
# ============================================================
FROM node:22-alpine AS builder

RUN corepack enable pnpm

WORKDIR /app

# Reuse the installed node_modules from the deps stage.
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# next build reads NEXT_PUBLIC_* at compile time.
# Provide a placeholder so the build doesn't fail without real values;
# actual values are injected at container runtime via env vars.
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN pnpm run build

# ============================================================
# Stage 3 — Runner (minimal production image)
# ============================================================
FROM node:22-alpine AS runner

RUN apk add --no-cache dumb-init

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Port Next.js server listens on (overrideable via env).
ENV PORT=3000
# Bind to all interfaces so the health check and Docker port mapping work.
ENV HOSTNAME=0.0.0.0

WORKDIR /app

# next build --output standalone copies only what's needed to run the server.
# Static assets must be copied separately (they live outside standalone/).
COPY --chown=node:node --from=builder /app/public ./public
COPY --chown=node:node --from=builder /app/.next/standalone ./
COPY --chown=node:node --from=builder /app/.next/static ./.next/static

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO /dev/null http://127.0.0.1:3000/ || exit 1

CMD ["dumb-init", "node", "server.js"]
