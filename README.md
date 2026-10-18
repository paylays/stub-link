# Short link app

A public URL shortener. Anyone can shorten an http(s) link, optionally with an expiry date. The creator gets a short URL, a QR code (PNG), and a secret stats URL shown once. The stats page shows clicks and unique visitors per day (UTC, last 30 days) plus device, browser and OS breakdowns.

Stack: Next.js 16 (App Router), TypeScript, PostgreSQL, Drizzle ORM. The plan lives in `docs/plan.md`.

## Prerequisites

- Node 24 and npm 11
- Docker Desktop (for the local PostgreSQL container)

## Local setup

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and replace the `USER:PASSWORD` placeholders and fill in `HASH_SECRET`:
   - `DATABASE_URL`: for the Docker db below, `postgres://shortlink:shortlink@localhost:5433/shortlink`
   - `TEST_DATABASE_URL`: same, with database `shortlink_test`
   - `APP_URL`: `http://localhost:3000`
   - `HASH_SECRET`: 32 or more random bytes, generate with `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`
3. Start the database: `docker compose up -d db`
4. Apply migrations: `npm run db:migrate`
5. Start the dev server: `npm run dev`

The db container publishes host port 5433, not 5432, so it does not clash with a PostgreSQL already installed on the machine. Set `DB_PORT` to change it. The container uses the user and password `shortlink` / `shortlink` by default (local development only). Override with `POSTGRES_USER` and `POSTGRES_PASSWORD` in `.env` before the first start; the connection URLs must match.

The init script creates the `shortlink_test` database on the first start of an empty volume only. Run `npm run db:migrate` against the test database by setting `DATABASE_URL` to `TEST_DATABASE_URL` for that command.

## npm scripts

| Script | Command |
|---|---|
| `npm run dev` | `next dev` |
| `npm run build` | `next build` |
| `npm run start` | `next start` |
| `npm run lint` | `eslint .` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:generate` | `drizzle-kit generate` |
| `npm run db:migrate` | `node --env-file-if-exists=.env scripts/migrate.mjs` |
| `npm run test` | `vitest run` |
| `npm run test:unit` | `vitest run --project unit` |
| `npm run test:int` | `vitest run --project integration` |
| `npm run test:e2e` | `playwright test` |

## Tests

- Unit: `npm run test:unit`. No database needed.
- Integration: `npm run test:int`. Needs the db container running (`docker compose up -d db`) and `TEST_DATABASE_URL` set.
- End to end: `npx playwright install chromium` once, then `npm run test:e2e`. It builds the app and serves it on port 3100 against `TEST_DATABASE_URL`.

## Run in Docker

`docker compose --profile app up --build`

This builds the image, waits for the db to be healthy, applies migrations, and serves the app on http://localhost:3000. The container reads `.env` but overrides `DATABASE_URL` to reach the db service on the internal network.

## Deploy notes (reference only)

Not deployed. If the boss approves a deploy, Vercel with Neon works:

- Set the four env vars in Vercel: `DATABASE_URL` (Neon pooled URL), `TEST_DATABASE_URL` is not needed at runtime, `APP_URL` (the public origin), `HASH_SECRET`.
- Run the migration before promoting a release, from a machine with the Neon direct connection: `DATABASE_URL_UNPOOLED=<direct url> npm run db:migrate`. The migrator prefers `DATABASE_URL_UNPOOLED` when set.
- Vercel Hobby is for non-commercial use only.

## Abuse takedown

There is no admin UI. Disable a link with SQL; its short URL then returns 410:

```sql
UPDATE links SET disabled_at = now() WHERE code = '...';
```

## Known limits

- A lost stats URL cannot be recovered. Only a hash of the secret is stored.
- The rate limit (20 new links per IP per hour) is best-effort. Shared IPs (CGNAT) share a budget.
- Self-hosting needs a reverse proxy that overwrites `x-forwarded-for` and `x-real-ip`. Without one, clients can spoof their IP and dodge the rate limit.
- Unique visitors are counted per link per UTC day, so the sum over 30 days is not a count of distinct people.
- Bot and prefetch filtering is a heuristic.
- Click rows are never pruned.
