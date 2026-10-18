# npm scripts

All scripts are defined in `package.json`.

| Script | Runs | Notes |
|---|---|---|
| `npm run dev` | `next dev` | Dev server on port 3000. |
| `npm run build` | `next build` | Production build. Works without env vars; they are read when the app handles a request. |
| `npm run start` | `next start` | Serves the production build. Prints a warning about `output: 'standalone'`; it is harmless for local use. |
| `npm run lint` | `eslint .` | |
| `npm run typecheck` | `tsc --noEmit` | |
| `npm run db:generate` | `drizzle-kit generate` | Writes a new SQL migration into `drizzle/` from changes in `src/server/db/schema.ts`. |
| `npm run db:migrate` | `node --env-file-if-exists=.env scripts/migrate.mjs` | Applies pending migrations. Reads `.env` when it exists. |
| `npm run test` | `vitest run` | Unit and integration projects. Needs the database. |
| `npm run test:unit` | `vitest run --project unit` | No database needed. |
| `npm run test:int` | `vitest run --project integration` | Needs the database and `TEST_DATABASE_URL`. |
| `npm run test:e2e` | `playwright test` | Builds the app and serves it on port 3100. See [Testing](testing.md). |
