# Configuration

Configuration comes from environment variables. For local work, put them in `.env` (gitignored). `.env.example` lists the names and placeholder values. The app reads variables lazily, when it handles a request, so `npm run build` works without any of them.

## Application variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | yes | none | PostgreSQL connection string used by the app and by `npm run db:migrate`. |
| `APP_URL` | yes | none | Public origin of the site, for example `http://localhost:3000`. Must be an absolute `http` or `https` URL; trailing slashes are removed. Used to build short URLs, stats URLs, and QR codes, and to reject links that point at the site's own host. |
| `HASH_SECRET` | yes | none | Secret key for the HMAC hashes of IP addresses and visitors. At least 32 characters. |
| `DATABASE_URL_UNPOOLED` | no | unset | Direct (non-pooled) connection string. Only `scripts/migrate.mjs` reads it, and prefers it over `DATABASE_URL` when set. Use it on hosts that put a connection pooler in front of the database. Compose overrides only `DATABASE_URL` for the `app` profile, so do not set this variable in the `.env` that the `app` container reads; the migrator would use it instead of the container database. |
| `TEST_DATABASE_URL` | for tests | none | Connection string of the test database. Its database name must end with `_test`; integration and end-to-end tests refuse anything else. Not needed at runtime. |

On Vercel, the project settings hold these values and the Neon integration provides `DATABASE_URL` and `DATABASE_URL_UNPOOLED`. See [Deploy your own copy on Vercel + Neon](operations.md#deploy-your-own-copy-on-vercel--neon) for who sets what.

A missing variable raises `Missing required env var <NAME>`. A short `HASH_SECRET` raises `HASH_SECRET must be at least 32 characters`. A bad `APP_URL` raises `APP_URL must be an absolute http(s) URL`.

### Generate `HASH_SECRET`

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

This prints 43 characters. Keep it stable: changing it later changes every hash the app computes. Stats URLs keep working (they do not use this secret), but creation rate-limit buckets reset, and a visitor who clicked earlier on the UTC day of the change can be counted twice for that day. Counts for earlier days stay as they are.

## Docker Compose variables

These are read by `docker-compose.yml` from your shell or from `.env`. All are optional and the defaults are for local development only.

| Variable | Default | Description |
|---|---|---|
| `POSTGRES_USER` | `shortlink` | Database user the container creates. |
| `POSTGRES_PASSWORD` | `shortlink` | Password for that user. |
| `DB_PORT` | `5433` | Host port the database is published on (bound to `127.0.0.1`). The container always listens on 5432 inside. |

The database name is fixed to `shortlink`. The init script adds `shortlink_test`.

Notes:

- `POSTGRES_USER` and `POSTGRES_PASSWORD` are applied only when the volume is first created. Changing them later does not change an existing database; you would have to change the role inside PostgreSQL or recreate the volume.
- Your `DATABASE_URL` and `TEST_DATABASE_URL` must use the same user, password, and port as the container.
- The password must be URL-safe: letters, digits, `-`, `_`, `.`. Otherwise percent-encode it inside `DATABASE_URL` and `TEST_DATABASE_URL`. The compose file inserts the raw password into the app container's `DATABASE_URL`, so for the `app` profile keep it URL-safe.

## What the Docker image sets itself

The runtime stage of the `Dockerfile` sets `NODE_ENV=production`, `HOSTNAME=0.0.0.0`, `PORT=3000`, and `NEXT_TELEMETRY_DISABLED=1`. You do not need to set these.
