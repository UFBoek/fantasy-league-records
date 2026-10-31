# BoekMuse v2: dynamic league analytics

## Purpose

BoekMuse now has an open-ended query architecture. The Gemini 3.8 Flash model (when configured) translates ordinary English into **new SQLite SELECT queries**. Cloudflare D1 executes the query against a read-only, versioned league archive. This replaces the fixed-metric parser as the active public search engine; no new calculation needs to be hardcoded for each statistical question.

**Current AI configuration:** Gemini 3.8 Flash `gemini-3.8-flash` is the preferred SQL planner when the Cloudflare Worker has the **encrypted secret** `GEMINI_API_KEY`. Without that secret, or during Gemini API failures/429 quotas, BoekMuse continues to use the existing Workers AI `@cf/meta/llama-3.3-70b-instruct-fp8-fast`. Neither the website nor GitHub stores the API key. The query response includes `ai_provider` and `model` for verification. Cloudflare D1 remains the database; this change does not bypass its separate free write cap. Google states free-tier Gemini inputs may be used to improve its products.

## Architecture

- `workers/boekmuse-v2/src/index.js`: Cloudflare Worker, D1 schema and versioned archive mirror, Gemini-first SQL planner with Workers AI fallback, SQL-safety validation, exact D1 query execution, rate limiting, cron synchronization.
- `workers/boekmuse-v2/wrangler.jsonc`: deploy config with D1 and Workers AI bindings.
- `boekmuse-dynamic.js`: responsive UI response adapter, derived click-through links, basic follow-up context, exact query trace.
- `league-ask-v220.js`: existing `#/boekmuse` page, now calls dynamic SQL engine only; if unavailable, **does not silently fall back** to keyword or fixed-metric answers.
- `league-ask-v220.css`: visible calculation and expandable read-only SQL source.
- Cloudflare D1 database name: `boekmuse-league-analytics`. Workers deployment: `boekmuse-sql`.
- Source: `https://ufboek.github.io/fantasy-league-records/data/` (only published, finalized snapshot).

The D1 database holds a generation-controlled mirror of `games`, `starts`, `td_coverage`, `team_seasons`, `trades`, `trade_participants`, `trade_assets` and `draft_picks`. A scheduled sync runs every ten minutes. It downloads sources into a new generation, validates them, writes all tables and only then switches the active generation; it removes old generations after success. **Failed syncs leave the previous complete generation active**. `/health` exposes the active source timestamp, and `/bootstrap` initializes an empty database.

## Integrity guarantees and limits

- **SQL read-only:** SELECT/non-recursive WITH only. Internal tables, writes, comments, multiple statements, dangerous functions and unbounded result sets are rejected. Only D1 has access to league data.
- **No invented numeric facts:** The AI produces queries and a description, never the returned scores. SQL rows and calculated results come from D1. Results are capped at 100 and the exact SQL is visible.
- **Touchdowns:** Generated touchdown SQL must use actual player stats and verified `td_coverage`. Independent server-side coverage checks block incomplete team-week aggregate answers, even if a model would have omitted those weeks. Non-QB TDs are rushing+receiving scores of starting RB/WR/TE/FB only.
- **Not every question is answerable:** raw receiving/rushing yards, unavailable injury timelines, future outcomes, unrecorded bench data and unsupported relations will yield an unavailable/error response. A correct-looking SQL query can still misunderstand intent; display the question interpretation and SQL so league users can verify.
- **Rate limits:** 6 queries/client/minute; 35 globally/minute. These are abuse protections, not a guarantee of a specific free daily quota.

## Verified

GitHub Actions live smoke tests: real D1 bootstrap, 2026 non-QB Boek touchdowns by week, 3 WRs scoring 20+ in the same week, Boek outscoring Hayden but losing, Josh Allen draft ownership, and an attempt to issue a DROP TABLE query. Dynamic SQL unit tests cover safety, versioned data normalization and frontend result formatting. The existing website has a separate **pre-existing** dynasty-market snapshot metadata assertion at `tests/test_dynasty_market.js:68`; the BoekMuse code doesn't modify that section.

Run local static tests with `node tests/test_boekmuse_dynamic.js`. The live tests use `node tests/test_boekmuse_dynamic_live.js` and the deployed Cloudflare service, consuming some free AI allowance.

