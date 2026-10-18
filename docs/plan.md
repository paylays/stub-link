# Short link app: implementation plan (approved by the boss 2026-10-18)

## Boss decisions
- Public service, no login. Anyone can shorten a link. Analytics open through a secret stats URL shown once at creation.
- Stack: Next.js + PostgreSQL, TypeScript.
- Analytics per link: clicks over time (total + unique per day, chart) and device / browser / OS. No referrer, no geo.
- v1 extras: QR code (PNG download) and optional expiry date.
- UI copy language: English.
- Hosting: local only for now. Deploying needs boss approval.
- Local database: Postgres in Docker via `docker compose` (the boss installs Docker Desktop). Native PostgreSQL 17 on this machine is not used.
- Defaults approved as is: manual SQL takedown for abuse (`disabled_at`), 20 new links per IP per hour, 30-day chart in UTC plus all-time total, 302 redirects, no owner edit/delete, QR as PNG only. No Google Safe Browsing.

## 1. Stack and dependencies (complete list, nothing else)
Machine: Node 24.11, npm 11.6. Use npm (pnpm not installed).

Runtime:
- `next@16.4.2`, `react` / `react-dom@^19`: App Router, `src/` dir, Turbopack. Route Handlers for redirect and QR, a Server Action for create (built-in Origin/CSRF check), `after()` from `next/server` for non-blocking click inserts. Do NOT enable `cacheComponents`.
- `drizzle-orm@0.45.4` (not the 1.0 RC): typed queries, plain SQL migration files, no codegen engine.
- `postgres@3.4.9` (postgres.js): one driver for Docker, Neon and Supabase. Use `{ prepare: false, max: 5 }`. Keep a singleton on `globalThis` so dev HMR does not open new pools.
- `bowser@2.14.1` (MIT): browser name, OS name, platform type. `ua-parser-js` v2 rejected (AGPL-3.0).
- `qrcode@1.5.4` (MIT): `QRCode.toBuffer(url, { type: 'png', width: 512, margin: 2, errorCorrectionLevel: 'M' })`.

Dev: `typescript@^5` (not TS 7), `@types/node`, `@types/react`, `@types/react-dom`, `@types/qrcode`, `drizzle-kit@0.31.11`, `vitest@5`, `@playwright/test@1.64`, `eslint@9` + `eslint-config-next@16.4.2`.

Deliberately not added: zod (hand validation), nanoid (`crypto.randomInt`), dotenv (`--env-file-if-exists`, `process.loadEnvFile`), chart libraries (server SVG), Tailwind (CSS Modules + custom properties in `globals.css`), tsx (`scripts/migrate.mjs` is plain JS), rate-limit services (Postgres does it).

## 2. Folder structure
```
short-link-apps/
  .env.example  .gitignore  .dockerignore  Dockerfile  docker-compose.yml  docker/init-test-db.sql
  next.config.ts  drizzle.config.ts  vitest.config.ts  playwright.config.ts  eslint.config.mjs  tsconfig.json  package.json  README.md
  DESIGN.md                      # ui-designer, from boss direction
  docs/plan.md                   # this file
  drizzle/                       # generated SQL migrations (committed)
  scripts/migrate.mjs            # programmatic migrator; prefers DATABASE_URL_UNPOOLED if set
  src/
    app/
      layout.tsx  globals.css  page.tsx  page.module.css  robots.ts
      actions.ts                 # 'use server' createLinkAction
      [code]/route.ts            # GET/HEAD redirect; 404/410 HTML
      api/qr/[code]/route.ts     # PNG
      stats/[token]/page.tsx  stats/[token]/page.module.css
    components/                  # frontend-owned
      CreateLinkForm.tsx ('use client')  LinkResult.tsx ('use client')
      ClicksChart.tsx (server SVG)  BreakdownList.tsx  status-page.ts (HTML string template)
    content/copy.ts              # all UI strings (English)
    lib/                         # pure, no DB/Next imports, unit-tested
      types.ts codes.ts tokens.ts url.ts expiry.ts visitor.ts user-agent.ts days.ts
    server/                      # backend-owned, DB access
      env.ts  db/schema.ts  db/client.ts  links.ts  clicks.ts  stats.ts  rate-limit.ts
  tests/unit/  tests/integration/  tests/e2e/
```

