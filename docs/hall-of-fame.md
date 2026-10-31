# FIG Hall of Fame — Permanent Induction Charter

## Philosophy

The Hall of Fame is the most selective historical honor in the Fromm is Garbage dynasty league. **Induction is not an all-time points leaderboard, franchise power ranking, or an award the site automatically hands out every season.**

The Hall enshrines individual NFL fantasy careers with genuinely exceptional FIG performances and specific *franchise seasons* that cleared an almost impossible standard. Managers themselves are **not** inducted. Every franchise has a separate **Legacy Points** ledger documenting its official achievements.

When FIG reaches 20, 30, or more seasons, all first-class inductions remain unchanged. Future classes can be created only with an explicit, reviewed entry in `INDUCTION_CLASSES` in `hall-of-fame-v241.js`. There is **no annual quota**, and an induction candidate cannot pass merely by being the highest eligible player in a position.

## The 2026 inaugural Hall (2023–2025 completed seasons)

### Player careers

Each inductee must have at least 28 verified FIG starter appearances spanning two completed seasons. Additional position-specific standards ensure standout quality, positional dominance and sustained production:

| Position | Founding inductee | Strict evidence standard |
| --- | --- | --- |
| QB | Josh Allen | 40+ starts, 30+ points per start, and at least two QB season scoring titles |
| RB | Christian McCaffrey | 30+ starts, 24+ points per start, and at least two RB season scoring titles |
| WR | Ja'Marr Chase | 35+ starts, 950+ starter points, eight 30-point games, and a WR season scoring title |
| TE | Trey McBride | 30+ starts, 16.5+ points per start, a 280+ point season, and the single-season TE mark for the founding period |

This is four **curated** players: the qualification gates are necessary but **not** an automatic election algorithm. The first three seasons were analyzed as FIG-started fantasy performances, not external NFL achievements. Each inducted player has a plaque with career summary, qualification evidence, and real starter-game links.

### Franchise season

**Hayden — 2025** is the sole inaugural season enshrinement. It cleared all of the following:

- Won the FIG championship.
- Scored at least 3,000 regular-season points (**3,000.13**).
- Averaged at least 210 regular-season points per game (**214.30**).
- Won at least 85% of all-play decisions (**88.10%**).
- Recorded at least six league-high scoring weeks (**7**).

A great scoring season **without** the combined standards is not automatically enshrined. The numbers are audited from completed team-season and championship-game records.

## Historic Feats / Greatest Accomplishments

The prior Iconic Moments and broad Greatest Seasons leaderboard have been replaced by an intentionally restricted gallery. Founding exhibits currently include:

- **Boek 2025:** 90.48% all-play win rate.
- **Hayden 2025:** 3,000.13 regular-season points and the FIG title.
- **Boek and Hayden 2025:** both secured seven weekly high scores.
- **All-time 175+ point streak:** The longest verified streak, including an active run during an unfinished season. At the October 31, 2026 archive snapshot, **Boek leads with 28 consecutive games, active through 2026 Week 7**, ahead of Hayden's completed 16-game run. The displayed holder, length, active/final status, and last verified week update from `website_streaks.json` after official games are published.

These are historical records or achievements, **not** Hall inductions. Every card links to a season or streak archive. Further feats must be similarly extraordinary, verifiable and intentionally curated. The site does not describe any record as literally unbreakable.

## Franchise Legacy Points — living ledger

The legacy ledger grows automatically as *completed* league seasons are published. **The exception is official, finalized-game streaks:** streak milestones count even when the current season is ongoing, because each game in the run has already been recorded. Whole-season awards, such as scoring leaders or championship accomplishments, still require completed seasons. Franchises are not Hall inductees, and **zero legacy points does not mean a franchise is ineligible for future records**. Every point is traceable to a published historical achievement.

| Event | Legacy points |
| --- | ---: |
| Championship | +200 |
| Championship runner-up | +80 |
| Regular-season first-place finish | +45 |
| Season scoring leader | +45 |
| Season all-play leader | +45 |
| 90%+ regular-season all-play | +80 |
| 3,000+ regular-season points | +80 |
| Seven or more weekly high scores in a season | +55 |
| 16 consecutive 175+ point career games | +60 (once) |
| 25 consecutive 175+ point career games | +100 (once; separate rare milestone) |
| Four consecutive 200+ point career games | +45 (once) |

Different milestones may stack when earned independently. The system deliberately does not award points merely for volume of career games or beating easier opponents. It makes no claim that legacy points measure managerial skill, nor can points earn automatic induction.

## Scaling beyond the inaugural class

- `INDUCTION_CLASSES` holds explicitly approved classes by induction year. The 2026 class references the completed 2023–2025 years forever.
- `completedYears(data)` reads finalized league seasons dynamically, so franchise season honors update when subsequent seasons finish. **Official game streaks update separately during ongoing seasons**, with earned milestone points awarded at 16 and 25 consecutive 175+ games.
- A future class can introduce published era-adjusted scoring/eligibility gates when league settings or average scoring change. Applying 2026's raw scoring thresholds uncritically to 2040 would not be fair.
- New honors must have proof from the official archive; missing data is never filled by model projections.
- Retired, non-included, or uninducted players can still appear in ordinary league statistics and the record book; those pages remain unchanged.
- Historic links into the existing FIG team, player, game, season, and streak records remain enabled.

## Technical implementation

`hall-of-fame-v241.js` implements the standalone model, induction registry and view renderers. `hall-of-fame-v240.css` retains the visual museum foundation; `hall-of-fame-v241.css` adds the new induction, legacy, and achievement panels. The single-page app loads v241 from `index.html`, under **More → Hall of Fame**, and a newly versioned service worker caches the updated shell.

Routes: `#/hall-of-fame`, `#/hall-of-fame/hall`, `#/hall-of-fame/inductee/player/4984`, `#/hall-of-fame/inductee/season/6/2025`, `#/hall-of-fame/records`, `#/hall-of-fame/legacy`, `#/hall-of-fame/legacy/1`, and `#/hall-of-fame/charter`. Old Hall links resolve to their closest new destinations.

Published sources: `league_history`, `games`, `team_season_master`, `player_game_log`, `website_streaks`. No new cloud costs, AI providers, databases or sensitive credentials required.

Tests: `node tests/test_hall_of_fame.js`, and `node tests/test_hall_of_fame_browser.js` with Playwright and a local static HTTP server. GitHub Actions executes the historical audit and desktop/phone browser tests.

**FIG's Hall of Fame is an independent fantasy league project. It is not affiliated with the NFL or the Pro Football Hall of Fame.**