## Deploying updates

Source changes to Worker code **do not auto-deploy** from GitHub. Use Cloudflare API or Wrangler (from `workers/boekmuse-v2/`) to deploy the new Worker and ensure the D1 binding and cron schedule remain present. GitHub Pages deploys the frontend automatically from `main`.

## v3 — complete published FIG dataset coverage (feature branch)

BoekMuse now indexes **all 63 JSON datasets** published under `data/`, excluding only `manifest.json` and `refresh_manifest.json` (metadata). Coverage is determined from `data/manifest.json` plus the 19 additional advanced datasets that are published outside that manifest. The source list includes every live/historical league data file currently in the repository, notably:

- Historical games, lineups, game logs, complete weekly rosters (including bench and lineup slots), player seasons/careers, matchups and all-play
- Trades, individual transferred assets, transaction histories, startup and rookie drafts, graded pick outcomes and future pick ownership
- Records, streaks, standings, playoff results, season accomplishments, injury annotations and waiver activity
- Current rosters, RosterAudit values, dynasty market snapshots, dynasty-dominance and playoff projection files

**How it works:** Existing curated SQL tables retain verified league scoring calculations. A second D1 layer stores each original public JSON source in ~44 KB SQL-queryable chunks. Objects keep their source keys, while nested arrays and objects remain intact. SQL can expand the raw records with SQLite `json_each` and extract existing fields using `json_extract`. The AI planner receives the live catalog of indexed dataset names, sections, fields and example structures. It can therefore create new queries against fields not previously hardcoded in BoekMuse.

**Source integrity:** Future projections, current rosters, valuations and injury reviews are presented as published snapshots, not completed historical results. The existing finalized-game and verified touchdown gates remain. Read-only SQL restrictions apply to the new source views; internal sync tables are not exposed. This is access to **published** site data, not private Sleeper or Google Sheets records that have not been published.

**Synchronization:** Cloudflare cron checks up to 20 datasets every ten minutes, prioritizing not-yet-indexed files, then oldest-checked sources. An initial full index is staged across multiple cron runs. Each source uses a content hash and an atomic generation pointer; unchanged JSON avoids D1 writes. The curated SQL tables now also use per-table content hashes and atomic generation switches, rather than rewriting every table whenever the manifest timestamp changes. This is important for Cloudflare D1's enforced free daily row-write limit.

**Status:** `GET /health` includes `archive.sources`, `archive.total`, `archive.records`, and `archive.chunks`. All sources are fully queryable only after `archive.sources === archive.total`. Cloudflare Worker changes require a separate deployment; GitHub commit alone does not update the deployed Worker.

**Validation:** `node tests/test_boekmuse_full_archive.js`, `node tests/test_boekmuse_dynamic.js`. The original game and touchdown checks remain, with a new read-only SQL guard for internal metadata.

## Enable Gemini 3.8 Flash (one-time secret setup)

1. Create a **free Gemini API key** at https://aistudio.google.com/apikey for a project with Gemini 3.8 Flash enabled. Check the Google AI Studio rate limits for that project.
2. In Cloudflare dashboard, go to **Workers & Pages → boekmuse-sql → Settings → Variables and Secrets → Add**. Create an encrypted **Secret** named `GEMINI_API_KEY`, paste the API key, save/deploy. Do **not** commit or send the key in chat, GitHub, or browser JavaScript.
3. Load `https://boekmuse-sql.fig-league-archive.workers.dev/health`. `gemini_configured: true` means the secret is present, **not** proof it is valid. Perform a real query and check `ai_provider: "gemini"` and `model: "gemini-3.8-flash"` to verify a successful Gemini answer. `workers-ai-fallback` indicates Gemini couldn't complete the request.
4. Deploying new Worker source via Cloudflare's multipart API must **inherit/preserve** `GEMINI_API_KEY` along with AI, DB, rate limiters and origins, or you'll revert to Workers AI.

The website keeps its current `#/boekmuse` interface and SQL safety/verification. Gemini handles interpretation only; D1 computes all numerical answers. Gemini cannot answer unpublished league facts or data not yet indexed in D1. Queries may contain questions and public league source fields sent to Google. Tests: `node tests/test_boekmuse_gemini.js` and existing BoekMuse tests.