## 3. Data schema
Hashes are stored as hex `varchar`.
```
links
  id               bigint generated always as identity PK
  code             varchar(7)  NOT NULL UNIQUE      -- base62, case-sensitive
  target_url       text        NOT NULL CHECK (char_length(target_url) <= 2048)
  stats_token_hash varchar(64) NOT NULL UNIQUE      -- sha256(token) hex
  creator_ip_hash  varchar(32) NOT NULL             -- HMAC(HASH_SECRET, "create\n"+ip) hex, first 16 bytes
  expires_at       timestamptz NULL
  disabled_at      timestamptz NULL                 -- operator takedown via SQL only, no UI
  created_at       timestamptz NOT NULL DEFAULT now()
  INDEX (creator_ip_hash, created_at)
clicks
  id           bigint generated always as identity PK
  link_id      bigint NOT NULL REFERENCES links(id) ON DELETE CASCADE
  clicked_at   timestamptz NOT NULL DEFAULT now()
  visitor_hash varchar(32) NOT NULL                 -- HMAC(HASH_SECRET, utcDay\nlinkId\nip\nua) hex, first 16 bytes
  device_type  varchar(16) NOT NULL                 -- desktop|mobile|tablet|tv|unknown
  browser      varchar(64) NOT NULL                 -- bowser name or 'Unknown'
  os           varchar(64) NOT NULL
  INDEX (link_id, clicked_at)
```
- Short code: 7 chars from `[A-Za-z0-9]` via `crypto.randomInt(62)` per char. Insert with `ON CONFLICT DO NOTHING RETURNING id`; no row means regenerate code and token and retry, up to 5 attempts, then `server_error`. Fixed length 7 cannot collide with `api`, `stats`, `_next`.
- Stats secret: 32 random bytes, base64url (43 chars), sent once. DB stores only `sha256` hex. Lookup goes through the unique index on the hash.
- Unique clicks: HMAC key is env `HASH_SECRET`; message includes UTC day and link id, so the hash changes daily and per link. Raw IPs and UAs are never stored. "Unique" = distinct `visitor_hash` per link per UTC day.
  `SELECT (clicked_at AT TIME ZONE 'UTC')::date AS day, count(*)::int AS clicks, count(DISTINCT visitor_hash)::int AS uniques FROM clicks WHERE link_id=$1 AND clicked_at >= $start GROUP BY 1 ORDER BY 1`
  Cast every count to `::int` (postgres.js returns bigint as string).
- Fast redirect: one indexed SELECT by `code`, then 302. INSERT runs in `after(() => recordClick(...))`. `recordClick` catches and logs, never throws.
- Rate limit uses `links` itself: `count(*) WHERE creator_ip_hash=$1 AND created_at > now()-interval '1 hour'`; 20 or more means `rate_limited`. Constant lives in `src/server/rate-limit.ts`.

## 4. Routes
- Create: Server Action `createLinkAction(prev, formData)` in `src/app/actions.ts`, used by the home page form via `useActionState`. Fields: `url`, optional `expiresAt` (ISO-8601 UTC; client converts from `datetime-local`). Expiry must be at least 60 s in the future. No public JSON API.
- Redirect: `GET /[code]` in `src/app/[code]/route.ts` (`await ctx.params`, `export const dynamic = 'force-dynamic'`):
  1. Code not matching `^[A-Za-z0-9]{7}$`: 404 without touching the DB.
  2. Unknown code: 404.
  3. `disabled_at` set: 410 (kind `disabled`).
  4. `expires_at <= now`: 410 (kind `expired`).
  5. Otherwise 302 with `Location: target_url` and `Cache-Control: private, no-store`; record the click if countable.
  Never 301. Export `HEAD` with the same logic but no recording.
- 404/410 bodies: `renderStatusPage(kind: 'not-found' | 'expired' | 'disabled'): string`, a self-contained HTML document with inline CSS, echoing no user input, `Cache-Control: no-store`.
- Stats: `/stats/[token]` server component. Token not matching `^[A-Za-z0-9_-]{43}$` or no matching hash: `notFound()`. Shows short URL, target (`rel="noreferrer"`), created/expiry/state, all-time total, 30-day zero-filled UTC daily chart (clicks + uniques), device/browser/OS breakdowns over the same 30 days (top 8 + Other), QR download. No stats API; the page calls `getStatsByToken`.
- QR: `GET /api/qr/[code]` returns PNG of `${APP_URL}/${code}`, `Cache-Control: public, max-age=31536000, immutable`. Checks code format only. UI downloads it via `<a href download="{code}-qr.png">`.
- `robots.ts`: disallow `/stats/` and `/api/`.

