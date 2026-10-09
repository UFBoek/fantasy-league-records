# Daily Sleeper + RosterAudit automation (GitHub Pages)

**Current setup:** `.github/workflows/update-league-data.yml` refreshes the published league data each day at 12:17 UTC (usually 8:17 a.m. ET in daylight-saving time). It can also be run manually through GitHub → Actions → **Update league data** → **Run workflow**.

The workflow uses public APIs. No Sleeper username/password, Google Sheet, Colab runtime or RosterAudit CSV export is needed for its ordinary runs.

1. Download Sleeper league history, rosters, completed-game points, transactions, standings and records using `scripts/build_site_data.py`.
2. Regenerate the rookie-pick audit and James/Hayden trade-asset history using `scripts/build_draft_pick_audit.py` and `scripts/build_trade_lineage.py`.
3. Fetch current dynasty player and future-pick market values through RosterAudit's documented public endpoints via `scripts/build_rosteraudit_values.py`. The scoring key currently selected is `sf_ppr` for this ten-team Superflex PPR league; this is an approximation of its custom scoring.
4. Run `scripts/validate_refresh.py` to reject missing or drastically truncated Sleeper history and **restore the last good RosterAudit snapshot** when a provider response is incomplete or unavailable.
5. Only commit changed `data/*.json` files. The updater **directly publishes the latest files through GitHub Pages** after a bot commit, because bot pushes do not trigger the ordinary deployment workflow.

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
