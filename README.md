## v123 — One draft Return % metric (value-weighted)

- Removed the average of individual pick returns, which overemphasized late-round hits.
- Rookie draft ranking lists now show a single **RETURN %** and offer a single return-based sort instead of both total return and average return.
- Team draft history, ranking drill-downs, year tiles, and grade overviews all use **RETURN % = sum of current values for valued picks / sum of their original slot costs × 100**.
- Preserved FIG draft grades and the 2023 startup history; only the return presentation and sorting changed.

---

## v122 — Rookie-only Draft Rankings

- Removed the 2023 startup selection tab and standalone startup board from Draft Rankings. The ranking hub and individual-year boards now include only selections explicitly marked Rookie.
- Preserved the 2024–2026 rookie year filters, FIG slot costs, S–F draft grades, current values, gains, returns, average returns, and in-depth team ranking breakdowns.
- Historical `#/draft/2023` links now redirect to rookie rankings; historical `#/draft/team/{franchise}/2023` links redirect to that franchise's rookie draft breakdown.
- The 2023 startup draft remains available as ungraded history under Teams → Draft History; no startup selections enter ranking totals.
- Bumped the app-script and service-worker cache versions to 122.

---

## v121 — Only rookie drafts receive slot valuations, grades, and team rankings

- Removed speculative 2023 startup slot-cost curve entirely. FIG slot values and S–F draft grades apply only to completed rookie selections (2024 onward).
- Retained the complete 2023 founding draft board: 250 picks, team/player identities, pick positions, and all 25 rounds. It shows no market valuations, slot values, grades, comparative returns, or linked team ranking drill-downs.
- Startup picks do not enter all-rookie franchise value rankings or draft grade/return calculations.
- Team draft histories retain 2023 startup selection and production history without speculative valuation figures. All-year returns and the drafted-player market-value summaries now count rookie selections only.
- Removed startup from the Draft Rankings team drill-down filters; historical `#/draft/team/{franchise}/2023` URLs redirect to the 2023 startup archive.
- Tests covered all 250 startup selections, all 120 rookie picks, ten team profiles, 40 team draft-history panels, and 40 rookie ranking team drill-down variants.

---

## v120 — Team average return replaces team average grade

- Draft Rankings team cards and sorting now display **AVG RETURN** instead of average letter grade.
- AVG RETURN is the arithmetic mean of each valued selection's current-value-to-slot-value percentage; unvalued players are excluded.
- TOTAL RETURN remains the value-weighted total current value divided by total slot cost, keeping it separate from average pick return.
- Team draft drilldowns and year-by-year summary tiles show average return; the franchise Teams tab's draft history summaries also use numeric average return instead of team-wide letter grade.
- Individual pick S–F grades, grade distribution, rookie/startup selection pages, league-grade thresholds, and James-origin future-pick values are unchanged.
- Tested the ranking sort and every franchise breakdown across all four draft years; the mean-of-pick calculation differs correctly from aggregate total return when costs vary.

---

## v118 — Startup draft standalone; franchise draft ranking drill-downs

- The 2023 Startup tab now shows the full 250-selection, 25-round draft directly, without a team ranking leaderboard. Individual 2023 pick grades remain visible.
- All-time Draft Rankings now cover the 2024–2026 rookie drafts only. Individual rookie draft year boards still expand below their team ranking.
- Selecting any franchise from the Draft Rankings now opens a dedicated, in-draft view at #/draft/team/{franchise_id}[/{season}] rather than redirecting to the Teams section. Pick owners on complete draft boards link to the same draft-specific view.
- Team drill-down: grade counts (S through F and unvalued), year-by-year drafted value and gains, best-value picks, largest losses, all picks with slot/current value, gains, returns and grade, sorting by value/gain/grade/pick order and filtering by grade; navigation back to selected rankings.
- Third/fourth-round rookie picks graded B when current value >=550 and gain >=200, while retaining S/A floors and the C grade for 300-value positive-return players. New Bs include Blake Corum, De'Zhaun Stribling and Jonah Coleman; Kyle Monangai remains B; Brock Bowers S, Bucky Irving A and Braelon Allen C.
- No RosterAudit ingestion, Sleeper record or future-pick dynasty valuation changes.
- Automated render checks: 250 startup draft cards with no team leaderboard; all 10 team rankings on all rookie views; 50 franchise-by-draft breakdown variants; all four sorts and grade-card navigation.

---

## v117 — Rankings-first draft archive and new S–F grading with startup projections

- The Draft page is now **Draft Rankings**. It ranks all ten teams by the current value of players they personally drafted, defaulting to current value with working options for value gain, return % and average grade. Season filters include all-time, each 2024–26 rookie draft, and the separate 2023 startup. Every ranking links to the selected franchise’s draft history, and each annual board remains available via an expandable full-board view.
- Individual FIG draft grades now combine the player's current market standing and the absolute gain above slot cost; no longer grade A/B based on return percentage alone. Rules:
  - S: market value >= 6,500 and gain >= 3,000.
  - A: market value >= 2,300 and gain >= 1,400.
  - B: market value >= 1,100 and gain >= 400.
  - C: market value >= 300 and gain >= 0, OR value >= 800 and at least 80% of slot retained.
  - F: value <= 50, OR value below 20% of slot value where initial slot >= 400.
  - D: other valued selections. Unavailable market values: ungraded.
- Representative verified player examples: Brock Bowers S (1.07 in 2024); Bucky Irving A (4.06 in 2024); Braelon Allen C (4.09 in 2024).
- Startup grades cover all 250 picks from 2023. The 25-round startup pick-slot value curve is **PROVISIONAL**, not approved league data: round-one pick 1.01 starts at 9,500, then uses a monotone interpolated round-based scale down to roughly 185 at 25.10. The explicit 26 round anchor values are in app.js as FIG_STARTUP_SLOT_ANCHORS and should be replaced or calibrated after league discussion. Missing market values (88 of 250) are not graded or assigned invented zero values.
- Team grade summaries are mean grade point scores (S=5, A=4, B=3, C=2, D=1, F=0) over valued selections; value gain and return % are computed only for the selections with current market values. All drafted values belong to the franchise that originally made the selection, rather than current fantasy roster holders.
- Existing normal rookie slot costs remain unchanged; James-origin future draft pick special prices continue to apply exclusively to Dynasty Values.

---

## v116 — Dynasty-only fixed values for James-origin future picks, simplified captions

- **Draft grades:** Every manager, including James, receives the standard rookie slot benchmark for the actual 1.01–4.10 selection. No manager-specific overrides affect grade letters or draft-class grades.
- **Dynasty Values:** James-origin future picks have fixed league valuations per round: first 6,300; second 1,600; third 464; fourth 146. These values apply regardless of which franchise currently owns the James-origin pick and flow through franchise rankings and future-pick lists.
- **Separation:** Historical trade market comparable logic remains unchanged; the dynasty-only override does not rewrite historical trade valuations.
- **Readability:** Reduced repetitive descriptions, footnotes, and captions on draft, team season, roster and record views. The essential grade formula and market-value attribution remain visible.
- **Validation:** Checked James's actual 2026 selection at 1.04 against 3,940 for grades and his 2027 original first-round future pick at 6,300 for Dynasty Values. All 10 team profiles and all 4 draft boards render, and existing recorded selections remain intact.

---

## v115 — Separate startup and rookie drafts; league-defined slot value grades

