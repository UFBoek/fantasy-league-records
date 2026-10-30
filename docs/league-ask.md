# Ask FIG — league stat search

Ask FIG is a read-only, client-side interface using the same published, finalized JSON snapshots as the rest of the site. It does not change Sleeper data, league calculations, the automated update workflow, or existing routes.

## Entry points

The site header has an ASK FIG search button on mobile and desktop. The home screen also has a full-size search form below its hero. The feature has dedicated routes beginning with #/ask.

## Currently supported

- Regular-season and playoff wins, losses, team scoring totals, PPG, points against and records.
- Head-to-head records, single-matchup scores and opponent-specific win leaderboards.
- Single-game scoring highs/lows, closest games, blowouts and scoring thresholds such as 200+ weeks.
- Historical started fantasy players' points, PPG, scoring highs and start counts, optionally filtered by team.
- Archived completed trade counts, with a multi-team transaction counted once.
- Draft selections, player draft ownership, selected seasons, positions and years.
- Finalized season and week filters, including since a given year or week.

Without an explicit game type, answers use Regular Season. Queries for Playoffs or combined games must say so. The interpreted scope is displayed in the result. A week-only question uses the latest published season. Player stats count starting lineup points, never bench production.

Results are calculated only from data/games.json, data/player_game_log.json, data/trades.json, or data/draft_picks.json. Result rows link to existing teams, games, and players where possible.

## Limitations

This is a deterministic natural-language first version, not a general LLM-powered assistant. It recognizes useful forms of questions but not every conceivable question. Unsupported questions receive an explicit failure rather than an invented answer. It does not yet interpret lineup slot starts, streaks, all-play, injury history, dynasty market values, predictions, arbitrary joins or year-by-year season extremes.

## Full StatMuse-style search: next phase

1. Define a versioned, validated query schema with allowed metrics, entity identifiers, season/week filters, aggregation and ranking rules.
2. Use a server-side, rate-limited AI endpoint solely to translate unrestricted natural-language questions into that schema. Never embed an API key in the public GitHub Pages frontend.
3. Run the approved query with deterministic arithmetic over published league snapshots. The model must never invent the numbers or execute arbitrary SQL/code.
4. Show the interpreted filters, number of source records, and clickable links to underlying evidence. Clarify ambiguous questions.
5. Cache repeated queries, log non-identifying failed intents, and regression-test calculations during weekly refreshes.

## Validation

Run node tests/test_league_ask.js, or bash scripts/check_website_tests.sh.
The service worker and stylesheet bundler include the new assets. Production is unchanged until the branch is reviewed and merged.
