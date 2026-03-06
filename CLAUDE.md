# eddnbot

WhatsApp automation with AI — multi-tenant SaaS.

## Roadmap

| Fase | Descripción | Estado |
|------|------------|--------|
| 1 | Scaffolding (monorepo, DB schema, health routes) | Done |
| 2 | Testing setup + API Keys Auth (TDD) | Done |
| 3 | AI Engine multi-provider (OpenAI, Anthropic, Gemini) | Done |
| 3.1 | Whisper audio transcription provider | Done |
| 4 | WhatsApp Cloud API integration (motor/engine) | Done |
| 5 | Flujos conversacionales (AI + WhatsApp) | Done |
| 6 | Usage tracking / rate limiting | Done |
| 7 | Dashboard web (tenant frontend) | Done |
| 8 | Admin dashboard (SaaS operator panel) | Done |
| 9 | Conversation Monitor (inbox + chat view) | Done |

## Stack

- **Monorepo**: Turborepo + pnpm 10 workspaces
- **Runtime**: Node >= 22, ESM
- **API**: Fastify 5 (`apps/api`, port 3001)
- **Web**: Next.js 15 (`apps/web`, port 3000)
- **DB**: PostgreSQL 17, Drizzle ORM (`packages/db`)
- **AI**: Multi-provider engine (`packages/ai`) — OpenAI, Anthropic, Gemini + Whisper
- **WhatsApp**: Cloud API engine (`packages/whatsapp`) — zero external deps, native fetch+crypto
- **Testing**: Vitest 4, TDD approach, pool forks, test DB `eddnbot_test`
- **Auth**: API key (`ek_live_*`) → SHA-256 hash → DB lookup; Admin auth via `ADMIN_SECRET` + `X-Admin-Token` header

## Conventions

- TDD: write tests first (RED), then implementation (GREEN)
- All routes require auth unless `{ config: { skipAuth: true } }` or `{ config: { adminOnly: true } }`
- Admin routes under `/admin/*` require `X-Admin-Token` header matching `ADMIN_SECRET` env var
- Zod for request validation, ZodError → 400 global handler
- Postgres unique violations (23505) → 409
- Workspace deps: `workspace:*` protocol
- pnpm strict mode: add transitive deps explicitly when needed