- The Draft tab isolates the 2023 founding startup (250 picks, 25 rounds) from the 2024–2026 rookie draft selector (40 picks per year). Complete boards and team-specific histories remain linked.
- All 40 rookie pick slots (1.01–4.10) have custom value benchmarks set by the league; James selections always use round-based slot values: 6,300 / 1,600 / 464 / 146, regardless of their position within the round.
- FIG letter grades measure current RosterAudit player market value divided by the original league-assigned rookie slot value: A ≥150%, B ≥110%, C ≥80%, D ≥50%, F below 50%. A missing current value means an ungraded pick rather than assuming zero. Combined grades use sums for only the picks with available current values, alongside coverage counts. Grades are current-value snapshots, not historical draft-day grades.
- Startup picks are explicitly ungraded, and the old external RosterAudit draft-grades link is removed. Independent RosterAudit player market-value attribution remains.
- Correct the source draft-label bug where overall picks 11–20 were rendered as 2.11–2.20 instead of 2.01–2.10; all displayed draft round slots now normalize to 01–10.
- Verified all ten team profiles and draft histories, the four complete annual draft boards (370 selections), all 40 slot benchmarks and each of James’s four round overrides; six rookie picks have unavailable current value.
- No source draft data, league scoring, Sleeper automation, trade history, record calculations, or RosterAudit ingestion altered. App and service-worker cache advance to v115.

---

## v113 — Team navigation restored; Draft tab now prioritizes full draft boards

- **Critical navigation repair:** Team tab activation now uses the correct all-element selector, allowing every franchise card to open its profile again.
- **Draft-first layout:** Choose any season from 2023 to 2026 and view every pick directly by round; the 25-round 2023 startup draft has round-jump links. Current archive totals: 370 picks.
- **Optional team perspective:** Expand a compact ten-team explorer or select the drafting franchise on any pick to open Teams → Franchise → Draft History for the selected year.
- **Presentation:** Updated pick cards with player headshots, round/overall pick, NFL position/team, drafting franchise, and original-pick provenance where confirmed.
- **Safety:** League exports, roster audits, scoring, records, trade data, and Sleeper ingestion are unchanged. v113 advances the client stylesheet and service-worker cache.

---

## v95 — Readable player histories, richer team seasons and audited archive detail

- **Player record breakdowns:** Performance cards use explicit, two-digit chronological entry numbers (`01`, `02`, `03`) in a small fixed rank badge. This avoids visually garbled rank symbols on narrow phones. Larger, higher-contrast manager labels and metadata, compact spacing and aligned points keep each performance clear.
- **NFL player histories:** Trade history was added in v93 and is retained, with every Sleeper player-ID-matched completed trade, transfer direction, year/week and expandable full trade packages. The player overview now also states the number of recorded trades. Verified Travis Kelce's player ID `1466` has one archived transfer, 2026 Week 4, and the transaction is not double-counted.
- **Team seasons:** The v94 season cards and tap-through season pages are retained. Each season card now displays six stats, adding average score and point differential alongside PF, Max PF, all-play W–L–T and high-scoring weeks. Tapping a season opens season metrics, all-play W–L–T against each of the other **nine teams**, expandable week scores, scoring leaders and archived games.
- **Roster dashboard:** Current starters, bench, injured reserve, taxi, player values and future picks remain grouped. Add a readable position-mix summary and an **Other** filter, including the two archived roster entries with unusual/missing position values instead of omitting them.
- **Active streaks:** Existing clickable active-streak records link to the individual completed games making up each run. The streak breakdown now labels active entries explicitly.
- **Game lineups:** Existing v94 side-by-side starters by position and two-column bench rosters now also show the starters' summed points and counts above their head-to-head slot comparisons, plus clear viewing guidance. Readability and minimum-width mobile rules are refined down to a 360px display.
- **Validation:** Travis Kelce player trade ID joins verified; all **40 team-season all-play totals** match the published data, and each team's season detail renders nine opponents. All **20 active streaks** reconcile exactly to the archived game counts. Synthetic matchup renders show two side-by-side starting slots, both bench teams and correct starter totals. Travis Kelce's qualifying 5-Bomb breakdown renders numbered entries 01, 02, 03, etc. Client JS, CSS balance, Pages staging and service-worker version checks passed.
- **Safety:** No historical score, standings, season-complete filtering, Sleeper fetch cadence or data export changes. Files staged via `history-polish-v95.css?v=95`, `app.js?v=95` and `fig-league-shell-v95`. Mobile Safari visual QA remains after deployment.

---

## v94 — Better team-season, roster, player and matchup archives

