# FIG Hall of Fame — Inaugural Class of 2026

The Hall of Fame is an editorial museum within Fromm is Garbage (FIG), accessible from **More → Hall of Fame** or `#/hall-of-fame`.

## Mission

Preserve and celebrate the greatest official franchise careers, starter careers, regular-season teams, and individual games in the FIG league. The Hall uses verified historical league data, not AI estimates or future projections.

## Historical eligibility

The **2026 founding class** is a permanent snapshot of completed **2023, 2024, and 2025** seasons. The unfinished 2026 season is excluded. When future years complete, additional classes can be introduced without rewriting the original class.

Data inputs are `data/league_history.json`, `data/games.json`, `data/team_season_master.json`, and `data/player_game_log.json`, all sourced from the published FIG archive and loaded through the existing `app.js` loader.

## The founding franchise class

All ten franchises are assigned legacy points:

- 100 for a championship
- 48 for a championship runner-up
- 20 for a first-place regular-season finish
- 14 for a season scoring title (most regular-season points for)
- `round(max(0, all-play-win-percentage - 50) × 1.6)` for above-average all-play performance over eligible seasons

The **three highest-scoring franchises** are inaugural inductees. All ten remain visible and link into their team history.

At construction, the verified founding inductees are **Hayden (380), Boek (124), and Sack (100)**. Championship games directly confirm Sack won 2023 and Hayden won 2024 and 2025. Boek finished runner-up in 2024 and 2025.

These points are an editorial legacy *ranking*, not a statistical claim of franchise quality.

## The inaugural player wing

Three players per position—QB, RB, WR, TE—for a total of twelve players, with a minimum of ten official FIG starts during 2023–2025.

Positional ranking formula:

`starter fantasy points + 4 × (starter fantasy points ÷ starts) + 10 × games with 20+ starter fantasy points`

A player’s starts across all FIG franchises are aggregated together. This does not reward bench production or unverified NFL statistics. Every inductee links into the original player page. The individual profile lists the five highest-scoring starts and links to official archived matchups.

## Greatest seasons

An independent exhibit ranking the top eight team-seasons by regular-season all-play win percentage, then points per game. These are exhibits, not separate franchise inductions. All-play prevents a favorable schedule from inflating the ranking.

## Iconic moments

The official championship game of each completed season plus the top performances in these categories:

1. Highest single-franchise game score
2. Closest regular-season game
3. Highest combined game score
4. Largest winning margin

If a championship also holds a record, the game is shown once. Every game links to its historical box score.

## User experience and access

- Overview, Franchises, Players, Greatest Seasons, Iconic Moments, and Induction Charter
- Detailed individual profiles for the top three franchises and twelve inducted players
- Position filtering for the player gallery
- Full links into the existing team, player, team-season, and game routes
- Premium dark-navy and bronze visual identity, full desktop and responsive mobile styling
- Reduced-motion support, keyboard focus outlines, source-derived statistics
- No API keys, new databases, paid subscriptions, extra browser permissions, or external data requests beyond the existing Sleeper headshot CDN
- Service-worker cache revision `v240`

Implementation: `hall-of-fame-v240.js`, `hall-of-fame-v240.css`, integration in `index.html`, `app.js`, and `sw.js`.

Tests: `node tests/test_hall_of_fame.js`. A GitHub Actions workflow runs a complete data audit plus Playwright desktop, 390px and 320px browser tests and captures screenshots.

Editable editorial concepts are in [Figma](https://www.figma.com/design/oU7TJluSqXA08bVGAoPXfM).

## Editorial policy

The Hall is affiliated with the FIG fantasy football league only. It is not affiliated with the NFL or the Pro Football Hall of Fame. Future classes or additional wings should retain published, fixed selection criteria and verifiable statistical records.