Contract file `src/lib/types.ts`:
```ts
export type CreateLinkError = 'url_required'|'url_invalid'|'url_scheme'|'url_too_long'|'url_credentials'|'url_own_domain'|'expiry_invalid'|'expiry_past'|'rate_limited'|'server_error';
export type CreateLinkState =
  | { status: 'idle' }
  | { status: 'error'; error: CreateLinkError }
  | { status: 'ok'; code: string; shortUrl: string; statsUrl: string; expiresAt: string | null };
export type Count = { name: string; clicks: number };
export type StatsView = {
  code: string; shortUrl: string; targetUrl: string; createdAt: string; expiresAt: string | null;
  state: 'active' | 'expired' | 'disabled'; totalClicks: number;
  daily: { day: string; clicks: number; uniques: number }[]; // 30 entries, oldest first, YYYY-MM-DD UTC
  devices: Count[]; browsers: Count[]; os: Count[];
};
```
The backend returns error codes only. The frontend maps them to strings in `src/content/copy.ts`.

## 5. Security
- `validateTargetUrl(input, appUrl)` in `src/lib/url.ts`: trim; empty `url_required`; >2048 `url_too_long`; `new URL()` throws `url_invalid`; protocol not exactly `http:`/`https:` `url_scheme`; hostname empty or without a dot `url_invalid`; username or password present `url_credentials`; hostname (lowercased, trailing dot stripped) equals `APP_URL` hostname `url_own_domain`. Store `url.href`.
- Rate limit: 20 creates per IP per hour in Postgres. Client IP: `x-real-ip`, then first `x-forwarded-for`, then `'unknown'`. Self-hosted must sit behind a proxy that overwrites these headers.
- Bot/prefetch: always redirect, record no click when: method is HEAD; UA empty; bowser platform type `bot`; UA matches `/(bot|crawler|spider|slurp|preview|facebookexternalhit|embedly|whatsapp|headless|lighthouse|curl|wget|python-requests|go-http-client|okhttp|axios|node-fetch)/i`; `sec-purpose` contains `prefetch`; `purpose: prefetch`, `x-purpose: preview|prefetch`, or `x-moz: prefetch`.
- Headers via `next.config.ts`: `/stats/:path*` gets `Referrer-Policy: no-referrer`, `X-Robots-Tag: noindex, nofollow`, `Cache-Control: private, no-store`. Global: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`.
- Secrets only in env. `src/server/env.ts` reads them and throws if missing. `.env` and `.env*.local` gitignored. Never log request URLs.
- `.env.example`:
```
DATABASE_URL=postgres://USER:PASSWORD@localhost:5432/shortlink
TEST_DATABASE_URL=postgres://USER:PASSWORD@localhost:5432/shortlink_test
APP_URL=http://localhost:3000
# 32+ random bytes: node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
HASH_SECRET=
```

## 6. Run / test / build
- Setup: `npm install`; copy `.env.example` to `.env`; `docker compose up -d db` (postgres:17-alpine, `docker/init-test-db.sql` creates `shortlink_test`); `npm run db:migrate`; `npm run dev`.
- Port: compose maps `127.0.0.1:${DB_PORT:-5433}:5432`, so local URLs use `localhost:5433` (this machine has a native PostgreSQL on 5432). Compose reads `POSTGRES_USER`/`POSTGRES_PASSWORD` from `.env`, defaulting to local-dev values.
- Scripts: `dev`=`next dev`; `build`=`next build`; `start`=`next start`; `lint`=`eslint .`; `typecheck`=`tsc --noEmit`; `db:generate`=`drizzle-kit generate`; `db:migrate`=`node --env-file-if-exists=.env scripts/migrate.mjs`; `test`=`vitest run`; `test:unit`=`vitest run --project unit`; `test:int`=`vitest run --project integration`; `test:e2e`=`playwright test`.
- Vitest: Node environment only. Two `test.projects`: `unit`, and `integration` (single fork, globalSetup migrates `TEST_DATABASE_URL`, `TRUNCATE links, clicks RESTART IDENTITY CASCADE` before each test). Env via Vite `loadEnv('test', cwd, '')`. `resolve.alias` `@` to `src`.
- Route handler tests call exported `GET`/`HEAD` with a `NextRequest` and mock `next/server`'s `after` to run inline.
- Playwright `webServer`: `npm run build && npm start -- -p 3100` with `DATABASE_URL=$TEST_DATABASE_URL`, `APP_URL=http://localhost:3100`. Set a desktop Chrome UA (HeadlessChrome is filtered as a bot).
- Build: `output: 'standalone'`. Docker: multi-stage `node:24-alpine`, CMD `node scripts/migrate.mjs && node server.js`, `docker compose --profile app up --build`.

