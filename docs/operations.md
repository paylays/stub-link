# Operations

## Migrations

Migrations are plain SQL files in `drizzle/`, tracked by `drizzle/meta/_journal.json`. Drizzle records applied migrations in the database, so running the migrator again is safe.

Apply pending migrations:

```bash
npm run db:migrate
```

The runner is `scripts/migrate.mjs`. It uses `DATABASE_URL_UNPOOLED` when set and falls back to `DATABASE_URL`. It prints `Migrations applied` on success and exits with a non-zero code on failure. The Docker image runs it on every container start, before the server.

### Create a new migration

1. Edit `src/server/db/schema.ts`.
2. Generate the SQL:

   ```bash
   npm run db:generate
   ```

   This writes a new numbered file and snapshot into `drizzle/`. Configuration is in `drizzle.config.ts`.
3. Read the generated SQL. Drops and type changes can lose data.
4. Apply it with `npm run db:migrate`, then run the tests. `npm run test` migrates the test database itself; migrate it yourself before `npm run test:e2e` (see [Getting started](getting-started.md#migrating-the-test-database)).
5. Commit the new files in `drizzle/` together with the schema change. Do not edit a migration that has already been applied elsewhere; add a new one.

## Backup and restore

Data lives in the Docker volume `pgdata` (Compose prefixes the project name). Back up with `pg_dump` rather than copying files.

These commands run `pg_dump` and `psql` inside the container and copy the file with `docker compose cp`, so they work the same in bash and PowerShell. Shell redirection would corrupt the dump in Windows PowerShell 5.1.

Back up the main database:

```bash
docker compose exec db sh -c 'pg_dump -U "$POSTGRES_USER" -d shortlink -f /tmp/shortlink-backup.sql'
docker compose cp db:/tmp/shortlink-backup.sql ./shortlink-backup.sql
```

Restore into an empty `shortlink` database. The dump contains the schema, so do not run migrations first. Start only the database (`docker compose up -d db`), not the `app` profile: the app container runs migrations on every start and would create tables before the restore.

```bash
docker compose cp ./shortlink-backup.sql db:/tmp/shortlink-backup.sql
docker compose exec db sh -c 'psql -U "$POSTGRES_USER" -d shortlink -v ON_ERROR_STOP=1 --single-transaction -f /tmp/shortlink-backup.sql'
```

`ON_ERROR_STOP` and `--single-transaction` make a failed restore exit non-zero and roll back instead of leaving a half-loaded database.

To restore over a database that already has tables, first stop the `app` service, the dev server, and any open `psql` session, because `dropdb` fails while other clients are connected. `--force` (PostgreSQL 13 and later; the image is `postgres:17-alpine`) disconnects them for you. Then recreate the database:

```bash
docker compose --profile app stop app
docker compose exec db sh -c 'dropdb --force -U "$POSTGRES_USER" shortlink && createdb -U "$POSTGRES_USER" shortlink'
```

Then run the restore commands above. Or restore into a fresh volume.

`docker compose down -v` deletes the volume and all data. `docker compose down` without `-v` keeps it. After a volume is recreated, the init script creates `shortlink_test` again, and you need to run `npm run db:migrate` for the main database.

Treat backups as sensitive. They contain destination URLs, token hashes, creator IP hashes, and visitor hashes.

## Disable a link (takedown)

There is no admin interface. Disable a link with SQL; its short URL then returns `410` and stops counting clicks. Its stats page keeps working and shows the state "Disabled".

```sql
UPDATE links SET disabled_at = now() WHERE code = '<code>';
```

Run it with `psql` inside the container:

```bash
docker compose exec db sh -c 'psql -U "$POSTGRES_USER" -d shortlink'
```

To re-enable, set `disabled_at` back to `NULL`. To delete a link and its clicks, run `DELETE FROM links WHERE code = '<code>';` (clicks go with it through the cascade).

## Troubleshooting

**Port 5432 is taken, or the database port clashes.** Compose already publishes the database on 5433. If 5433 is also taken, set `DB_PORT` in `.env`, update the port in `DATABASE_URL` and `TEST_DATABASE_URL`, and run `docker compose up -d db` again.

**Port 3000 or 3100 is in use.** Stop the other process. Port 3000 is the dev server and the Docker app; 3100 is the end-to-end server, which refuses to reuse a running one.

**`Missing required env var ...` / `HASH_SECRET must be at least 32 characters` / `APP_URL must be an absolute http(s) URL`.** Check `.env` against [Configuration](configuration.md). Symptoms: link creation shows the `server_error` message; redirects return an empty `503` and log `redirect lookup failed:`; the stats page shows its error page; the QR route returns `500`. The real cause is in the server log.

**`DATABASE_URL is not set` when running `npm run db:migrate`.** `.env` is missing or does not define `DATABASE_URL`.

**`database "shortlink_test" does not exist`.** The init script only runs the first time the volume is created. If your volume predates it, create the database by hand:

```bash
docker compose exec db sh -c 'psql -U "$POSTGRES_USER" -d shortlink -c "CREATE DATABASE shortlink_test;"'
```

Then migrate it as described in [Getting started](getting-started.md#migrating-the-test-database).

**`TEST_DATABASE_URL is not set`, or `database name must end with _test`.** Set `TEST_DATABASE_URL` in `.env` to a database whose name ends in `_test`.

**Authentication fails after changing `POSTGRES_USER` or `POSTGRES_PASSWORD`.** The container applies those values only when it creates the volume. Revert them, or recreate the volume (this deletes data; back up first).

**Clicks are not showing up.** Requests with a missing or bot-like user agent (`curl`, `wget`, headless browsers, link previewers) and prefetch requests are not recorded on purpose. Test with a real browser. Also check that the link is not expired or disabled.

**The Docker app exits right after start.** The container runs `scripts/migrate.mjs` first. Read the log with `docker compose --profile app logs app`; a failed migration or missing variable in `.env` is the usual cause.

## Production deployment (Vercel + Neon)

Stub runs at https://stub-link.vercel.app. The app is hosted on Vercel and the database is Neon Postgres, both in Singapore (`sin1`).

```text
GitHub (main) -> Vercel build -> Vercel functions (sin1) -> Neon Postgres (sin1)
```

- Source: the GitHub repository `paylays/stub-link`. The Vercel project is also named `stub-link` and lives in the `paylays-projects` team, on the Hobby plan. GitHub still redirects the old repository name `shortlink-app`.
- Region: the function region is `sin1`. It is a project setting in Vercel, not a file in the repository. Node.js is 24.x.
- Database: Neon Postgres, Free plan, region `sin1`, added through the Vercel Marketplace (Storage tab).

### What runs on each deploy

Every push or merge to `main` builds and deploys to production. Every pull request branch gets a preview deployment.

The Build Command is a project setting, not a file in the repository:

```bash
if [ "$VERCEL_ENV" = "production" ]; then npm run db:migrate; fi && npm run build
```

- Production builds run `npm run db:migrate` first (see [Migrations](#migrations)), then `next build`. The build log shows `Migrations applied`.
- Preview builds skip migrations, because previews share the production database (see [Previews share the production database](#previews-share-the-production-database)).
- A failed migration fails the build, so the previous deployment stays live.

### Environment variables

| Name | Set by | Type | Targets |
|---|---|---|---|
| `DATABASE_URL` | Neon integration | Sensitive, pooled connection string | Preview, Production |
| `DATABASE_URL_UNPOOLED` | Neon integration | Sensitive, direct connection string | Preview, Production |
| `APP_URL` | Manual, value `https://stub-link.vercel.app` | Config (plain) | Preview, Production |
| `HASH_SECRET` | Manual, 32 random bytes | Sensitive | Preview, Production |

The integration also injects other `PG*` and `POSTGRES_*` variables. The app ignores them. For what each variable means, see [Configuration](configuration.md). The migration script prefers `DATABASE_URL_UNPOOLED`, so migrations use the direct connection.

Sensitive values cannot be read back from Vercel, only overwritten. Do not rotate `HASH_SECRET` casually: it keys the IP and visitor hashes, so a new value splits the history of unique visitors and of creator rate limits from that point on.

### Change an environment variable

Edit it in the Vercel dashboard (Project > Settings > Environment Variables), or with the Vercel CLI. These commands pass the project and team explicitly, so no `vercel link` is needed:

```bash
vercel env ls --project stub-link --scope paylays-projects
printf '%s' "<value>" | vercel env add NAME production --project stub-link --scope paylays-projects --force --yes
printf '%s' "<value>" | vercel env add NAME preview --project stub-link --scope paylays-projects --force --yes
```

Run the command once per target. Every variable in the table above targets both Production and Preview. `--force` overwrites an existing value. Add `--sensitive` for secrets. Piping the value keeps it out of the terminal output. `vercel link` creates a `.vercel/` folder, which is gitignored.

A changed variable only applies to new deployments. Redeploy after changing one.

### Roll back

In the Vercel dashboard, open Deployments and use Instant Rollback on an earlier deployment. Rollback restores code only, not the database. Write each migration so the previous code still works with the new schema.

### Deployment Protection

The project uses Vercel Authentication with "all except custom domains". The production domain `stub-link.vercel.app` is public. Per-deployment URLs (`stub-link-<hash>-paylays-projects.vercel.app`) and preview deployments redirect to a Vercel login (`302`).

### Client IP headers

Vercel overwrites `x-forwarded-for` with the client IP and does not pass on values sent by the client. `x-real-ip` carries the same value. The app reads `x-real-ip`, then `x-forwarded-for`, so on Vercel the rate limit and the visitor hash use the real client IP. See [Vercel request headers](https://vercel.com/docs/headers/request-headers).

### Previews share the production database

Preview deployments receive the same `DATABASE_URL`, so they read and write production data. Links created on a preview exist in production. This is why preview builds do not migrate: a migration from an unmerged branch would change the production schema.

### Limits

- Neon Free: 1 GB of storage per project and 100 CU-hours per month. Compute scales to zero after 5 minutes without traffic, so the first request after an idle period is slower.
- Vercel Hobby is for personal, non-commercial use.
- The database client uses at most 5 connections per instance and sets `prepare: false`, which suits the pooled connection.

### Back up the production database

Vercel cannot hand out Sensitive variables. Open the Vercel project, go to Storage, and open the database in the Neon console. Copy the connection string from there and use `pg_dump` and `psql` against it. The advice on handling backups in [Backup and restore](#backup-and-restore) applies: they contain destination URLs and hashes.

## Self-hosting notes

The Docker setup in [Getting started](getting-started.md) is meant for local use. For another host you need:

- Node.js 24 (or the Docker image), a PostgreSQL database, and the variables `DATABASE_URL`, `APP_URL`, and `HASH_SECRET`. `APP_URL` must be the public origin, because it is baked into short URLs and QR codes.
- Migrations applied before traffic reaches a new release. Run `npm run db:migrate`; the Docker image does this on start.
- A reverse proxy that overwrites `x-real-ip` and `x-forwarded-for`. The app reads the client IP from `x-real-ip`, then `x-forwarded-for`; without a proxy that sets them, clients can spoof their IP and bypass the creation rate limit.
- The image listens on port 3000 and runs as a non-root user.

## Known limitations

- A lost stats URL cannot be recovered. Only a hash of the secret is stored.
- With JavaScript disabled and the database down, `/stats/<token>` returns a blank `500` page, because `error.tsx` is a client component and does not render without JavaScript.
- The rate limit is best effort. Visitors behind a shared IP (carrier-grade NAT, offices) share one budget of 20 links per hour. It counts and then inserts without a lock, so parallel requests can exceed 20.
- When self-hosting without a trusted reverse proxy, the IP headers can be spoofed, which defeats the rate limit. This does not apply on Vercel, which sets them itself (see [Client IP headers](#client-ip-headers)).
- Unique visitors are counted per link per UTC day. The sum over 30 days is not a count of distinct people.
- Bot and prefetch filtering is a heuristic. Some automated traffic is counted, and some real traffic may not be.
- Click rows are never pruned, so the `clicks` table only grows. Link rows are not pruned either, and `links.creator_ip_hash` is a stable per-IP value that is never cleared. On the Neon Free plan the 1 GB storage limit is the ceiling.
- Links are not checked against a reputation or malware list.
- The production host `stub-link.vercel.app` is 20 characters long. The code never splits the host, so on very narrow screens it can overflow inside the host display. Re-check the layout if the domain changes.
- `npm run start` prints a warning that `output: 'standalone'` is set. It is harmless for local runs.
