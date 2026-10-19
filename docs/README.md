# Stub documentation

Technical documentation for Stub, a public URL shortener with per-link analytics. For a product overview, see the [project README](../README.md).

| Document | What it covers |
|---|---|
| [Getting started](getting-started.md) | Prerequisites, local setup, database in Docker, migrations, running the dev server, running the whole app in Docker |
| [Configuration](configuration.md) | Every environment variable, defaults, how to generate `HASH_SECRET` |
| [Architecture](architecture.md) | Folder structure, request flows, data model, analytics, hashing, privacy properties |
| [Routes and API](api.md) | Every page and API route, validation rules, status codes, rate limit, error codes |
| [Testing](testing.md) | Test layers, commands, database requirements, why tests must not run in parallel |
| [Operations](operations.md) | Migrations, backup and restore, link takedown, troubleshooting, deploying on Vercel + Neon, self-hosting notes, known limitations |
| [npm scripts](scripts.md) | Every script in `package.json` |

All user-facing strings live in `src/content/copy.ts`. The project is released under the [MIT License](../LICENSE).