## Acceptance
- A1: Valid http(s) URL shows the short URL (`APP_URL/xxxxxxx`), the stats URL with a shown-once warning, copy buttons, QR preview with PNG download.
- A2: javascript:/data:/ftp:/own-domain/credentials/>2048/unparsable URLs show a field error; no row inserted.
- A3: 21st create from one IP within an hour returns `rate_limited`.
- A4: Active code: 302 + `no-store`, one click row. HEAD, bot UA, prefetch header, or empty UA: 302, no row.
- A5: Expired or disabled: 410 HTML page. Unknown or malformed: 404 HTML page. No click recorded.
- A6: Valid stats token shows total, 30-day chart (clicks + uniques), 3 breakdowns. Bad token 404. Responses carry noindex + `no-referrer`.
- A7: DB contains no plaintext token, IP, or UA.
- A8: Same IP+UA clicking 3 times in one UTC day: clicks=3, uniques=1. Next UTC day counts a new unique.
- A9: `npm run lint`, `typecheck`, `build`, `test`, `test:e2e` all pass.

Non-goals: accounts, custom aliases, referrer/geo, password links, admin UI, owner edit/delete, recovering a lost stats URL, "my links" list, public JSON API, i18n, SVG QR, click rollups/retention, CAPTCHA, Safe Browsing.

## Task list
1. Scaffold (backend-dev): `create-next-app@16.4.2` (TS, App Router, src dir, ESLint, no Tailwind), npm scripts, configs (next standalone + headers, vitest, playwright, drizzle, eslint), `.gitignore`, `.env.example`, `docker-compose.yml` (db + `app` profile), `docker/init-test-db.sql`, `src/server/env.ts`, full `src/lib/types.ts`. Stubs: `actions.ts` returns `server_error`, `stats.ts` returns null, `components/status-page.ts` returns a minimal HTML doc. Done: build, lint, typecheck, `npx vitest run --passWithNoTests` pass.
2. Schema + DB client + migrator (backend-dev): `src/server/db/schema.ts`, `src/server/db/client.ts`, `drizzle/**`, `scripts/migrate.mjs`. Done: `npm run db:migrate` on an empty DB creates both tables with all columns, constraints, indexes; second run is a no-op; also on the test DB.
3. Pure libs (backend-dev): `generateCode`/`CODE_RE`; `generateStatsToken`/`hashToken`/`TOKEN_RE`; `validateTargetUrl`; `parseExpiry(input, now)`; `getClientIp`/`visitorHash`/`creatorHash`; `parseUserAgent`/`isBot`/`isPrefetch`; `lastNDaysUtc`/`fillDays`. Done: typecheck passes; nothing in `src/lib` imports DB or Next.
4. Services (backend-dev): `createLink({url, expiresAt, ip}, {now?, genCode?})`, `getLinkByCode`, `recordClick` (never throws), `getStatsByToken` (zero-filled 30-day `StatsView`, int counts, top 8 + Other). Files: `src/server/links.ts`, `clicks.ts`, `stats.ts`, `rate-limit.ts`.
5. HTTP surface (backend-dev): `[code]/route.ts` GET/HEAD, `api/qr/[code]/route.ts`, real `createLinkAction`, `robots.ts`. Done: curl shows 302 / 404 / 410 / HEAD no row / `image/png`.
6. DESIGN.md + all UI copy in English (ui-designer): every `CreateLinkError`, the 3 status-page kinds, shown-once stats warning, stats labels ("days in UTC", "daily unique visitors"). Files: `DESIGN.md`, `src/content/copy.ts`.
7. Layout, global tokens, status-page template (frontend-dev), after 1 and 6: `src/app/layout.tsx`, `src/app/globals.css`, `src/components/status-page.ts`.
8. Create page (frontend-dev), after 7: `src/app/page.tsx`, `page.module.css`, `CreateLinkForm.tsx`, `LinkResult.tsx`. Done: A1, A2 visible.
9. Stats page (frontend-dev), parallel with 8: `src/app/stats/[token]/page.tsx`, `page.module.css`, `ClicksChart.tsx` (server SVG + visually hidden data table), `BreakdownList.tsx`. Done: A6 visible; chart ships no client JS.
10. Unit tests (qa-engineer), after 3: `tests/unit/**`.
11. Integration tests (qa-engineer), after 5: `tests/integration/**`. A3, A4, A5, A7, A8, forced collision retry, numeric stats.
12. E2E smoke (qa-engineer), after 5, 8, 9: `tests/e2e/smoke.spec.ts`.
13. Dockerfile + `.dockerignore` + compose `app` service + README (backend-dev), after 5.

## Known risks
- Lost stats URL cannot be recovered.
- Stats token in URL path appears in request logs and browser history (mitigated: no-referrer, noindex, no-store).
- Rate limit is best-effort per IP; CGNAT shares IPs; spoofable without a trusted proxy.
- Click rows grow without limit (~170 B per click).
- Uniques are per UTC day per link; 30-day sum is not distinct people.
- Bot/prefetch filter is a heuristic.
- `after()` insert can be lost if a self-hosted process dies right after responding.
- Public anonymous shortener attracts phishing; takedown is manual via SQL.
