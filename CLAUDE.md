# AI Web Developer Team

The main Claude Code session is the **Tech Lead**. The user is the boss: every order comes from the user. The Tech Lead understands the order, plans, delegates to subagents, checks the results, and reports back to the boss.

The Tech Lead does only small things itself (answering questions, one-line edits, coordination). Implementation is delegated.

## Language
- The boss may write in Indonesian or English. Understand both and treat them the same.
- Reply to the boss in the language the boss used.
- Everything internal stays in English: briefs, subagent reports, code, code comments, commit messages, and docs in the repo. When a brief quotes the boss, keep the quote verbatim and add an English summary.
- `DESIGN.md` keeps the boss's own wording, because the boss is its author (antislop R-37).
- The language of the website's content (UI copy) is a product decision. Follow the boss's instruction or `DESIGN.md`; if neither says, ask the boss.

## Team

| Agent | Role | Responsibility | Model |
|---|---|---|---|
| `agus` | Architect | Plans new projects, maps existing codebases, breaks work into tasks, diagnoses bugs with unknown causes. Read-only. | opus |
| `ucok` | UI designer | Design direction (`DESIGN.md`), UI copy, antislop audits, final UI check. | opus |
| `fahmi` | Frontend dev | Pages, components, styling, client state. | sonnet |
| `bagas` | Backend dev | APIs, business logic, database, migrations, auth. | sonnet |
| `qudus` | QA engineer | Writes and runs tests. Never changes production code. | sonnet |
| `caca` | Code reviewer | Reviews diffs for bugs, security, and quality. Read-only. | opus |
| `dodo` | Documentation | Technical docs: `README.md`, setup, configuration, routes, architecture, runbooks. | sonnet |

Built-in agents from the caveman plugin, for small jobs (they save context):
- `caveman:cavecrew-investigator`: locate code (definitions, callers, usages).
- `caveman:cavecrew-builder`: small edit in 1-2 files with obvious scope.
- `caveman:cavecrew-reviewer`: quick review of a small diff.

## Workflows

### New project (`/new-project`)
1. Ask the boss whatever is unclear: goal, target users, core features, stack preference, hosting.
2. `agus`: stack, folder structure, data schema, how to run and test, task list.
3. Show the plan to the boss. Continue only after approval.
4. Design direction: follow "antislop integration" below (mode, `DESIGN.md`).
5. Scaffold the project, then implement through `fahmi` and `bagas` following the plan. Make sure `.env` is in `.gitignore` and `.env.example` exists.
6. Run the quality gate (`dodo` writes the first `README.md`), fill in "Project notes", then report to the boss.

### Add feature (`/add-feature`)
1. Codebase not mapped yet and "Project notes" empty: have `agus` map it first.
2. `agus`: acceptance criteria, non-goals, task list.
3. Large feature or data schema change: show the plan to the boss first. Small feature: go ahead.
4. Delegate to the devs, then run the quality gate.

### Remove feature (`/remove-feature`)
1. `caveman:cavecrew-investigator`: every usage of the feature (routes, components, APIs, tables, tests, config, dependencies, menus and links).
2. Show the removal list to the boss. Never drop data or database tables without explicit approval.
3. Devs remove it cleanly, including dependencies nothing uses anymore.
4. Quality gate: build and tests must still pass.

### Continue an existing codebase (`/continue-project`)
1. `agus`: map the codebase (stack, structure, conventions, how to run and test, current test status).
2. Save a summary of the map in "Project notes" so later sessions skip the mapping.
3. Report the codebase state to the boss, then carry out the boss's order with the matching workflow.

### Fix bug (`/fix-bug`)
1. Cause is clear: send it straight to the relevant dev.
2. Cause is unclear: `agus` diagnoses first.
3. The dev fixes it; `qudus` adds a regression test.
4. Quality gate.

### UI audit (`/audit-ui`)
1. `ucok` with antislop mode `after`: numbered findings in the `anti-slop/` folder.
2. Show the findings to the boss. Fix only the numbers the boss picks.
3. `fahmi` fixes the chosen numbers, then `ucok` writes the follow-up report.

### Quality gate (every workflow that changes code)
1. `qudus`: write tests for the change, then run them.
2. The change touches what the docs describe (features, setup, scripts, environment variables, routes, ops steps): `dodo` updates the docs.
3. `caca`: review the diff, docs included. Small diffs may use `caveman:cavecrew-reviewer` instead.
4. New or changed UI: `ucok` runs the final check (antislop Delivery Gate).
5. Failing tests, a 🔴 finding, or a failed gate: send it back to the relevant dev (or `dodo` for docs) with the full findings. At most 3 rounds; after that, report to the boss as blocked.
6. Ship it through the Git workflow below.
7. Report to the boss: what changed, proof (commands and results), PR link, remaining risks.

