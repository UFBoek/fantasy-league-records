# FIG Hall of Fame · Class of 2026

The FIG Hall of Fame is a permanent institution for exceptional fantasy performances within Fromm Is Garbage, accessible from **More → Hall of Fame**, `#/hall-of-fame`.

The main Hall presents two founding player plaques, the separately enshrined Hayden 2025 team season, and a short note about future legends. A discreet link in the latter opens a separate **Eligibility & Nomination** Hall subpage at `#/hall-of-fame/eligibility`. The previous Induction Philosophy page remains retired; existing links to `/charter` render the main Hall.

## 2026 Inaugural Class: The Founding Two

| Position | Inductee | FIG player ID | Historical case |
| --- | --- | --- | --- |
| QB | Josh Allen | 4984 | Three consecutive seasons above 30 combined PPG, FIG's founding-era statistical standard |
| WR | Puka Nacua | 9493 | **THE LOGO**: the face of FIG, represented in the league's branding, with elite founding-era production |

The **two players explicitly selected** for the inaugural class are Josh Allen and Puka Nacua. Gibbs and McBride remain in the normal player archive, but no longer appear as Hall inductees. The historical Hayden 2025 franchise season remains enshrined separately. No other player was added.

## Eligibility & Nomination (separate Hall route)

The Hall landing page only links to this section; it does not show the five requirements. The criteria live at `#/hall-of-fame/eligibility`, with a return link to the Hall.

For future classes, there is **one nomination standard**: satisfy **at least 4 out of 5** benchmarks, with requirement **#2, two positional PPG championships, sufficient by itself**. The two-title provision is part of the same standard, not a separate nomination pathway:

1. **Elite Production:** Two top-3 positional PPG finishes, or top-2 for TEs.
2. **Positional Supremacy:** Two seasons finishing #1 in positional PPG. Meeting #2 independently fulfills the standard for nomination consideration.
3. **Sustained Dominance:** Three top-5 positional PPG finishes, or top-3 for TEs.
4. **Sustained Excellence:** Four seasons with at least nine FIG starts each, averaging 27+ QB PPG, 18+ RB or WR PPG, or 15+ TE PPG.
5. **Career Consistency:** Five seasons with at least nine FIG starts each, finishing top-8 QB, top-10 RB or WR, or top-3 TE in positional PPG each season.

**All five requirements use a minimum of 9 official FIG starts per completed season.** To determine a positional finish (such as QB top 3, TE top 2, or RB top 10), first exclude everyone at that position with fewer than nine official FIG starts in that same season. Then rank the remaining players by their **All-Time Combined average points per FIG start (PPG)**, including regular-season and playoff starts, **not by total fantasy points scored**. A player averaging 25.0 PPG over nine starts ranks ahead of a player averaging 24.0 PPG over fifteen starts; a player with eight starts has no qualifying ranking. Ties in average share the same position rank. All multi-season requirements count distinct completed seasons, not duplicate entries for a single season.

Eligibility never guarantees induction, adds players to a class automatically or removes enshrined players. Josh Allen and Puka Nacua are founding-class exceptions; the commissioner makes later induction decisions. These rules are separate from the retired Induction Philosophy section.

## Player scoring scope: All-Time Combined

All Hall of Fame player cards, season ledgers, career highlights, and signature-season PPG use **All-Time Combined** scoring, including verified FIG starting-lineup appearances in both the regular season and playoffs. This matches the default player archive's `data/player_seasons.json` rows where `scoring_view` is `All-Time Combined`.

The Hall builds career and individual game receipts from `data/player_game_log.json` and, when totals and starts agree, uses the published combined season average directly. Season PPG is displayed to **two decimal places** and labeled clearly, avoiding mismatched rounding conventions. For example, Christian McCaffrey's canonical combined PPG was **26.31 in 2023** and **28.58 in 2025**, versus regular-season-only 26.99 and 27.47. He is a comparison player, not an inducted founding member. The two founding inductees' combined 2025 PPG values are Josh Allen 30.80 and Puka Nacua 25.56.

Franchise single-season records, including Hayden's 2025 3,000.13 points, remain **regular-season** statistics where those categories are defined that way. Hall player scoring scope does not redefine team record books.

