# FIG Hall of Fame · Class of 2026

The FIG Hall of Fame is a permanent institution for exceptional fantasy performances within Fromm Is Garbage, accessible from **More → Hall of Fame**, `#/hall-of-fame`.

## 2026 Inaugural Class — The Founding Four

| Position | Inductee | FIG player ID | Historical case |
| --- | --- | --- | --- |
| QB | Josh Allen | 4984 | Three seasons of remarkable quarterback consistency and positional excellence |
| RB | Jahmyr Gibbs | 9221 | Sustained ascent culminating in an extraordinary 2025 peak |
| WR | Puka Nacua | 9493 | A meaningful three-season contribution and exceptional 2025 production |
| TE | Trey McBride | 8130 | Two-year positional emergence culminating in historically high 2025 TE production |

The **four names were explicitly selected** for the inaugural 2026 class. There is no mathematical top-N election, requirement for a franchise-season induction, and no automatic yearly classes. Other NFL players and historic franchise seasons may be considered in future classes without diminishing the founding four.

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

The Hall intentionally contains **one institution**, not a separate Legacy Points competition, historic-feats leaderboard or manager induction ranking. The core Hall page contains the ceremonial entry, the four founding plaques and a concise induction philosophy. Each player has an expanded exhibit containing:

- Bronze-relief styled portrait framing (an aesthetic treatment of player photographs, not a fabricated 3D likeness)
- A distinct induction case and position
- Individual completed seasons side by side
- Historical FIG-start stats explicitly labeled as such
- Signature verified lineup performances with links to original game pages
- Links to the existing league's detailed player history

The 2026 founding class covers completed seasons 2023–2025. Incomplete 2026 results do not change the founding class, and younger players have no future-performance bonus.

Implementation: `hall-of-fame-v242.js`, `hall-of-fame-v242.css`, existing `hall-of-fame-v240.css` and `v241.css` museum foundations, `index.html`, and the service-worker app shell. The public route remains `#/hall-of-fame`, individual inductee routes remain `#/hall-of-fame/inductee/player/:id`, and legacy Hall routes gracefully return to the main Hall.

Testing: `node tests/test_hall_of_fame.js` and browser smoke testing in `tests/test_hall_of_fame_browser.js` at desktop, standard mobile and narrow mobile widths.

The FIG Hall is an independent fantasy football project, not affiliated with the NFL or the Pro Football Hall of Fame.
