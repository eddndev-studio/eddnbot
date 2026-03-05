# eddnbot

WhatsApp automation with AI — multi-tenant SaaS platform.

Receive WhatsApp messages, process them with AI (OpenAI, Anthropic, Gemini), and auto-reply intelligently. Built for operators who manage multiple tenants from a single admin panel.

## Features

- **Multi-tenant architecture** — isolated data, API keys, and quotas per tenant
- **AI auto-reply** — conversational AI powered by OpenAI, Anthropic, or Google Gemini
- **Audio transcription** — Whisper integration for voice message processing
- **WhatsApp Cloud API** — native integration with zero external dependencies
- **Admin dashboard** — full SaaS operator panel for managing tenants, keys, configs, and usage
- **Tenant dashboard** — self-service panel for AI configs, WhatsApp accounts, quotas, and usage
- **Usage tracking & rate limiting** — per-tenant quotas for AI tokens, messages, and API requests
- **TDD** — 170+ tests with Vitest

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Monorepo | Turborepo + pnpm 10 workspaces |
| Runtime | Node.js >= 22, ESM |
| API | Fastify 5 |
| Web | Vite + React 19 + TanStack Router |
| UI | shadcn/ui + Tailwind CSS 4 |
| Database | PostgreSQL 17 + Drizzle ORM |
| Cache | Redis 7 |
| AI | OpenAI, Anthropic, Google Gemini, Whisper |
| WhatsApp | Meta Cloud API (native fetch + crypto) |
| Testing | Vitest 4, TDD |
| Deploy | Docker Compose + GitHub Actions (self-hosted) |

## Project Structure

```
eddnbot/
  apps/
    api/          — Fastify REST API (port 3001)
    web/          — React SPA dashboard (port 3000)
  packages/
    ai/           — Multi-provider AI engine
    db/           — Drizzle ORM schema & migrations
    whatsapp/     — WhatsApp Cloud API client
    config-ts/    — Shared TypeScript config
    config-lint/  — Shared ESLint config
  tooling/
    docker/       — Docker Compose & nginx configs
```

## Getting Started

### Prerequisites

- Node.js >= 22
- pnpm 10
- PostgreSQL 17
- Redis 7

### Setup

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env
# Edit .env with your database, Redis, and API keys

# Run database migrations
pnpm --filter db db:migrate

# Start development servers
pnpm dev
```

The API runs on `http://localhost:3001` and the web dashboard on `http://localhost:3000`.

### Testing

```bash
# Run all tests
pnpm test

# Run API tests only
pnpm --filter api test
```

## Authentication

### Tenant Auth
API key-based (`ek_live_*`). Keys are SHA-256 hashed and stored in the database. Pass via `X-API-Key` header.

### Admin Auth
Single operator token via `ADMIN_SECRET` env var. Pass via `X-Admin-Token` header. All `/admin/*` routes require this token.

## API Routes

### Admin (`/admin/*` — requires `X-Admin-Token`)
- `GET /admin/auth/verify` — validate admin token
- `POST/GET /admin/tenants` — create & list tenants
- `GET/PATCH/DELETE /admin/tenants/:id` — tenant CRUD
- `POST/GET/DELETE /admin/tenants/:id/api-keys` — API key management
- `GET /admin/tenants/:id/ai-configs` — tenant AI configs
- `GET /admin/tenants/:id/whatsapp-accounts` — tenant WhatsApp accounts
- `GET/PUT /admin/tenants/:id/quotas` — tenant quota management
- `GET /admin/overview/stats` — global platform stats
- `GET /admin/usage` — global usage breakdown
- `GET /admin/usage/:tenantId` — per-tenant usage

### Tenant (`/` — requires `X-API-Key`)
- `POST/GET/PATCH/DELETE /ai/configs` — AI configuration CRUD
- `POST /ai/chat` — AI chat completion
- `POST /ai/transcribe` — audio transcription
- `POST/GET/PATCH/DELETE /whatsapp/accounts` — WhatsApp account CRUD
- `POST /whatsapp/send` — send WhatsApp message
- `GET/POST /whatsapp/webhook` — Meta webhook (public)
- `GET/PUT/DELETE /quotas` — quota management
- `GET /usage` — usage summary

## Deployment

Production deployment uses Docker Compose with GitHub Actions on a self-hosted runner:

```bash
cd tooling/docker
cp /opt/eddnbot/.env .env
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
```

Services: PostgreSQL, Redis, API, Web (nginx), and a migration runner.

## Links

- **App**: [app.eddn.dev](https://app.eddn.dev)
- **Admin**: [app.eddn.dev/admin/login](https://app.eddn.dev/admin/login)
- **Privacy Policy**: [app.eddn.dev/privacy](https://app.eddn.dev/privacy)
- **Terms of Service**: [app.eddn.dev/terms](https://app.eddn.dev/terms)

## License

Private — All rights reserved.