## Enshrined Season — Hayden 2025

The original **Hayden 2025** season is restored as a dedicated **Enshrined Season** exhibit on the main Hall, replacing the former “Greatness is not a leaderboard” slogan panel.

Verified 2025 records: 3,000.13 regular-season points, 214.30 points per game, 88.10% all-play winning rate, seven weekly-high scores, and a FIG championship victory (2025 Week 17 against Boek). The season has its own exhibit at `#/hall-of-fame/inductee/season/6/2025` and links directly to its team-season archive and championship box score.

The founding *player* class is exactly Allen and Puka, while Hayden's enshrined team season is recognized in a separate category.

## Enshrined Season historical records

The separate streak gallery and the redundant "Case for Enshrinement" chapter have been removed. The season exhibit shows **every single-season record category** recorded for that franchise-season, including marks outside the league's top three and the season loss count. Ranks are recomputed against completed franchise seasons and ties are reflected. The index still excludes 150+ point games as a record category, while keeping 175+, 200+, 225+, and 250+ games, Highest Weekly Score, and the exclusive starter-performance 20/30/40/50 BOMB categories.

The brief season description now derives its playoff result from official postseason box scores, and the landing-page enshrined-season card lists **every notable top-three season achievement**. The exhibit separately links every scoring performance ranked in the league's all-time top 25 across regular-season and playoff games, including final games already logged for the active season. As of October 31, 2026, Hayden 2025 contributes 290.25 (Week 7, #1 overall), 260.24 (Week 10, #6 overall), 255.99 (Week 12, #9 overall), 238.26 (Week 17 playoffs, #19 overall), and 234.60 (Week 5, #21 overall). These placements update automatically as verified game history grows.

The Python backend regenerates milestone categories on every data update. The Hall recalculates all-time rankings from completed seasons only.

## Website typography rule

**No em dashes** are permitted anywhere in the public website's displayed text. Existing frontend JavaScript, HTML, CSS, manifest, and published data have been audited, and a repository regression test (`tests/test_no_em_dashes.js`) enforces the rule against future reintroduction.

## Evidence limitation

The currently integrated archived `data/player_game_log.json` contains the verified **official FIG lineup starts**, not every week that an owned player scored from the bench. The Hall's existing displayed PPG, season point totals and signature box scores are explicitly marked as **starter-only evidence**, and **are not induction gates**. Evaluating rostered bench performances fairly requires a separate validated reconstruction of historical roster snapshots and weekly NFL scoring. Do not present starter-only rankings as comprehensive evaluations of every rostered player.

The founding class is a permanent editorial designation. New data may enhance exhibits, but it does not silently remove, add or recalculate class membership.

## Site structure

The Hall intentionally contains **one institution**, not a separate Legacy Points competition, historic-feats leaderboard or manager induction ranking. The core Hall page contains the ceremonial entry, two founding plaques and the Hayden 2025 enshrined-season exhibit. No induction philosophy page or section is published. Each player has an expanded exhibit containing:

- Bronze-relief styled portrait framing (an aesthetic treatment of player photographs, not a fabricated 3D likeness)
- A distinct historical identity and position
- Individual completed seasons side by side
- Historical FIG-start stats explicitly labeled as such
- Signature verified lineup performances with links to original game pages
- Links to the existing league's detailed player history

The 2026 founding class and 2025 team-season selection cover completed seasons 2023–2025. Incomplete 2026 results do not change the founding class. Puka is visibly identified as **THE LOGO** on both his card and his player plaque.

Implementation: `hall-of-fame-v244.js`, `hall-of-fame-v244.css`, `hall-of-fame-v243.css`, `hall-of-fame-v242.css`, existing `hall-of-fame-v240.css` and `v241.css` museum foundations, `index.html`, and the service-worker app shell. The public route remains `#/hall-of-fame`, individual inductee routes remain `#/hall-of-fame/inductee/player/:id`, and legacy Hall routes gracefully return to the main Hall.

Testing: `node tests/test_hall_of_fame.js` and browser smoke testing in `tests/test_hall_of_fame_browser.js` at desktop, standard mobile and narrow mobile widths.

The FIG Hall is an independent fantasy football project, not affiliated with the NFL or the Pro Football Hall of Fame.
