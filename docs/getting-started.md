# Getting started

## Prerequisites

- Node.js 24. The Dockerfile uses `node:24-alpine`.
- npm, which ships with Node.
- Docker with Compose, for the PostgreSQL container (the compose file uses `postgres:17-alpine`).

## Local setup

1. Install dependencies.

   ```bash
   npm install
   ```

2. Create your env file and fill it in.

   ```bash
   cp .env.example .env
   ```

   For the Docker database in this repository, the values are:

   ```
   DATABASE_URL=postgres://shortlink:shortlink@localhost:5433/shortlink
   TEST_DATABASE_URL=postgres://shortlink:shortlink@localhost:5433/shortlink_test
   APP_URL=http://localhost:3000
   HASH_SECRET=<output of the command below>
   ```

   Generate `HASH_SECRET`:

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
   ```

   Every variable is described in [Configuration](configuration.md). `.env` is gitignored; never commit it.

3. Start the database.

   ```bash
   docker compose up -d db
   ```

   The container publishes host port 5433 (not 5432), so it does not clash with a PostgreSQL server already installed on your machine. Set `DB_PORT` in `.env` to use another port, and keep the port in your connection URLs in sync.

   On the first start of an empty volume, an init script (`docker/init-test-db.sql`) also creates the `shortlink_test` database. If the volume already existed before you pulled that script, the test database is not created; see [Operations](operations.md#troubleshooting).

4. Apply migrations.

   ```bash
   npm run db:migrate
   ```

5. Start the dev server.

   ```bash
   npm run dev
   ```

   Open http://localhost:3000.

## Migrating the test database

`npm run test:int` and `npm run test` migrate the test database automatically before they run. Playwright (`npm run test:e2e`) does not, so migrate the test database once before the first end-to-end run. `db:migrate` prefers `DATABASE_URL_UNPOOLED` over `DATABASE_URL` when it is set, and a variable already set in your shell wins over `.env`. Unsetting a variable does not help, because the script reads `.env` again and refills it. Instead, set both `DATABASE_URL` and `DATABASE_URL_UNPOOLED` to the test database URL for one command:

```bash
# bash
DATABASE_URL=postgres://shortlink:shortlink@localhost:5433/shortlink_test \
DATABASE_URL_UNPOOLED=postgres://shortlink:shortlink@localhost:5433/shortlink_test \
npm run db:migrate
```

```powershell
# PowerShell
$env:DATABASE_URL = "postgres://shortlink:shortlink@localhost:5433/shortlink_test"
$env:DATABASE_URL_UNPOOLED = "postgres://shortlink:shortlink@localhost:5433/shortlink_test"
npm run db:migrate
Remove-Item Env:DATABASE_URL, Env:DATABASE_URL_UNPOOLED
```

## Run the whole app in Docker

```bash
docker compose --profile app up --build
```

This builds the image, waits until the database is healthy, applies migrations, and serves the app on http://localhost:3000. The container reads `.env` (so `APP_URL` and `HASH_SECRET` must be set there) and overrides `DATABASE_URL` so it reaches the `db` service on the internal network at `db:5432`.

The compose file binds both published ports (`3000` for the app, `DB_PORT` for the database) to `127.0.0.1`, so nothing is reachable from other machines.

Stop everything with `docker compose --profile app down`. The data stays in the `pgdata` volume; see [Operations](operations.md#backup-and-restore) before removing volumes.

## Next steps

- [Architecture](architecture.md) for how the pieces fit together.
- [Testing](testing.md) before your first change.
