FROM node:22-alpine AS base
WORKDIR /app
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --config.verify-deps-before-run=false

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm run build

FROM base AS prod-deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile --ignore-scripts --config.verify-deps-before-run=false

FROM node:22-alpine AS runner
WORKDIR /app

RUN apk add --no-cache tzdata wget && \
    addgroup -S nestjs && adduser -S nestjs -G nestjs

COPY --chown=nestjs:nestjs --from=prod-deps /app/node_modules ./node_modules
COPY --chown=nestjs:nestjs --from=build /app/dist ./dist
COPY --chown=nestjs:nestjs package.json ./

ENV API_PORT=3000
ENV NODE_ENV=production

USER nestjs

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD wget -q -O /dev/null "http://127.0.0.1:${API_PORT}" || exit 1

CMD ["node", "dist/main.js"]