- **Player bomb history:** The older mobile-converted sortable table created ambiguous/malformed numbers in the left-hand column (e.g. on Travis Kelce's 5 BOMBS page). Replace it with numbered, high-contrast performance cards showing clear **#1, #2, #3…** labels, the franchise photo, season/week, position and exact fantasy points.
- **Player trade history:** The existing transaction-scoped `playerTradeHistory` (linked by Sleeper player ID and receiving trade assets) now appears **immediately after** the player profile hero, above Franchise History. It shows every archived trade, from/to managers and expandable package received by each party. Validated against received trade assets; no duplicated player transaction IDs were found.
- **Team Seasons tab:** Replace sparse one-line year cards with compact season summaries: official W–L, win %, PF, Max PF, all-play record, weekly high scores and regular-season finishing position. Each season is clickable.
- **Season detail:** Twelve metric tiles, all-play W–L–T **against all nine other franchises**, with expandable week-by-week score comparisons, the top-five NFL scoring contributors and every completed regular/postseason matchup linked to its lineups. This uses *official regular-season-only all-play*; the H2H section remains the only place to extend pairwise all-play through qualifying playoff weeks.
- **Rosters:** New team roster overview with starter, bench, injured reserve and taxi counts; current valuated asset totals and starter value; QB/RB/WR/TE/K/DEF filter pills, grouped player/headshot rows and more readable future-pick cards. No guessed valuations.
- **Active streaks:** The main Active Streaks list and each team snapshot now directly link to the complete scored games underlying a specific streak. The streak breakdown is a sequence of readable scored game cards with opponent, result, date and full-lineup link. Historical streak leaderboard navigation remains separate.
- **Game detail:** Replace stacked full-roster columns with a **side-by-side, slot-matched starting lineup**, a two-team final score header and separately aligned **side-by-side benches**, preserving all archived player links and data.
- **Styling/release:** `league-detail-v94.css` provides high-contrast responsive mobile-first layouts (including <=360px). Cache/staging bumped to `app.js?v=94`, `league-detail-v94.css?v=94`, `fig-league-shell-v94`.
- **Tests:** All 40 franchise-season all-play totals independently re-computed and matched the official published season totals; all 20 active streaks matched their recorded full game counts; player transaction and roster-filter tests passed; Travis Kelce's breakdown rendered 15 distinct #1–#15 cards; a representative 8-slot side-by-side game lineup test verified score/bench/player links; JS syntax/CSS balance and Pages asset-cache wiring passed. On-device visual QA still pending.

---

## v93 — Player trade histories on individual NFL player profiles

- **Player Archive → Player History** includes a new **Trade History** section after Franchise History and before Season History, showing all completed league trades where the player was transferred. Each row includes the archived season and week, manager/team portraits with the sending and receiving franchise, and an expandable **See Full Trade Package** showing every participating manager's received players and picks. There's also a link to the full Trades archive.
- Records are keyed by exact Sleeper `player_id` and `transaction_id` from `data/trade_assets.json`, rather than matching names, so identical names are not conflated. A player's transfer is counted only once using the `Received` record (each asset also has a corresponding `Sent` record).
- Supports 2-, 3-, and 4-manager trades without losing trade details, and shows a friendly empty state when a player has no recorded transactions. Season and game logs remain separate and unchanged.
- Trade data is lazy-loaded with each opened player profile; no new API calls, backend schema, or live-week record changes.
- **Tests:** All 374 received player assets matched the correct outgoing franchise and their complete trade package; 207 unique traded NFL players, including a nine-trade player, a no-trade player, and a verified four-team trade. App/service-worker JS syntax, responsive CSS braces and v93 Pages cache/staging checks all passed.
- **Delivery:** `player-trades-v93.css` included in GitHub Pages staging and service worker `fig-league-shell-v93`, with `app.js?v=93`.

---

## v92 — Game Archive scores fit on mobile and select an individual team

- Fix the cropped trailing digits of final scores on small iPhone screens. The winner marker and entire number now form a single right-aligned `fig-archive-result` group within a **three-column** score row (portrait, flexible name, nonwrapping result). The inactive winner marker keeps both scores aligned without occupying a separate layout track. CSS adapts at 699px and 360px.
- Remove **ALL TEAMS** from Game Archive. Default to the first team (Boek) and leave all ten individual manager filters available. Switching managers or seasons resets the visible matchup list to 40 items.
- Keep **ALL SEASONS**, so the user can still view an individual team's career archive. Other archive records and all final scores are unchanged.
- Verified with published completed `data/all_games.json`: Boek has 52 games, initial 40 render correctly; showing more reveals the remainder. Hayden's 53 games filter correctly; 2026 narrows to four. Full `176.06` score remains in the markup. Every game has a group for each complete result. Code syntax, responsive CSS, asset/version staging and phone cache references passed.
- Delivery: `app.js?v=92`, `archive-mobile-fit-v92.css?v=92`, and service worker `fig-league-shell-v92`.

---

## v91 — Explore ordering and readable Game Archive scoreboard cards

- **Explore in exact five-row order:** Teams · Team Records / Streaks · Player Records / Head-to-Head · Dynasty Values / Champions · The Draft / Trades · Game Archive. The first pair stays highlighted in soft mint.
- **Game Archive redesign:** Replace the dense desktop table and its faded, sparse mobile conversion with full-width (phone) / two-column (desktop) matchup cards. Each includes season/week, regular-season or generic postseason label (covers championship and consolation without mislabeling), both manager avatars and names, both final scores, a winner indicator, winning margin and a direct link to the official archive game/lineup page.
- **Filtering and page size:** Keep season and team pills; 40 latest finished games appear initially, with another 40 each click until exhausted. Changing either filter resets to the first 40 of the filtered result and displays an accurate game count.
- **Contrast:** Final stylesheet `archive-explore-v91.css` uses dark, high-contrast text on white scoreboard cards. Also overrides legacy phone leaderboard substat/PTS-caption colors that could leave almost-white text on white cards (as shown in the screenshot), without changing their sorting or game data.
- **No records changes:** Uses existing completed `data/all_games.json`; no in-progress scores and no Sleeper polling modifications.
- **Checks:** Actual 262-game archive fixture renders 40 then 80 games; season-only, combined season/team filters and filter resets verified; exact 10-tile Explore ordering verified; app/service-worker JS syntax, CSS braces, stage script and cached asset versions passed. Live mobile visual QA still required after publish.
- **Release:** `app.js?v=91`, `archive-explore-v91.css?v=91` and service-worker `fig-league-shell-v91` versioned and staged for GitHub Pages.

---

## v90 — H2H-only all-play counts weeks when both rivals played in the playoffs

- Pairwise all-play in **More → Head-to-Head** now compares completed scores from the regular season **and** playoff weeks when *both specific franchises* recorded an official scored playoff game that week. They need not have faced one another. An absent playoff matchup or first-round bye is not counted for that team.
- Seasons, weeks, and phase are grouped separately to avoid mixing regular-season and playoff results. A single qualifying playoff week produces exactly one comparison for the pair.
- The H2H rivalry cards, career all-play record, season-by-season records and expandable score comparisons all use this expanded H2H-only definition. Weekly playoff comparisons are marked **PO** and the season detail counts regular versus playoff weeks.
- **Scope:** This does not change the league-wide `data/all_play_seasons.json`, global all-play standings/records, the scheduled head-to-head matchup record, Sleeper imports, or the completed-week safeguards.
- **Validation:** The official completed playoff archive yields **49 added unordered pair-week comparisons** across 2023–2025. The expanded counts match an independent two-teams-present-in-the-week calculation for all 45 pairs. Original regular-season totals still match the 40 published franchise-season all-play records.
- **Delivery:** `h2h-playoffs-v90.css` and `app.js?v=90` are wired through Pages staging and the `fig-league-shell-v90` service worker cache.

---

## v88 — Head-to-Head archive redesign with pairwise all-play

- **Rivalry overview:** The More → Head-to-Head page now uses high-contrast portrait-led rivalry cards in place of the old hard-to-read mobile expandable table. Each card shows the directional *actual H2H W–L–T* (scheduled league and playoff matches) and *pairwise all-play W–L–T* (weekly scores against the opponent whether or not scheduled), plus official game count and shared weeks. The team filter shows nine directional rivalries; All shows every unordered franchise pairing (45).
- **Sorting:** Sort rivalries by actual H2H win percentage, pairwise all-play win percentage, completed official matchups or team name. Clicking a card opens the detailed opponent matchup view.
- **Detailed comparison:** Big manager portraits, lifetime H2H and lifetime pairwise all-play records, win percentages, and **all-play by season**. Each season has both actual H2H and all-play W–L–T; an expandable row lets viewers inspect *every* weekly all-play comparison and scores.
- **Official matchup archive:** Actual scheduled meetings, regular-season and playoffs, retain links to the real game archive lineups. Playoffs are not counted in all-play, consistent with `data/all_play_seasons.json`.
- **Data integrity:** Pairwise all-play is computed client-side from *completed* regular-season games in `data/games.json`, comparing each franchise's score against another's in matching season/week. No weekly live scores or extra Sleeper requests. Tested all 40 franchise-season all-play totals exactly against published `data/all_play_seasons.json`, and all 90 directional actual H2H records exactly against `data/h2h.json`.
- **Mobile and publishing:** New `h2h-v88.css` contains scoped, explicit readable colors and responsive grids. `app.js?v=88` and the new CSS are referenced in GitHub Pages staging and the v88 service worker cache.

---

## v82 — Render long weekly histories in increments of 100

- **Highest Scoring Player Weeks:** Player Records → Highest Scoring Player Weeks → Full History now renders only the **top 100 player performances** at first load, instead of creating thousands of DOM table cells.
- **Highest/Lowest Scoring Team Weeks:** The individual team-scoring week record histories use the same 100-row first view and can show another 100 at a time, respecting lowest-first for the lowest-score view.
- **Load more:** The end of each history displays “Showing N of TOTAL” and a “SHOW 100 MORE” button until all official entries are visible. Exact historical scores and rankings are unchanged.
- **Sorting:** The Points header applies ascending/descending ordering to the *full* archived dataset, then resets to the top 100 of that order. Sort direction remains visible and stays consistent as more rows load.
- **Mobile:** Rank + Player/Team remain fixed. Loading more or changing sort redraws both panes together and preserves the horizontal stat scroll position.
- **Delivery:** `history-paging-v82.css` is included in index.html, GitHub Pages staging and the service-worker cache. `app.js?v=82` and the shell cache version are bumped. No Sleeper polling, completed-week record filters or data files are changed.

---

## v79 — Restore official champions, score-linked playoff brackets, and legible team cards

- **Root cause:** `data/playoffs.json` contains bracket roster pairs, seasons, rounds and categories, *not* `champion`, `runner_up`, `third_place`, `owner_name` or `franchise_id` summary fields. The former Champions and Playoffs pages read those missing fields, displaying dashes or generic team numbers.
- **Source-aware join:** `playoffSeasonResults()` uses the bracket file to select the championship path, and pairs each matchup with a real finalized `data/games.json` playoff score by **season + week + unordered franchise/roster pair**, because `bracket_matchup_id` is not the weekly game `matchup_id`. Champion and runner-up are derived from the scored championship match; third place comes from the scored third-place match. Playoff bracket links use the actual weekly `matchup_id` for lineup drill-downs.
- **Checked historical results:** 2023 Sack champion / Hayden runner / CamNol third (six bracket games); 2024 Hayden champion / Boek runner / Leyton third (six games); 2025 Hayden champion / Boek runner / Fru third (five games).
- **Champion posters:** Large manager-portrait banners, season year, champion badge, displayed manager, regular-season record and season-specific points/game, plus the correct runner-up and third-place names. Posters link to the corresponding season bracket.
- **Playoff detail:** Real names, portraits, scored games, winners, correct first-round byes and category-labeled title/third-place games. All game cards link to their actual archive matchup. A missing result, if any, shows an explicit unavailable state instead of guessing.
- **Contrast:** Light, charcoal-text styling for the Dynasty Market Value overview, actual tracked numbers and pick/player subtotals; explicitly dark achievement text on light team-accomplishment rows; legible mobile playoff round headings and bracket panels.
- **Delivery:** New final `playoffs-v79.css` stylesheet and versioned `app.js?v=79`, refreshed service-worker cache and GitHub Pages staging script.
- **Data safety:** Sleeper refresh logic and historical finished-week filters are unchanged.

---
## v78 — NFL player headshots

- **Source:** Sleeper's existing CDN player images, `https://sleepercdn.com/content/nfl/players/thumb/<player_id>.jpg`, indexed directly by the already-published Sleeper NFL player IDs. No extra Sleeper API requests, player-directory downloads, tokens, or background jobs are required.
- **Coverage:** Player Records top-week feature, sortable Player Record Books and bomb leaderboards, individual player profile heroes, manager roster players, draft pick cards, completed Game Archive starter/bench lineups, live matchup starters/bench, and received-player trade details.
- **Performance:** Images load lazily and decode asynchronously. Thumbnail requests are made only for visible players. Browser cache/CDN serves repeated thumbnails.
- **Missing photos:** A neutral initials badge remains behind the image, and a capturing image-error handler removes broken headshots. Non-numeric defense/special IDs and empty lineup slots intentionally do not request player JPGs.
- **Data integrity:** Players, live scores and archive record computations are unchanged. Franchise/manager portraits continue to use the custom images under `assets/avatars/`.
- **Publishing:** `player-headshots-v78.css` is in the Pages staging script, `index.html` and versioned service-worker manifest. The app and live-matchup scripts have new v78 URLs.
- **Usage note:** Images are served from Sleeper's CDN rather than redistributed in the repository. Sleeper's public read-only API terms cover non-commercial use; verify suitability/licensing separately before repurposing imagery for commercial deployment.

---
## v77 — compact leaderboards, performance reruns, and trade contrast

- **Featured records:** Each record card shows the record-holder portrait group and at most two additional ranked entries (the top three performances/placements in total). Tied record holders each appear in the portrait group once.
- **Repeat performances:** Highest/lowest scoring weeks and single-season records now rank individual **performances**, so the same team can legitimately occupy multiple top-three places. The card indicates season/week for scoring occurrences. Aggregate team records and streaks continue ranking distinct managers.
- **Player Weeks history:** The Team stat cell displays only the linked franchise portrait with accessible owner name in the link label and tooltip; the team name remains available as a sortable value.
- **Site-wide table density:** Final CSS layer `layout-v77.css` reduces oversized frozen table row heights and header padding, narrows identity columns, sizes common stat fields based on their contents, and tightens ordinary sortable tables and mobile expanded rows. Player names can wrap rather than being cut off to fit a single line.
- **James/Hayden contrast:** Override old dark-themed mobile styles inside the trade archive, including the 12-trade counter, participant labels, all-time trade-value section, trade details, and the interactive gap panel. Dark areas use legible white text; light areas use charcoal text.
- **Publication:** `layout-v77.css` and `app.js?v=77` are versioned in the page and offline shell and copied by the GitHub Pages stage script.
- **Historical safeguards:** No live Sleeper scores or unfinished weeks are inserted into official records.

---
## v76 — records and streaks in their own galleries

- **Records layout:** Hall of Records all-time standings stays at the top. Below it, the Records filter displays every eligible team/statistic record as an illustrated card, rather than repeating dense tiny summary cards. Highest/lowest scoring weeks and weekly high-score/top-three awards stay under Records.
- **Streaks layout:** Winning, losing, and point-threshold streak record posters belong exclusively on the Streaks page, after the Active Streaks leaderboard. Cards open their existing complete history views.
- **Tied holders:** Tied record cards render a shared, responsive side-by-side portrait mosaic of every *unique franchise holder* and display all tied names. Multiple games or seasons tied by the same franchise use **one** photo. Runner-up rows reflect the positions after the tie.
- **Compact frozen columns:** On phones the fixed Rank + Name pane is narrower (168 px on most phones; 155 px on narrow devices) and statistics cells are more compact. Position chips are smaller and lighter for better contrast. The fixed-identity/statistics two-pane architecture and sorting synchronization are unchanged.
- **Versioning:** `layout-v76.css` is deployed in GitHub Pages and cached with `app.js?v=76`; bumping the app shell ensures phones receive the updated tables and galleries. League scoring and the completed-week-only historical cutoff are unchanged.

---
## v75 — Phone fixes and records gallery

- **Player Records contrast:** The former navy feature card had dark inherited text. The new final-loaded `layout-v75.css` forces a charcoal panel with explicit white text and mint accent for all labels and top-five scores.
- **Rank + Name never scroll out of view:** Wide leaderboards use two adjacent, matched-height native tables. The fixed left pane contains Rank and Team/Player/Holder; the right pane alone scrolls horizontally through stats. The two sides reorder together when users sort. This replaces the unreliable CSS sticky-cell approach on iPhone Safari and is skipped by the mobile `+ Stats` transformer.
- **Records visuals:** The Records landing page now starts with four poster-like official all-time leader cards—Winning Streak, Losing Streak, Weekly High Scores, Top 3 Weekly Scores—with a large manager portrait, record value, and four further *unique* manager leaders; the full all-time medals and career standings table remains below. The existing category book adds small colored markers and drill-downs stay intact.
- **Larger portraits:** Team profiles, franchise-directory cards, RosterAudit ranks, live matchups, featured champions and streak holders, and team names in tables get larger images. Repeated incidental team mentions remain text-only.
- **Navigation:** Standings is no longer a separate visible page/menu item because Home already contains season-selectable standings. Existing `#/standings` bookmarks redirect to `#/home` instead of breaking.
- **Deployment:** `layout-v75.css` and `app.js?v=75` are included in the versioned page, service-worker manifest, and GitHub Pages staging script.
- **Data boundaries:** All of the above uses existing finalized archive data. No live weekly score is added to official record histories. Sleeper polling and roster/dynasty valuations are unchanged.

---
## v74 — Hall of Records visual refresh and frozen table columns

The design references a high-contrast editorial sports archive: white paper, bold black headline typography, muted gray panels, dark controls, mint accents, and a few featured manager portraits. It is not a copy of another website's branding or artwork.

- **Records home** now includes a sortable all-time standings table with official win percentage, wins/losses, scoring and real postseason podium placements (championships, runner-ups and third-place finishes). Each team uses its fixed franchise portrait in the table.
- **Frozen leaderboards** keep Rank and Team/Player/Holder fixed while additional stat columns scroll horizontally. These preserve native accessible HTML tables and clickable sort headers rather than being converted to mobile `+ Stats` cards. Other mobile tables keep their existing compact layout.
- **Sort constraints** remain intact on historical records (value/length only) and active streaks (type/length). Large player and standings tables are now more explorable on phones without hiding columns.
- **Portraits are selective:** linked teams in data tables and featured champions/streak holders retain images. Passing mentions and dense card text no longer duplicate a tiny portrait after every team name.
- **No data calculation changes:** ongoing weekly scores remain excluded from official record books. The build, Sleeper feed and RosterAudit workflow remain unchanged.
- **Delivery:** `editorial-v74.css` is included in the GitHub Pages staging script, service worker and versioned page entrypoint. As with any theme-wide change, confirm visual contrast on real phones after deployment.

---

## v73 — More navigation, live matchup lineups, franchise portraits

- **More:** Dynasty Values and Game Archive are the first two menu tiles, with working links to `#/dynasty` and `#/games`. The remaining league pages remain available below.
- **Current Week Matchups:** Tap a matchup card or **View Lineups** to open `#/livematch/<week>/<matchup>`. This reads the current Sleeper starters, bench, `starters_points`, `players_points`, and commissioner-adjusted total, if any. An unofficial matchup page refreshes about every 30 seconds while visible; an old bookmarked week directs visitors to the completed Game Archive.
- **Player labels:** Use the small, automatically refreshed `data/current_roster.json` snapshot for player names. When a player is newly acquired or absent from that snapshot, show the Sleeper player ID instead of inventing an identity or downloading the full NFL players dictionary.
- **Team pictures:** The common `ownerName`/`ownerLink` rendering helpers now include franchise-ID-keyed avatars across historical record holders, streaks, team standings, playoff scores, game archive listings, and other team references. Live matchup cards and lineups use the same stored manager portraits. Existing team directory and dynasty cards continue to use their larger existing portraits.
- Historical records, player records, streaks, and career standings still count completed weeks only. Unfinished scores are isolated in the live matchup interface.

---

## Current-week Sleeper scores (v72)

The homepage has a separate **CURRENT WEEK MATCHUPS** panel. Visible home tabs read the official Sleeper public league metadata and current-week matchup points directly, about every 30 seconds. League metadata is refreshed every five minutes; hidden tabs and visitors on other pages do not continuously poll. Scores are labelled **unofficial** because the week may still be in progress or awaiting corrections. Temporary provider/network errors retain the last good displayed scores and retry after two minutes.

**Historical records, streaks, standings and player records do not use these browser-fetched matchup points.** They continue to use the verified completed-week JSON snapshots from the GitHub Actions data pipeline. A newly published snapshot is still checked every five minutes independently of the live scores.

The mobile `+ Stats` cards use dark hover, tap and expanded states to prevent iOS touch hover from revealing the inherited pale-green desktop row highlight. `mobile-v70.css` overrides only mobile presentation.

---

# Daily Sleeper + RosterAudit automation (GitHub Pages)

**Current setup:** `.github/workflows/update-league-data.yml` refreshes published league data daily at 12:17 UTC and also schedules hourly builds on Sundays, Mondays and Thursdays (the usual NFL game days). GitHub Actions schedules are best-effort and may start late, and each build/deploy needs additional time. The workflow can also be run manually through GitHub → Actions → **Update league data** → **Run workflow**. A visible website tab checks `data/refresh_manifest.json` every five minutes, and reloads its cached JSON views only when a newer successful snapshot is published. Hidden tabs check when brought back into view. **This is not 30-second live-score polling; it is published-data refresh.**

The workflow uses public APIs. No Sleeper username/password, Google Sheet, Colab runtime or RosterAudit CSV export is needed for its ordinary runs.

1. Download Sleeper league history, rosters, completed-game points, transactions, standings and records using `scripts/build_site_data.py`.
2. Regenerate the rookie-pick audit and James/Hayden trade-asset history using `scripts/build_draft_pick_audit.py` and `scripts/build_trade_lineage.py`.
3. Fetch current dynasty player and future-pick market values through RosterAudit's documented public endpoints via `scripts/build_rosteraudit_values.py`. The scoring key currently selected is `sf_ppr` for this ten-team Superflex PPR league; this is an approximation of its custom scoring.
4. Run `scripts/validate_refresh.py` to reject missing or drastically truncated Sleeper history and **restore the last good RosterAudit snapshot** when a provider response is incomplete or unavailable.
5. Only commit changed `data/*.json` files. The updater **directly publishes the latest files through GitHub Pages** after a bot commit, because bot pushes do not trigger the ordinary deployment workflow.

**Historical integrity:** The Sleeper builder excludes the current in-progress league week from records and streaks; only prior completed weeks enter the official archive. The lightweight browser checker never inserts live points into official records.

**Monitoring:** Open the GitHub repository → Actions → Update league data to inspect the daily run. A failed Sleeper build or invalid data stops publication; a failed RosterAudit update keeps the previous values with a warning. The current RosterAudit values may differ from the original October 8 CSV snapshot because the public API uses its live Superflex preset and optional league-size adjustment.

**Future seasons:** When Sleeper renews the league for 2027 or later, the currently configured league ID (`1311997831757705216`) and historical draft validation may need updating. Scheduled execution does not automatically discover that newly renewed league.

**Source attribution:** Market values by [RosterAudit.com](https://rosteraudit.com); these are current dynasty estimates, not the values at the time of historical trades.

---

# v63 — Dynamic Trade Gap Lineup Challenge (first-publication candidate)

- Renamed the former **28K Lineup Challenge** to **Trade Gap Lineup Challenge**; no fixed number in the game's name, sidebar card, or James Rule note.
- The available market-points budget is **exactly** the absolute difference between James and Hayden's cumulative trade receipts displayed on the homepage. This uses the same market pricing logic and updates automatically when the RosterAudit JSON snapshot updates during the scheduled GitHub workflow (and the page is reloaded). The browser revalidates the RosterAudit JSON when opening the website.
- Current included snapshot: James 16,463; Hayden 44,231; exact available budget **27,768** (not rounded to 28,000).
- The 200+ player pool, QB-only SFLX, duplicate protection, 10 starters, two FLEX slots, Surprise Me, Clear Team, and both game locations are preserved. Surprise Me now handles a future smaller budget without presenting an over-budget roster.
- New preferred link: `#/minigames/trade-gap`. Existing `#/minigames/28k` bookmarks still reach Minigames because the router accepts either segment.
- The game depends on the existing RosterAudit market snapshot; if the provider stops updating, the last good snapshot stays in use, so values will be **as current as the last successful sync**.
- Added **GitHub Actions Pages deployment**: `.github/workflows/deploy-site.yml` publishes the site on the first upload and later edits; `update-league-data.yml` explicitly republishes immediately after scheduled data refreshes. This avoids GitHub's branch-Pages limitation where commits made using `GITHUB_TOKEN` do not start another Pages build. Live deployment still needs verification.
- For a **first-time GitHub user**: make a **public** repository with default branch `main`, upload the extracted site contents to the repository root (include `.github`), then set **Settings → Pages → Build and deployment → Source: GitHub Actions**. Under **Actions**, run **Publish league website** once; then run **Update league data** to verify automatic data retrieval and republishing. The site is public at the Pages URL displayed in the Actions deployment and Pages settings.

---

# v62 — Selected-team Head-to-Head orientation

- In the H2H tab, choosing a franchise shows it in the **TEAM** (left) column for all nine opponents.
- SERIES, TEAM PF, OPP PF, and DIFF all reflect the chosen franchise's perspective.
- ALL still displays the 45 unique league rivalries without duplicates.
- Clicking a series opens the corresponding rivalry in the same team-first order.
- All other v61 functionality and automated data updates are preserved.

# v59 — All-Play record categories

- Removed **All-Play Wins** from the single-season record book, including the top-three records. **All-Play Win Percentage** remains.
- Added **Total All-Play Wins** to both All-Time and Regular Season career record views. All-Play is measured in regular-season weeks only, so these two leaderboards share the same cumulative totals; playoff records are unchanged.
- Clicking a Total All-Play Wins record opens the weekly All-Play breakdown (not the ordinary head-to-head win log).
- Updated both the shipped JSON records and the Sleeper/Python generator; includes a defensive UI filter for stale single-season rows.
- All other v58 features, including the 28K challenge in both places, are preserved.

# v58 — Streamlined scoring records

- Removed career and single-season team **scoring-average records** so they don't duplicate points-for leaderboards.
- Preserved ordinary average-score statistics and NFL player per-start averages; only the redundant record categories were removed.
- Updated the shipped record data and Python generator, including team top-three season snapshots, to keep categories gone after scheduled refreshes.
- Everything else from v57, including both 28K challenge locations, is unchanged.

## Earlier v57 changes

- Removed **25 BOMBS** as a visible stat/column on league and team player books. 20 BOMBS remains 20–29 as before; records data and calculations unchanged.
- Reduced boldness in player record tables and 5/20/30/40/50 bomb leaderboards without reducing font sizes.
- Styled all-time streak leaders as complete gray record cards with gold top accents.
- The same interactive **28K Lineup Challenge** now appears both on the homepage beneath James & Hayden cumulative trade values and on the Minigames page. Both routes use the same generator, rules, 200+ player pool, and QB-only SFLX.
- No changes to the Python/Sleeper/RosterAudit update scripts or source values.

# Fromm is Garbage — v55

This build is designed around automatic updates.

## Local preview

```bash
cd ~/Desktop/fantasy_league_site
python3 -m http.server 8000
```

Open http://localhost:8000 and hard-refresh after replacing files.

## Data architecture

The browser reads static JSON files from `data/`. It never needs Google Sheets or Colab at page-load time.

`Sleeper API -> scripts/build_site_data.py -> data/*.json -> website`

The current JSON files are bootstrapped from the validated master database created in Colab.

## Automatic updates on GitHub

`.github/workflows/update-league-data.yml` runs the Python database builder once per day and can also be launched manually from GitHub Actions. If the generated JSON changes, the workflow commits the updated `data/` folder to the repository. GitHub Pages then serves the refreshed data automatically.

No Sleeper credentials are required because the league endpoints used by this project are public.

### First deployment

1. Put the contents of this folder in a GitHub repository.
2. In **Settings -> Pages**, publish from the repository branch containing this site (usually `main`, root folder).
3. In **Actions**, confirm the `Update league data` workflow is enabled.
4. Use **Run workflow** once to test the updater after deployment.

## Important files

- `app.js` — site/router/UI
- `styles.css` — app styling
- `data/` — website data consumed by the browser
- `scripts/build_site_data.py` — full Sleeper/statistics rebuild based on the validated Colab pipeline
- `.github/workflows/update-league-data.yml` — scheduled/manual updater

## League rules preserved by the updater

The database builder comes from the validated production notebook, including the league's historical ownership corrections and record-eligible playoff rules. Historical franchise identity remains tied to Sleeper `roster_id`.


## v14
- Team profile redesigned with reserved PFP frame and higher-contrast colorful stat tiles.
- Current starters now preserve Sleeper lineup slot order, including FLEX/FLEX/SUPERFLEX.
- Roster remains one continuous board: starters, bench, IR, taxi.
- Team Records has a full single-season records section and no longer mixes single-season rows into the general snapshot.
- 2026 picks remain hidden after the completed 2026 draft.
- Sitewide palette, typography, tables, record cards, season cards and app tiles received a higher-contrast color pass.
- Automated updater now exports current lineup_slot and lineup_order.

## Manager avatars (v36)
Ten custom manager portraits from Fantasy avatars 11 are stored in `assets/avatars/` as optimized WebP files. The static `OWNER_AVATAR_BY_ID` map in `app.js` associates portraits with stable franchise IDs, so the scheduled Sleeper data refresh does not overwrite them. To change a portrait, replace its WebP file, keeping the filename.


## v37 visual copy cleanup
Removed decorative hero slogans/descriptions site-wide and redundant explanatory copy. All statistics, page titles, controls, avatars, and automated data files are unchanged.

## v38 James and Hayden trade history
Replaced home page Important Stuff cards with every direct trade between franchises 10 (James) and 6 (Hayden), grouped into responsive cards with manager portraits and season filters. The display reads the existing `trades.json` and `trade_sides.json` so scheduled database refreshes are reflected automatically.

## v39 James and Hayden trade breakdown

Homepage trade cards display each received player/pick separately. Player totals are recorded starter points for the acquiring franchise from weeks after the trade, not bench production or post-trade points for other franchises. Picks are identified by year, round, and originating manager; the existing export does not provide reliable traded-pick-to-draft-selection provenance, so completed selections remain explicitly unverified.


## v40 — Trade history production
- Homepage James/Hayden archive reads weekly_full_rosters.json for both starting lineup and bench scoring; previous v39 only used starter logs.
- Totals are tied to the receiving franchise and stop at the next recorded outgoing player trade. Players leaving via other transaction types are naturally absent from later roster snapshots.
- Scoring deliberately begins the week **after** the recorded trade week to avoid claiming pre-trade results.
- Exact historical traded-pick-to-draftee mapping remains UNVERIFIED: historical draft order, pick origin, and ownership-chain evidence must be reconciled before adding named outcomes.
- The existing GitHub workflow already exports weekly_full_rosters.json; no new API calls are required for player production.


## v41 trade-production correction

The James–Hayden trade archive now excludes incomplete/future weekly roster slots. For active seasons, only weeks strictly before the Sleeper `current_leg` are counted; completed seasons use all weeks through `current_leg`. It also deduplicates per-player franchise/week rows, counts only explicit `Starter` or `Bench` statuses, and conservatively excludes the week of a subsequent outgoing trade. Both the original acquisition's week and the later departure week are excluded because the data has week-level rather than timestamp-level attribution.

This corrects the proven future-week start inflation. It **does not** independently certify all player point totals against live Sleeper, determine within-week trade timing, or identify traded draft picks' eventual selections. The website's trade scoring should be considered a completed-week roster-based estimate until the transaction timestamp audit is finished.


## v42 trade archive corrections
- Player trade exit labels now identify the receiving franchise, explicitly saying 'traded back to James/Hayden' on returns.
- Traded picks display a later transfer by the receiving manager when recorded, instead of suggesting the first recipient used the pick.
- Historical draft selection mappings remain unverified where the underlying records cannot establish the connection.


## v43: Verified draft outcomes
The James/Hayden archive now reconstructs original pick ownership chronologically from transaction timestamps, reconciles the franchise pick totals against actual completed rookie draft selections, and displays a drafted player only if the final franchise made exactly one selection in the matched round. Unresolved multi-pick ownership and the conflicting 2026 round 1/3 ledger remain unverified. The calculation runs against fresh JSON automatically on site load.


## v44 — Automated draft-outcome audit (2026-10-08)
- The James/Hayden trade page loads `data/draft_pick_outcomes_audit.json` generated by the audit engine instead of duplicating the simplified v43 reconstruction in the browser.
- Audit data is keyed by `(draft_year, round, original_franchise)` and records chain warnings, owner-round conservation, and candidate selections.
- A named player is displayed only for `UNIQUE_OWNER_ROUND_MATCH` (a qualified ownership-reconciliation inference, not a direct Sleeper ID-to-original-pick assertion).
- The 2025 Round 3 original franchise 5 match formerly labeled Tyler Shough is now **unverified** because the expanded trade-chain audit reports a conflict.
- Drafts with multiple possible players or unreconciled ownership display honest unresolved statuses.
- The site's existing GitHub Actions job now runs `scripts/build_draft_pick_audit.py` immediately after `scripts/build_site_data.py`, then commits changed `data/` JSON. The audit pulls Sleeper directly, so routine scheduled updates do not need Colab or new ZIP uploads.
- The original standalone collector is included as `scripts/draft_pick_audit_engine.py`, and the build wrapper deliberately writes only stable data JSON; raw API snapshots and the timestamped audit ZIP are not committed.
- To test the audit offline: `python scripts/build_draft_pick_audit.py --source-zip path/to/draft_pick_audit_v2.zip`. This was used to initialize the shipped v44 data from the supplied export.
- GitHub repository Actions must be enabled and allowed to commit to the branch. New Sleeper league IDs after annual renewal may require configuration changes.
- This does not certify existing post-trade player scoring; that audit remains separate.


## v45 — Original rookie draft orders and exact selection identity (2026-10-08)

The league manager supplied the original first-round slot owners for each rookie draft, in order. We cross-checked **all 10 slots for each season** with the raw Sleeper `slot_to_roster_id` metadata, finding exact agreement. The rookie drafts are **linear**, so the original pick slot repeats across all four rounds. Original franchise IDs for slots 1..10:

- 2024: Fru (2), Winston (8), Boek (1), Leyton (5), Line / Lionel (7), Fromm (3), CamNol (9), James (10), Hayden (6), Sack (4).
- 2025: Sack (4), Fru (2), James (10), Winston (8), Fromm (3), Line / Lionel (7), CamNol (9), Leyton (5), Boek (1), Hayden (6).
- 2026: James (10), Sack (4), Winston (8), Leyton (5), Line / Lionel (7), CamNol (9), Fromm (3), Fru (2), Boek (1), Hayden (6).

`scripts/rookie_pick_attribution.py` performs this cross-check, and then joins each pick by `(draft_id, round, original franchise / draft slot)` to its **actual drafted player**. It never infers original ownership from the selecting manager or the reconstructed transaction chain. The scheduled audit runs this automatically using Sleeper draft metadata and guards against corrupted/changed original slot orders.

All 120 historical rookie selections for 2024–2026 were matched by direct draft slot in the supplied offline audit (40 per season); all 15 distinct completed James–Hayden traded-pick identities now have known drafted players. Incomplete/contradictory trade history remains separately marked and the selector is taken from the actual Sleeper draft result. Picks from 2027+ remain pending until their drafts occur. Completed 2023 **startup** picks are intentionally not generalized to the linear rookie algorithm.

Test with: `python -m unittest discover -s tests`, then `python scripts/build_draft_pick_audit.py --source-zip <audit_v2_zip>`. The unit tests are offline and do not need additional exports or Colab.

## v46 — RosterAudit dynasty market values

- The **James and Hayden trade archive** shows *current* RosterAudit market values for Sleeper-ID matched players, with completed traded draft picks showing the current value of the drafted player when one is published. Historical trades are **not** re-priced as if these values existed at the time of the trade. Unverified player IDs are not guessed.
- **Each franchise profile** has a current dynasty-market summary and values beside rostered players. Future undrafted picks are shown with an optional *mid-round generic estimate* when the RosterAudit picks endpoint provides one; the real draft slot is not implied by the estimated value.
- **Dynasty Values** is a separate ten-franchise leaderboard, also accessible in the Home menu. Rankings reflect the sum of *known matched assets*; if a player or pick has no published valuation, that asset is excluded and the coverage is displayed.
- The `scripts/build_rosteraudit_values.py` action reads the current Sleeper league's roster slots and scoring settings, choosing `sf_ppr` for its 10-team Superflex full-PPR setup. It requests size-adjusted rankings for 10 teams when supported, falling back to the documented Sleeper-ID keyed values endpoint. This is a **closest documented preset**, not an exact model of the league's custom 5-point passing TDs, completion bonus, and other rules.
- The site includes a visible link to RosterAudit.com as the data provider. The personal non-commercial league site uses their public API within the published limits.
- **First deploy:** `data/rosteraudit_values.json` is deliberately marked pending. After upload to GitHub, open Actions → Update league data → Run workflow to fetch the *real* values and commit the JSON. The weekly/daily workflow then refreshes this once per day. Third-party API failure does not erase an earlier successful snapshot or block Sleeper's separate data updates. This build environment cannot access RosterAudit directly to supply a verified live snapshot in the ZIP.
- The GitHub runner must allow outgoing HTTPS access to rosteraudit.com. The user agent is descriptive per RosterAudit instructions; no API key is required for this daily read workload.
- Test locally with `python -m unittest discover -s tests` and `node --check app.js`.


## v47 — First real RosterAudit values snapshot (2026-10-08)

- The site includes **389 actual player market values and 36 future-pick price tiers** from the supplied RosterAudit rankings CSV, not simulated or invented values. The export has 443 rows in total (407 players, 36 picks).
- Player Sleeper IDs were identified only where **normalized name AND position** matched a unique Sleeper player in the existing current/historical data. 304 of 315 unique currently rostered players are matched. 18 CSV player rows did not match the existing historical Sleeper data. No guessed or fuzzy mappings are published.
- The CSV does **not** state which RosterAudit scoring preset or league-size adjustment was selected. Consequently v47 labels the export's scoring format as **unverified**. The scheduled API job still requests `sf_ppr` for the league's 10-team Superflex PPR setting, then supersedes the CSV snapshot on a successful refresh. Custom Sleeper bonuses remain outside this approximation.
- Values are current market estimates, **not historical trade-date valuations**. 2027–2029 future pick values use the CSV's mid-round estimate, not a specific draft-slot price; 2026 was already drafted.
- This shipped snapshot is immediately usable offline or when first deployed: `data/rosteraudit_values.json` is now populated. Attribution remains visible, and failures in the third-party API job do not erase the last valid snapshot.
- For repeatability, the exact source CSV is preserved as `resources/rosteraudit-rankings-2026-10-08.csv`. To reconstruct it: `python scripts/import_rosteraudit_csv.py --csv resources/rosteraudit-rankings-2026-10-08.csv --date 2026-10-08`. **Do not run that import after successfully fetching fresher API values**, because it would overwrite them with the older CSV. The scheduled workflow never runs the CSV importer.
- Validation: `python -m unittest discover -s tests` and `node --check app.js`. The live automated refresh still needs a successful GitHub Actions run for verification.


## v48 — James-origin draft valuation and per-trade market totals

- This league-specific **editorial valuation rule** reprices any pick whose ORIGINAL franchise is James (10) to the published `2027:{round}:early` RosterAudit tier. It applies regardless of the traded pick's actual year, the manager now holding it, and (for historical trade cards) whether it was already drafted. For completed picks, the actual drafted player remains documented as a historical outcome, but does not determine the overridden pick asset's displayed market price. Non-James-origin picks retain the original v47 rules: completed picks show the drafted player's present market value when matched; undrafted picks use their own year/round's mid-tier estimate.
- The shipped October 8 RosterAudit CSV snapshot includes early 2027 tiers for rounds 1–4: R1 4924, R2 1298, R3 386, R4 161. The special rule is implemented in JavaScript and therefore persists across GitHub's daily snapshot refreshes. Missing price tiers are explicitly left unvalued rather than fabricated.
- James-origin picks retain the override when received by Hayden or any other franchise; all team future-pick totals and league rankings share the exact same pick valuation helper.
- Each James–Hayden trade now shows a **TOTAL CURRENT MARKET VALUE** for James's received assets and Hayden's received assets, summing the exact displayed market asset values (players + draft picks), while retaining the separate actual historical lineup-points totals. Per-side coverage is displayed: unvalued assets are excluded rather than silently assigned zero.
- These are current comparable market values, NOT trade-date snapshots, a historical win/loss calculation, or an official RosterAudit outlook for James's pick order. Credit remains visible.
- **Automation safety:** The scheduled RosterAudit updater retains previously sourced early-2027 reference prices if the API returns only mid/late tiers, and marks `carried_early_2027_tiers` in the JSON so missing early prices do not silently disable the league override.

## v49 — Hayden/Boek late picks and traded-away-pick valuation (2026-10-08)

- **Draft-pick valuations are keyed to the original franchise**, regardless of the current holder: James (franchise 10) = **early 2027** tier for the corresponding round in every draft year; Hayden (6) and Boek (1) = **late tier in that pick's own draft year**; all other origins = **mid tier in their own year**.
- The initial RosterAudit export contains tiers for 2027–2029 only. When a completed **2024–2026** pick needs a *pick* market value (e.g., because its first recipient traded it away), the site uses the **2027 equivalent** with the same early/mid/late tier, explicitly labels it a *comparable*, and **does not pretend it is a historic quote**.
- On James–Hayden trade cards, if the manager receiving a pick **subsequently traded it away**, its market value and the receiving side's total use the pick-tier comparable, **never the market value of the player who was ultimately drafted**. If a completed pick's verified draft selector is someone other than the recipient, the same rule applies even if the transfer was missed in the trade records. Drafted player details remain visible as historical outcomes.
- Completed non-James picks that the recipient **was not recorded as trading away and used to select the player** retain the selected player's current market value, as in v48. James-origin picks retain their explicit early-2027 override for all years, even if drafted. Future undrafted picks always use the pick-tier comparable.
- The individual asset value and total side value share the same calculation, so a pick's future rookie value cannot silently leak into the trade-side total.
- `scripts/build_rosteraudit_values.py` continues to fetch the market snapshot automatically. To preserve the custom Hayden/Boek rule if a future third-party response omits late tiers, it now carries forward previously sourced 2027+ late price tiers (as well as the existing early 2027 prices) and marks retained tiers as `carried_late_pick_tiers`.
- These are current comparable dynasty-market estimates, not historical trade-date prices or an objective trade winner. Other known gaps in player coverage and scoring audits are unchanged.
- Validate with `python -m unittest discover -s tests`, `node --check app.js`, and the v49 trade-page browser smoke test.


## v50 — Readable player record books + FLEX filter

- Increased player record book body cells from 10px to 16px, links to 17px, headers from 8px to 12px, and enlarged table padding. Applies both to the league Player Records page and every franchise's Player Record Book tab.
- Tables use horizontal scrolling rather than shrinking text to fit, with rank and player-name columns sticky during sideways scrolling.
- Added **FLEX** position filter (RB + WR + TE; excludes QB) to both player book locations. Other filters, search, sort and scoring source remain unchanged.
- Data, dynasty valuation overrides, scheduled workflows, and player statistics are unchanged.

## v51 — James–Hayden cumulative value and asset deep dive

- Added cumulative received market-value totals above the 12 direct trade cards: values are the **sum of individual trade-side receipts**, not net profit, unique retained assets, or historical trade-date prices. Repeatedly acquired assets may appear more than once; unpriced assets are excluded and coverage is reported.
- Added two fact-checked transaction-path features: Hayden's Jahmyr Gibbs package (2025 Week 6 vs Leyton, using a James-origin 2028 first and Fromm-origin 2027 fourth that appeared in earlier direct trades), and the J.K. Dobbins route through the 2024 Week 10 CamNol transaction that delivered Sack's original 2025 second, selected as Colston Loveland at 2.01. These are **package associations**, not an assertion that a single pick bought an entire player.
- Added expandable asset journeys for each original James/Hayden receipt, citing dated subsequent Sleeper transfers, all assets sent together, and all assets received in those transactions. Where a drafted pick has a verified original slot, show the resulting selection. Avoid extending a path across unexplained gaps.
- `scripts/build_trade_lineage.py` recalculates `data/trade_lineage.json` after the Sleeper and draft-audit steps in the daily GitHub workflow. This preserves updates without manual Colab exports, subject to verification of the deployed workflow.
- Validation: `python -m unittest discover -s tests`; `node --check app.js`; `python tests/browser_trade_v51.py` (desktop and mobile layout, real market total reconciliation, featured paths, source jump navigation, year filters).


## v52 — Both-side asset conversion explorer + 28,000-point lineup game

- Replaces the two hard-coded Gibbs/Loveland feature panels with a recipient-switching conversion explorer for BOTH managers. It shows all 17 Hayden and 14 James later trade packages involving assets first received directly in their twelve trades, plus documented rookie selections by the recipient.
- Each conversion shows the originating James–Hayden assets, complete later sent package, actual return assets, and further transfers of those returns (up to four generations). Package proceeds are never claimed as a one-for-one return; downstream market values are **not** added to the original cumulative trade receipts.
- Built by the existing `scripts/build_trade_lineage.py` workflow step daily; `data/trade_lineage.json` includes `conversions` (schema v2).
- Adds a **28,000 RosterAudit points** legal lineup challenge next to the original all-time trade value gap. The shipped values produce a gap of **27,768** (44,231 less 16,463); the challenge rounds to 28,000, while the displayed gap recalculates when values change.
- Roster slots read from the latest `data/league_settings.json`: QB, 2 RB, 3 WR, TE, 2 FLEX, 1 SUPERFLEX. FLEX takes RB/WR/TE; SUPERFLEX takes QB/RB/WR/TE. RosterAudit value must be >=1,000, duplicates are prohibited, and picks exceeding the cap are rejected. The game includes search, progress meter, surprise valid team and reset.
- Uses the existing automatically refreshed RosterAudit dataset. The supplied initial 2026-10-08 CSV did not specify its source preset; the target 10-team Superflex PPR preset is configured for live updates. These are dynasty market prices, not player scoring projections.
- Removed duplicate trade-lineage build step from the GitHub workflow. Live GitHub refresh still needs verification after deployment.
- Validate with `python -m unittest discover -s tests`, `node --check app.js`, and `python tests/browser_v52.py`.


## v53 — Streamlined James–Hayden trade history

- Removed the full **“What They Turned It Into / The Complete Aftermath”** conversion explorer and its dedicated styles and event handlers from the homepage. This eliminates the extra 17 Hayden / 14 James downstream-package panels.
- **Kept the 28K Lineup Challenge unchanged**, including the full ten-starter Superflex roster, minimum 1,000 player value, 28,000-point cap, search, surprise lineup, reset, and mobile layout.
- Preserved the cumulative market-value summary, all 12 direct trade cards, year filters, per-asset transaction notes/expandable individual asset histories, team pages, and current RosterAudit valuations.
- `data/trade_lineage.json` and its automatic update step are retained because the existing trade cards still use the per-asset paths. The `conversions` dataset is simply no longer displayed. The old v52 conversion-explorer description above is historical; v53 removes that interface.
- Run `node --check app.js`, `python -m unittest discover -s tests`, and `python tests/browser_v53.py`.

## v54 — 28K Challenge Expanded Player Pool

- All RosterAudit QB, RB, WR and TE players valued at **200 or more** may be selected (was 1,000+). The eligible count is calculated from the current RosterAudit snapshot, so it continues to update automatically.
- The challenge's **SFLX** slot permits **QB only**, by request. The ordinary FLEX slots still permit RB, WR and TE. QB and other position slots remain unchanged.
- Preserves the 28,000-point cap, 10 starters, no duplicate players, search, surprise lineup, reset, and automatic RosterAudit data refresh.
- Test with `node --check app.js`, `python -m unittest discover -s tests` and `python tests/browser_v54.py`.


## v55 — Less clutter in trade history

- Removed all per-asset “Follow the Asset”/“Follow the Pick” dropdowns. The automated asset history stays in the backend but is not displayed in the James–Hayden trade cards.
- Removed lengthy pick-value explanations, trade methodology paragraphs, and repeated market-value disclaimers from the trade UI.
- Retained drafted-player outcomes, later transfer summaries, current values, all trade totals, and source credit to RosterAudit.
- Trimmed market-value explanation copy on team pages and league rankings, without changing valuation calculations.
- Preserved the 28K challenge exactly as configured in v54 (200+ values, QB-only SFLX, two normal FLEX slots, unique players, 28K budget).
- All Sleeper data, RosterAudit snapshot, scripts, automated workflows, and original draft-pick rules are unchanged.


## v56 — Minigames
- Adds dedicated `#/minigames` hub and deep link `#/minigames/28k` to the 28K Lineup Challenge.
- Adds Minigames to the homepage app menu, More page, top navigation, and bottom dock.
- The homepage trade archive now links to the game rather than embedding it.
- Pick-value chips now say `Pick value: <number>`; the original pick year remains visible in the pick title. Underlying comparables are unchanged.
- The 28K player pool (200+), 10-slot eligibility (SFLX = QB-only), score rules, daily RosterAudit data and other sections are preserved.


## v60 — Trade production totals and the James Rule

- The James–Hayden all-time comparison cards now include accumulated **starter lineup points** and starts produced by players received in the 12 direct trades, using the same underlying calculation as the individual trade cards. Bench points are displayed separately, not added to starter production.
- Scoring covers completed Sleeper weeks after the respective trade and stops before a recorded trade-away, matching the existing card logic. These are summed **trade receipts**, not each team’s entire historical production. Acquired draft picks do not automatically receive the downstream drafted player’s points.
- Trade #12 includes a compact, humorous “James Rule” league-history note explaining commissioner voting on subsequent James–Hayden trades and connecting that story to the 28K game’s hard cap.
- The league data, dynasty valuations, and automatic updater scripts are unchanged.


## v61 — Trade archive presentation and tone

- All 12 James–Hayden trade cards are native, keyboard-accessible `<details>` panels, initially collapsed, with clear trade number, season/week, and each side's current market-value total in the summary. Year filters reset to collapsed; Expand All / Collapse All is available.
- The James Rule note is shown **above** the most recent trade (#12), outside the collapsed details panel, and now describes the league vote requirement neutrally without attributing motives.
- James–Hayden market-gap text now describes the measured current-value difference without implying unfairness or deliberate conduct. The 28K challenge, player-production totals, historical trade data, and automatic data updates are unchanged.
