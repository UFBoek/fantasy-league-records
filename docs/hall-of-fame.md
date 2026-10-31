# FIG Hall of Fame · Class of 2026

The FIG Hall of Fame is a permanent institution for exceptional fantasy performances within Fromm Is Garbage, accessible from **More → Hall of Fame**, `#/hall-of-fame`.

The main Hall is intentionally focused: a ceremonial entrance, four founding player plaques, one separately enshrined team season, and a short future-facing message. The four-count summary bar, introductory hero paragraph, linked founding-class hero button, and inline philosophy chapter have been removed. The induction philosophy is now a standalone destination: `#/hall-of-fame/charter`.

## 2026 Inaugural Class — The Founding Four

| Position | Inductee | FIG player ID | Historical case |
| --- | --- | --- | --- |
| QB | Josh Allen | 4984 | Three seasons of remarkable quarterback consistency and positional excellence |
| RB | Jahmyr Gibbs | 9221 | Sustained ascent culminating in an extraordinary 2025 peak |
| WR | Puka Nacua | 9493 | A meaningful three-season contribution and exceptional 2025 production |
| TE | Trey McBride | 8130 | Two-year positional emergence culminating in historically high 2025 TE production |

The **four names were explicitly selected** for the inaugural 2026 class. There is no mathematical top-N election or automatic yearly classes. Team seasons are independently curated and displayed separately from the founding player class. Other NFL players and historic franchise seasons may be considered in future classes without diminishing the founding four.

## Enshrined Season — Hayden 2025

The original **Hayden 2025** season is restored as a dedicated **Enshrined Season** exhibit on the main Hall, replacing the former “Greatness is not a leaderboard” slogan panel.

Verified 2025 records: 3,000.13 regular-season points, 214.30 points per game, 88.10% all-play winning rate, seven weekly-high scores, and a FIG championship victory (2025 Week 17 against Boek). The season has its own exhibit at `#/hall-of-fame/inductee/season/6/2025` and links directly to its team-season archive and championship box score.

The distinction is intentional: the founding *player* class remains exactly Allen, Gibbs, Puka and McBride, while the enshrined team season is recognized in a separate category.

## Enshrined Season historical records and streaks

Each enshrined franchise-season profile now includes two verified galleries that update from the league's published data.

**Top-three single-season records** come from `data/single_season_records.json`. The Hall shows every category in which the specific franchise-season ranks first, second, or third in the official FIG single-season record book. For Hayden 2025, the current archive lists seven: All-Play Win Percentage, Max PF, Point Differential, Points For, Weekly High Scores, Weekly Top-3 Finishes, and Wins. Rankings reflect the published record book and may change as additional records are added.

**Streaks established or continued during that season** are drawn from `data/website_streaks.json`, the career-game streak archive. Each positive, qualifying streak must overlap the enshrined season (`start_season <= season <= end_season`). Active and cross-season streaks are included, with the actual recorded start/end weeks and explicit ACTIVE or COMPLETED status. The 100+, 125+, and 150+ scoring categories, as well as negative losing or below-median categories, are deliberately omitted. The exhibit links to FIG's official records and streaks pages. No additional seasons, records, or streaks are invented or independently predicted.

## Website typography rule

**No em dashes** are permitted anywhere in the public website's displayed text. Existing frontend JavaScript, HTML, CSS, manifest, and published data have been audited, and a repository regression test (`tests/test_no_em_dashes.js`) enforces the rule against future reintroduction.

## Philosophy

Hall cases should be built around the **quality of individual seasons**, not cumulative career totals or averages diluted by late-career decline. Four factors guide consideration:

1. **Peak excellence:** Historical quality of a player's strongest completed seasons.
2. **Positional separation:** How extraordinary those seasons were against contemporaries at the same position.
3. **Sustained significance:** Multiple truly exceptional seasons or a uniquely historic peak supported by additional evidence.
4. **Historical meaning:** How those seasons shaped the story and expectations of FIG.

No minimum number of FIG lineup starts, fixed career PPG or career fantasy-points requirement determines admission. The manager's roster depth or weekly starting choices must not decide a player's greatness. In particular, an elite roster can bench equally elite players.

## Evidence limitation

The currently integrated archived `data/player_game_log.json` contains the verified **official FIG lineup starts**, not every week that an owned player scored from the bench. The Hall's existing displayed PPG, season point totals and signature box scores are explicitly marked as **starter-only evidence**, and **are not induction gates**. Evaluating rostered bench performances fairly requires a separate validated reconstruction of historical roster snapshots and weekly NFL scoring. Do not present starter-only rankings as comprehensive evaluations of every rostered player.

The founding class is a permanent editorial designation. New data may enhance exhibits, but it does not silently remove, add or recalculate class membership.

## Site structure

The Hall intentionally contains **one institution**, not a separate Legacy Points competition, historic-feats leaderboard or manager induction ranking. The core Hall page contains the ceremonial entry, four founding plaques and the Hayden 2025 enshrined-season exhibit. The induction philosophy appears only at `#/hall-of-fame/charter`. Each player has an expanded exhibit containing:

- Bronze-relief styled portrait framing (an aesthetic treatment of player photographs, not a fabricated 3D likeness)
- A distinct induction case and position
- Individual completed seasons side by side
- Historical FIG-start stats explicitly labeled as such
- Signature verified lineup performances with links to original game pages
- Links to the existing league's detailed player history

The 2026 founding class and 2025 team-season selection cover completed seasons 2023–2025. Incomplete 2026 results do not change the founding class, and younger players have no future-performance bonus.

Implementation: `hall-of-fame-v244.js`, `hall-of-fame-v244.css`, `hall-of-fame-v243.css`, `hall-of-fame-v242.css`, existing `hall-of-fame-v240.css` and `v241.css` museum foundations, `index.html`, and the service-worker app shell. The public route remains `#/hall-of-fame`, individual inductee routes remain `#/hall-of-fame/inductee/player/:id`, and legacy Hall routes gracefully return to the main Hall.

Testing: `node tests/test_hall_of_fame.js` and browser smoke testing in `tests/test_hall_of_fame_browser.js` at desktop, standard mobile and narrow mobile widths.

The FIG Hall is an independent fantasy football project, not affiliated with the NFL or the Pro Football Hall of Fame.
