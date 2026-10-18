# Architecture

Stub is a single Next.js 16 application (App Router, React 19, TypeScript) backed by one PostgreSQL database. Data access uses Drizzle ORM over the `postgres` (postgres.js) driver. Styling is CSS Modules with system fonts. Two small libraries do specific jobs: `bowser` parses user agents and `qrcode` renders QR codes.

## Folder structure

```
src/
  app/                    Routes and pages
    page.tsx              Home page with the create-link form
    actions.ts            Server Action that creates a link
    [code]/route.ts       Short-link redirect (GET, HEAD)
    stats/[token]/        Private stats page (page.tsx, error.tsx)
    api/qr/[code]/route.ts  QR code PNG
    robots.ts             robots.txt
    not-found.tsx         Site-wide 404 page
    layout.tsx, globals.css
  components/             React components and the static status page renderer
  content/copy.ts         Every user-facing string (English)
  lib/                    Pure helpers: URL and expiry validation, codes, tokens,
                          hashing, user-agent parsing, day math, shared types
  server/                 Server-only code
    db/schema.ts          Drizzle schema
    db/client.ts          Lazy postgres.js pool
    env.ts                Environment validation
    links.ts              Create and look up links
    clicks.ts             Record a click
    stats.ts              Aggregate stats
    rate-limit.ts         Creation rate limit
drizzle/                  Generated SQL migrations and snapshot
scripts/migrate.mjs       Migration runner (also used in the Docker image)
docker/init-test-db.sql   Creates the shortlink_test database
tests/                    unit, integration, e2e
```

The backend returns error codes only. The UI maps them to sentences through `src/content/copy.ts`.

## Data model

Two tables, defined in `src/server/db/schema.ts` and created by `drizzle/0000_acoustic_leader.sql`.

### `links`

| Column | Type | Constraints | Purpose |
|---|---|---|---|
| `id` | `bigint` | primary key, generated always as identity | Internal id. |
| `code` | `varchar(7)` | not null, unique | The short code in the URL. |
| `target_url` | `text` | not null, check `char_length(target_url) <= 2048` | Normalized destination. |
| `stats_token_hash` | `varchar(64)` | not null, unique | SHA-256 hex of the secret stats token. |
| `creator_ip_hash` | `varchar(32)` | not null | Keyed hash of the creator's IP, used only for the rate limit. |
| `expires_at` | `timestamptz` | nullable | After this moment the link returns 410. |
| `disabled_at` | `timestamptz` | nullable | Set by an operator to switch a link off. |
| `created_at` | `timestamptz` | not null, default `now()` | |

Index: `links_creator_ip_created_idx` on (`creator_ip_hash`, `created_at`), which serves the rate-limit count.

### `clicks`

| Column | Type | Constraints | Purpose |
|---|---|---|---|
| `id` | `bigint` | primary key, generated always as identity | |
| `link_id` | `bigint` | not null, foreign key to `links.id`, on delete cascade | |
| `clicked_at` | `timestamptz` | not null, default `now()` | |
| `visitor_hash` | `varchar(32)` | not null | Keyed hash that stands in for "one visitor on one day for this link". |
| `device_type` | `varchar(16)` | not null | `desktop`, `mobile`, `tablet`, `tv`, or `unknown`. |
| `browser` | `varchar(64)` | not null | Browser name, or `Unknown`. |
| `os` | `varchar(64)` | not null | OS name, or `Unknown`. |

Index: `clicks_link_clicked_idx` on (`link_id`, `clicked_at`), which serves the per-link stats queries.

Deleting a link deletes its clicks.

## Request flows

### Create a link

1. The home page form posts to the `createLinkAction` Server Action (`src/app/actions.ts`) with `url` and `expiresAt`. The visible date-time field (`expiresLocal`) is converted in the browser to an ISO-8601 UTC string in the hidden `expiresAt` field.
2. If only `expiresLocal` arrived (client JavaScript did not run), the action returns `expiry_invalid` instead of silently storing a link that never expires.
3. `createLink` (`src/server/links.ts`) loads and validates the environment, validates the URL, parses the expiry, hashes the client IP, and checks the rate limit, in that order. Any failure returns an error code.
4. It generates a 7-character code and a 43-character secret token, then inserts a row with `ON CONFLICT DO NOTHING`. On a code or token collision it retries, up to 5 attempts, then returns `server_error`.
5. The action returns the short URL (`APP_URL/<code>`), the stats URL (`APP_URL/stats/<token>`), and the expiry. The token exists in plain form only in this response. The database holds its hash, so the stats URL cannot be shown again.

### Redirect

`GET` or `HEAD` on `/<code>` (`src/app/[code]/route.ts`):

1. A code that is not exactly 7 letters or digits gets the 404 page without touching the database.
2. The link is looked up. A database error returns an empty 503.
3. Unknown code: 404 page. Disabled link: 410 page. Expired link: 410 page (checked after disabled).
4. For `GET` only, if the request does not look like a bot or a prefetch, the click is recorded after the response is sent (`after()` from `next/server`), so recording never delays the redirect. A failed insert is logged and ignored.
5. The response is a `302` with `Location` set to the stored URL and `Cache-Control: private, no-store`.

`HEAD` returns the same status and headers without a body and never records a click.

The 404 and 410 pages are rendered as plain HTML strings (`src/components/status-page.ts`), without React, with the same theme tokens as the app.

### Stats

`/stats/<token>` (`src/app/stats/[token]/page.tsx`) hashes the token and looks up `stats_token_hash`. The token is checked against `/^[A-Za-z0-9_-]{43}$/` first, so a malformed token never reaches the database. No match renders the not-found page with a 404. A database error is caught by `error.tsx`.

