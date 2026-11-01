# FIG Hall of Fame: Legacy Points 2.0

## Eligibility
A player reaches Hall of Fame consideration at **450 career Legacy Points**, regardless of QB, RB, WR, or TE position. The threshold replaces the former three-of-five requirements; it is **not** automatic induction. Josh Allen and Puka Nacua remain the founding class, with the separately enshrined Hayden 2025 season unchanged.

This iteration targets a **60% completed-season / 40% individual-game** balance across published FIG data. The target is aggregate, not a fixed per-player proportion. Regular season and playoff FIG starts are included. Bench performances do not earn points.

## Completed-season PPG awards
One nonstacking award for the highest qualifying tier per completed season, requiring at least **eight official FIG starts**. Use exact, unrounded All-Time Combined PPG. Season points are not awarded during an unfinished season.

| Points | QB | RB | WR | TE |
|---:|---:|---:|---:|---:|
| 30 | 25 | 16 | 15.5 | 13.5 |
| 50 | 26.5 | 18.5 | 18.5 | 15 |
| 70 | 28.5 | 19.5 | 19.5 | 16 |
| 95 | 29.5 | 22.5 | 21.5 | 17 |
| 120 | 32 | 26 | 25 | 18.5 |
| 145 | 34.5 | 28 | 27.5 | 20.5 |
| 175 | 37.5 | 30 | 30 | 22.5 |
| 205 | 41 | 33 | 33 | 25 |

## Individual-game bonuses
Each verified FIG starter game earns **only the highest reached scoring band**. The five bands are 20+, 30+, 40+, 50+, and 60+. The 20-point threshold is inclusive and applies to all positions.

| Game score | QB | RB | WR | TE |
|---:|---:|---:|---:|---:|
| 20-29.99 | 1 | 2 | 2 | 3 |
| 30-39.99 | 3 | 5 | 5 | 10 |
| 40-49.99 | 7 | 10 | 10 | 18 |
| 50-59.99 | 13 | 15 | 15 | 26 |
| 60+ | 22 | 25 | 25 | 35 |

### Verified historical calibration
Across FIG's 2023 to 2026 Week 7 data, Legacy 2.0 awards **7,640 completed-season** and **5,085 individual-game** points. That is **60.04% season / 39.96% game**. The previous formula awarded 5,825 and 2,513 (69.86% / 30.14%). The exact ratio will change as new weeks are played and seasons are finalized. Award bands remain fixed rather than being dynamically scaled from actual league totals.

A separate **research-only 2017-2025 mock** applies the same FIG custom scoring to every recorded NFL appearance. It produces 28,645 season points and 21,680 game points (56.92% / 43.08%), with 43 of 1,529 players reaching 350 instead of 20 under the previous scoring. At the adopted **450-point eligibility threshold**, 30 players qualify in the new mock, compared with 12 under the former scoring formula. These are not official FIG points: the mock assumes all recorded NFL appearances would have been FIG starts, and pre-2021 NFL data may omit certain long-play bonuses.

Mike Evans scores 489 mock points versus 311 previously, while Cooper Kupp scores 576 versus 443. The gap decreases from 132 to 87 points. These comparison figures are not complete pre-2017 NFL career totals.

### Position calibration
The season PPG thresholds remain position specific, retaining the previous ranked-position calibration. Game award values reflect different scoring distributions. The 60/40 balance is evaluated **across all positions together**; per-position and per-player splits are not forced to 60/40.

## Watchlist and leaderboard
The Eligibility & Nomination page at `#/hall-of-fame/eligibility` displays the commissioner's curated 36-player watchlist and a searchable all-player leaderboard. Founder designation and curated exclusions remain independent of automatic points eligibility.

The leaderboard shows earned season and game points, total and remaining to 450, the in-progress season preview, and year-by-year scoring. PPG award previews are not counted as earned until a season is completed and eight official starts are verified. All official awards are calculated from `data/player_game_log.json`, `data/player_seasons.json`, and `data/league_history.json`, and update when verified data are published.

The founding class, enshrined seasons and commissioner selections are unaffected by the scoring recalibration. No former three-of-five rule applies.
