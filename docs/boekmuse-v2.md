# BoekMuse v2: dynamic league analytics

## Purpose

BoekMuse now has an open-ended query architecture. The Cloudflare AI model translates ordinary English into **new SQLite SELECT queries**. Cloudflare D1 executes the query against a read-only, versioned league archive. This replaces the fixed-metric parser as the active public search engine; no new calculation needs to be hardcoded for each statistical question.

**Current AI:** Cloudflare Workers AI `@cf/meta/llama-3.3-70b-instruct-fp8-fast`. It remains eligible for the Cloudflare free daily allowance. No OpenAI or Google API key, paid account, or subscription was added. Public site users do not see API credentials.

## Architecture

- `workers/boekmuse-v2/src/index.js`: Cloudflare Worker, D1 schema and versioned archive mirror, free Workers AI SQL planner, SQL-safety validation, exact D1 query execution, rate limiting, cron synchronization.
- `workers/boekmuse-v2/wrangler.jsonc`: deploy config with D1 and Workers AI bindings.
- `boekmuse-dynamic.js`: responsive UI response adapter, derived click-through links, basic follow-up context, exact query trace.
- `league-ask-v220.js`: existing `#/boekmuse` page, now calls dynamic SQL engine only; if unavailable, **does not silently fall back** to keyword or fixed-metric answers.
- `league-ask-v220.css`: visible calculation and expandable read-only SQL source.
- Cloudflare D1 database name: `boekmuse-league-analytics`. Workers deployment: `boekmuse-sql`.
- Source: `https://ufboek.github.io/fantasy-league-records/data/` (only published, finalized snapshot).

The D1 database holds a generation-controlled mirror of `games`, `starts`, `td_coverage`, `team_seasons`, `trades`, `trade_participants`, `trade_assets` and `draft_picks`. A scheduled sync runs every 30 minutes. It downloads sources into a new generation, validates them, writes all tables and only then switches the active generation; it removes old generations after success. **Failed syncs leave the previous complete generation active**. `/health` exposes the active source timestamp, and `/bootstrap` initializes an empty database.

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