`getStatsByToken` (`src/server/stats.ts`) returns:

- `totalClicks`: all clicks for the link, with no date limit.
- `daily`: exactly 30 entries, oldest first, ending on the current UTC day. Each has `clicks` (`count(*)`) and `uniques` (`count(DISTINCT visitor_hash)`), grouped by the UTC date of `clicked_at`. Days without clicks are filled with zeros.
- `devices`, `browsers`, `os`: click counts per value over the same 30-day window, sorted by count then name. Only the top 8 values are listed; the rest are summed into one `Other` row.
- `state`: `disabled`, `expired`, or `active`, in that order of precedence. A disabled or expired link still shows its stats.

The window starts at 00:00 UTC, 29 days before today. All times on the page are shown in UTC.

### QR code

`/api/qr/<code>` renders a PNG of `APP_URL/<code>`: 512 px wide, 2-module margin, error correction level M. It does not check that the link exists. The stats page embeds it and offers a download.

## Analytics

A click is recorded only for a `GET` that passes two filters (`src/lib/user-agent.ts`):

- Bot filter: an empty user agent, a Bowser platform type of `bot`, or a user agent matching a pattern list (generic `bot`, `crawler`, `spider`, `slurp`, `preview`, `facebookexternalhit`, `embedly`, `whatsapp`, `headless`, `lighthouse`, `curl`, `wget`, `python-requests`, `go-http-client`, `okhttp`, `axios`, `node-fetch`). `cubot` is explicitly not treated as a bot.
- Prefetch filter: any of `Sec-Purpose` containing `prefetch`, `Purpose: prefetch`, `X-Purpose: preview` or `prefetch`, `X-Moz: prefetch`.

Both filters are heuristics. Some bots slip through and some real clients may be dropped.

For a recorded click the server parses the user agent with Bowser into a device type, browser name, and OS name, and stores those with the timestamp and a visitor hash. The raw user agent and the IP are not stored.

## Hashing and secret tokens

Both IP-derived hashes use `HASH_SECRET` as an HMAC-SHA-256 key and keep the first 32 hex characters (128 bits). Implemented in `src/lib/visitor.ts`. The stats token hash is separate: plain, unkeyed SHA-256, stored as the full 64 hex characters (`src/lib/tokens.ts`).

| Hash | Input | Stored in | Used for |
|---|---|---|---|
| Visitor hash | UTC day, link id, IP, user agent | `clicks.visitor_hash` | Counting unique visitors per link per UTC day. Rotates daily and differs per link, so stored values for the same person do not match across days or links. |
| Creator hash | the literal `create`, IP | `links.creator_ip_hash` | The rate limit (20 new links per hour). Stable per IP: no day in the input, never rotated. |

Because the visitor hash includes the day, "unique visitors" is a per-day figure. Adding the daily numbers over 30 days does not give the number of distinct people.

Client IP comes from the `x-real-ip` header, then the first entry of `x-forwarded-for`, then the string `unknown`. These headers are only trustworthy behind a reverse proxy that overwrites them; see [Operations](operations.md#known-limitations).

Stats tokens: 32 bytes from `crypto.randomBytes`, base64url encoded (43 characters). Only the plain SHA-256 hex digest is stored in `links.stats_token_hash`. The token has 256 bits of entropy, so a fast hash without a key is enough. Anyone holding the stats URL can read the stats; there is no other access control and no recovery if it is lost.

Short codes: 7 characters from `A-Za-z0-9` chosen with `crypto.randomInt`.

## Privacy properties

Stored per link: the destination URL, a keyed hash of the creator's IP (stable, see below), the SHA-256 hash of the stats token, and the timestamps.

Stored per recorded click: the timestamp, the visitor hash, the device type, the browser name, and the OS name.

Not stored: raw IP addresses, raw user agent strings, referrers, cookies, or accounts. The visitor hash does not survive past the UTC day. The creator hash does: `links.creator_ip_hash` is the same on every link one IP creates, it has no daily rotation, and it is never cleared. Anyone with database access can group links by creator, and anyone who also has `HASH_SECRET` can test guesses against it (the IPv4 space is small enough to enumerate). The app sets no cookies of its own. The only browser storage is the theme choice, kept in `localStorage` under the key `stub-theme`.

Stats pages are served with `Cache-Control: private, no-store`, `Referrer-Policy: no-referrer`, `X-Robots-Tag: noindex, nofollow`, and are disallowed in `robots.txt` (`/stats/` and `/api/`). Every response also carries `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and `Referrer-Policy: strict-origin-when-cross-origin` (the stats paths override the last one). These headers are set in `next.config.ts`.

Click rows and link rows are never pruned. Hashes cannot be reversed without `HASH_SECRET`, but the IPv4 space is small, so treat that secret and database backups as sensitive.

## URL validation

Applied in `src/lib/url.ts`, in this order:

1. Trim; empty gives `url_required`.
2. Longer than 2048 characters gives `url_too_long`.
3. Must parse with the WHATWG `URL` parser, otherwise `url_invalid`. A link without a scheme (`example.com/page`) fails here on purpose; the UI hints that `https://` is needed.
4. Protocol must be `http:` or `https:`, otherwise `url_scheme`.
5. The host must contain a dot, otherwise `url_invalid`. This rejects `localhost` and bare hostnames.
6. A username or password in the URL gives `url_credentials`.
7. A host equal to the host of `APP_URL` gives `url_own_domain`. The comparison uses the hostname only: lowercased, trailing dot removed, port ignored. Subdomains and other aliases of the site pass.
8. The normalized `href` must also fit in 2048 characters, otherwise `url_too_long`.

There is no reputation or malware check on destinations.

The stored value is the normalized `href`, not the raw input.