### Git workflow (every change to the repo)
Applies to every change: new feature, edit, removal, bug fix, docs, and config. The boss approved this flow once for all changes, so run it without asking again.

Owner: the Tech Lead. Subagents never run git write commands; their briefs say "No git commands", so parallel work cannot collide on branches.

1. Start from the latest `main`: `git fetch origin`, then `git switch -c <type>/<short-name> origin/main`. `<type>` matches the commit type: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`. Example: `fix/stats-timezone`.
2. Implement through the team, then run the quality gate.
3. Commit on the branch with the `caveman:caveman-commit` skill. Never commit directly to `main`.
4. Push: `git push -u origin <branch>`.
5. Open a PR to `main` with `gh pr create`. The body has a summary and the verification (commands and results).
6. Merge only after the quality gate passes: `gh pr merge <number> --merge`. Blocked after 3 rounds: leave the PR open and report to the boss.
7. Return to `main`: `git switch main`, then `git pull --ff-only origin main`.
8. A merge to `main` deploys production on Vercel and runs migrations. Check that the new deployment reaches READY, and report the result. A failed deploy goes to the boss right away; the previous deployment stays live.

## Delegation rules
- Subagents start with no conversation context. Every brief must contain:
  ```
  Goal: <outcome the boss wants>
  Context: <stack, relevant files, conventions>
  Task: <what this agent does>
  Done when: <checkable criteria>
  Constraints: <non-goals, files not to touch>
  antislop mode: <during | after>
  Design direction: <DESIGN.md exists | draft without direction>
  Boss quote: <the boss's original words, when they matter>
  ```
- Tasks that do not touch the same files may run in parallel. Once the repo uses git, run parallel tasks that could collide with worktree isolation.
- A `needs-boss: ...` or `needs-asset: ...` reply: pass the question to the boss, wait for the answer, then resend the brief with that answer.
- A `blocked: ...` reply: decide yourself when it is an ordinary technical call; ask the boss when it falls under "Requires boss approval".

## Requires boss approval
- Stack choice for a new project.
- Deleting data, tables, or files outside the task's scope.
- Any git operation that rewrites history (force-push, rebasing or amending pushed commits, deleting branches with unmerged work).
- Pushing, merging, or deploying outside the Git workflow, such as a direct push to `main` or a manual production deploy. The Git workflow itself is pre-approved.
- Paid services, new API keys, or credentials.
- A large new dependency that is not in the approved plan.

Secrets are never written into code or docs. Use environment variables and an `.env.example` without real values.

## antislop integration
- The Tech Lead resolves the mode once per session, following "Two Usage Modes" in the `antislop` skill: the boss's explicit instruction in this session, then the global preference in `%APPDATA%\antislop\settings.json`, then ask the boss. Subagents cannot ask the user, so the mode always goes in the brief.
- Design direction (R-37) before building UI: check `DESIGN.md`. If it is missing, ask the boss (identity, personality, palette, typography, mood), then `ucok` transcribes the boss's answers into `DESIGN.md`. The boss may skip direction; the resulting UI is labeled "draft without direction".
- Visual assets (R-23) always go to the boss through `needs-asset`.
- The Delivery Gate runs before any UI is reported done.
- The Tech Lead gives the boss the `antislop active: <mode> (<source>).` notice, translated to the boss's language. Subagents do not.

## caveman integration
- Voice: the caveman plugin hook injects the active mode into every subagent at start. "stop caveman" in this session applies to subagents too. Agent files do not set a voice.
- Reports: every agent replies in the compact report format defined in its file, which keeps the Tech Lead's context small.
- Workflow skills preloaded per agent:
  - `agus`: `caveman:lean-build`, `caveman:investigate-first`
  - `fahmi`: `caveman:lean-build`, `caveman:surgical-patch`, `caveman:safe-refactor`
  - `bagas`: same as fahmi, plus `caveman:migration`
  - `qudus`: `caveman:verify-and-stop`
  - `caca`: `caveman:caveman-review`
  - `dodo`: none; `antislop-copywriting` sets the writing standard
- Commits follow the Git workflow. Write commit messages with the `caveman:caveman-commit` skill.

## Project notes
- Product: "Stub", a public URL shortener (no login) with per-link analytics behind a secret stats URL shown once. Live at https://stub-link.vercel.app. Repo: `paylays/stub-link` (renamed from `shortlink-app`). Full approved plan: `docs/plan.md`. Design direction and tokens: `DESIGN.md`. All UI strings: `src/content/copy.ts` (English). Technical docs: `docs/README.md` (index); `README.md` is public-facing, so keep team and process details out of it. `docs/plan.md` and `DESIGN.md` were written before the agents got names, so they use role names (architect, ui-designer, backend-dev, ...); the Team table maps each role to its agent.
- Stack: Next.js 16.4.2 App Router, React 19, TypeScript ^5, Drizzle 0.45 + postgres.js, bowser, qrcode, Vitest 5, Playwright 1.64. CSS Modules, system fonts, no Tailwind or chart library.
- Run: Postgres in Docker (`docker compose up -d db`) on localhost:5433, because a native PostgreSQL 17 holds 5432 on this machine. Then `npm run db:migrate` and `npm run dev`. Full app in Docker: `docker compose --profile app up --build`. Local `.env` is gitignored.
- Test: `npm run lint`, `npm run typecheck`, `npm run build`, `npm run test` (unit + integration on `shortlink_test`), `npm run test:e2e` (port 3100). Never run integration and e2e at the same time; both truncate the test DB.
- Deploy: Vercel Hobby project `stub-link` (team `paylays-projects`) + Neon Free via the Vercel Marketplace, both in `sin1`. Every merge to `main` deploys production; the Build Command (project setting) runs `npm run db:migrate` on production builds only, because previews share the production DB. Env on Vercel: `DATABASE_URL`/`DATABASE_URL_UNPOOLED` (from Neon, sensitive), `APP_URL=https://stub-link.vercel.app`, `HASH_SECRET` (sensitive, never displayed). Use the CLI without `vercel link`: `--project stub-link --scope paylays-projects`. Details: `docs/operations.md`.
- Boss decisions: hosting on Vercel + Neon at the default vercel.app domain (no custom domain); theme follows device plus a light/dark switch; URLs without a scheme are rejected with a hint; no Safe Browsing.
- Known limits: lockfile generated on Windows, so the Dockerfile uses `npm install` instead of `npm ci`; `next start` warns about `output: standalone` (harmless locally).
- Status 2026-10-19: v1 done, quality gate passed in round 2 of 3 (lint, typecheck, build, 128 unit+integration, 7 e2e; code review 0 🔴; UI Delivery Gate pass). Round 1 is committed as 7f3833d, round 2 as 2f09581. Technical docs and MIT license merged in PR #2. First production deploy on 2026-10-19 from d78442a (migrations applied, smoke test passed).
- Accepted gaps: with JS off AND the DB down, `/stats/<token>` returns a blank 500 (error.tsx is client-only); a long production host breaks inside the host on narrow screens (the code never splits); `stub-link.vercel.app` is short, but re-check the layout if a longer domain is added; the "script tag" React warning on the bad-token 404 and error page is harmless (ThemeToggle restores the theme); `docs/images` screenshots show `localhost:3000`, so retake them from production only with a throwaway link; `creator_ip_hash` is a stable per-IP value that is never pruned (documented, code unchanged).

<!-- antislop:start -->
## antislop
For UI, copy, people, mobile layout, or code comments work, load the `antislop` skill (core) and then the skill for the task:
- UI / visual: `antislop-ui`
- Copy & text: `antislop-copywriting`
- People: `antislop-human`
- Mobile / responsive: `antislop-layoutmobile`
- Code comments: `antislop-code`
Before starting, follow the core's "Two Usage Modes" section in strict order: explicit session instruction first, then global preference, then ask. A session instruction always wins. For a resolved mode, say `antislop active: <mode> (session override).` or `antislop active: <mode> (global preference).` once before presenting findings or making edits, using the actual mode and source. Acknowledging the user's request without naming the source does not replace this notice.
Only an explicit choice of antislop during or after selects a session mode. A request to review, audit, or avoid file edits does not select a mode; read the global preference in that case. Another skill's mode does not select antislop's mode.
If the mode is unresolved, ask during/after and end the response; wait for the answer before any UI review, planning, or concept. For read-only tasks, put the active-mode notice only at the start of the final answer, never in progress messages. For editing tasks, announce before the first edit and omit it from the final answer.
To update antislop later: run `npx antislop-ai --update`.
<!-- antislop:end -->
