FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.6.2 --activate
WORKDIR /app

# Install all dependencies
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc* ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/ai/package.json packages/ai/package.json
COPY packages/whatsapp/package.json packages/whatsapp/package.json
COPY packages/config-ts/package.json packages/config-ts/package.json
COPY packages/config-lint/package.json packages/config-lint/package.json
RUN pnpm install --frozen-lockfile

# Full source
FROM deps AS source
COPY . .

# Build web
FROM source AS web-builder
RUN pnpm --filter @eddnbot/web build

# API runtime
FROM base AS api
COPY --from=source /app ./
EXPOSE 3001
CMD ["pnpm", "--filter", "@eddnbot/api", "exec", "tsx", "src/server.ts"]

# DB migrations
FROM base AS migrate
COPY --from=source /app ./
CMD ["pnpm", "--filter", "@eddnbot/db", "exec", "drizzle-kit", "migrate"]

# Web static served by nginx
FROM nginx:alpine AS web
COPY --from=web-builder /app/apps/web/dist /usr/share/nginx/html
COPY tooling/docker/nginx-web.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
