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
