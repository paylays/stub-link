# Testing

Three layers, all in `tests/`. Vitest 5 runs unit and integration tests (`vitest.config.mts`); Playwright runs end-to-end tests (`playwright.config.ts`).

| Layer | Command | Location | Needs |
|---|---|---|---|
| Unit | `npm run test:unit` | `tests/unit/` | Nothing. No database. |
| Integration | `npm run test:int` | `tests/integration/` | Running database, `TEST_DATABASE_URL`, `HASH_SECRET` |
| Unit and integration together | `npm run test` | both | Same as integration |
| End to end | `npm run test:e2e` | `tests/e2e/` | Running database, a migrated test database, `TEST_DATABASE_URL`, `HASH_SECRET`, Chromium |

Static checks: `npm run lint` and `npm run typecheck`. `npm run build` also catches type errors.

## What each layer covers

- Unit: code and token generation, URL validation, expiry parsing, UTC day helpers, user-agent parsing and bot/prefetch detection, visitor hashing, environment validation.
- Integration: `createLink`, the `createLinkAction` field handling, the redirect behaviour, and `getStatsByToken` (unique visitors, 30 daily entries, top 8 plus `Other`, bad tokens), against a real PostgreSQL database.
- End to end: create a link in the browser, follow the short URL, check the stats page shows the click; `javascript:` URLs are refused; an expired link shows the 410 page; the theme switch persists across reloads; a bad stats token returns the 404 page, and that page keeps a stored dark theme and shows the switch; the "shorten another link" button resets the form.

## Database requirements

Start the database with `docker compose up -d db`. Set `TEST_DATABASE_URL` in `.env` (see [Configuration](configuration.md)).

- The database name in `TEST_DATABASE_URL` must end with `_test`. The integration setup and the e2e spec both refuse to run otherwise, so a mistaken URL cannot wipe your development data.
- The integration project overrides `DATABASE_URL` with `TEST_DATABASE_URL`, so the app code under test only sees the test database.
- The integration project migrates the test database itself before running (its global setup applies `drizzle/`). End-to-end tests do not; migrate the test database once first. See [Getting started](getting-started.md#migrating-the-test-database).
- Before every integration test, before every e2e test, and once after the e2e run, the tests run `TRUNCATE links, clicks RESTART IDENTITY CASCADE` on the test database.

## Do not run integration and e2e at the same time

Both layers empty the same tables in the same test database. Running them concurrently makes tests delete each other's rows and fail at random. Run them one after the other. Within each layer the tests already run serially (`fileParallelism: false` for integration, `workers: 1` and `fullyParallel: false` for Playwright).

## End-to-end tests

Install the browser once:

```bash
npx playwright install chromium
```

Then run:

```bash
npm run test:e2e
```

Playwright starts its own server with `npm run build && npm start -- -p 3100` (so a build runs every time; the start timeout is 180 seconds). It sets `APP_URL` to `http://localhost:3100` and `DATABASE_URL` to `TEST_DATABASE_URL` for that server. Port 3100 must be free, because the config does not reuse an existing server.

The tests use a regular Chrome user agent string. The default headless Chromium user agent contains `HeadlessChrome`, which the bot filter rejects (it matches `headless`), so clicks would never be recorded.

## Before sending a change

```bash
npm run lint
npm run typecheck
npm run build
npm run test
npm run test:e2e
```

Run `test` and `test:e2e` one after the other, never together.
