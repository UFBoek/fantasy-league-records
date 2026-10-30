# FIG Dynasty Dominance v1

This is a research-only scoring-strength simulation for 2027 through 2032. It is not yet used by the website or the playoff calculator.

Run from the repository root using Node 22:

    node tests/test_dynasty_dominance.js
    node scripts/dynasty_dominance_model.js --runs 5000 --out /tmp/dynasty.json

Inputs: current rosters, league started-player game logs, RosterAudit values, actual future draft pick owners, and recent fantasy scoring.

The results compare every team's simulated legal superflex starting-lineup PPG and the probability of being the highest-scoring team. Assumed age-related performance change, injuries, rookie outcome distributions and player volatility are not historically calibrated. The recorded player logs include only fantasy-league starts, so players without starts use market-value scoring estimates rather than zero.

Future draft picks owned in 2027-2029 retain their actual owners. For years 2030-2032, each franchise is assumed to receive an original first-, second-, third- and fourth-round pick. No future trades or subjective owner skill bonuses are included.

**Do not publish forecast percentages as verified odds.** Review retrospective accuracy and run sensitivity tests before integrating this model into FIG.

## Backtesting completed (October 30, 2026)

Historical 2023–2025 retrospective forecasts used team points through Week
5, Week 7, and Week 10 to predict the *remaining* regular-season scoring
average for all ten franchises. The 90 observations are correlated because
team-season observations overlap, and this ONLY backtests the current scoring
anchor, not year-ahead roster construction or rookie forecasts.

| Historical season | Full-season-to-date mean MAE | 65% mean / 35% last-three MAE |
| --- | ---: | ---: |
| 2023 | 13.63 PPG | 15.04 PPG |
| 2024 | 14.54 PPG | 15.11 PPG |
| 2025 | 12.51 PPG | 13.79 PPG |
| Pooled | 13.56 PPG | 14.65 PPG |

Training the optimal recent-form weight on 2023–2024 selected **0%**.
Using this frozen choice on a 2025 holdout yielded 12.51 PPG MAE, versus
13.79 PPG for the 65/35 blend. The experimental dynasty engine now uses
the full-season-to-date mean only for its present-roster calibration.
**The website's live playoff calculator remains unchanged.**

## Hypothetical stress tests

The separate script `scripts/stress_dynasty_dominance.js` runs eight model
scenarios with documented parameters, including two permanent player-loss
counterfactuals. Data as of October 30, 2026; each scenario below uses 300
Monte Carlo runs. Figures are *sensitivity estimates*, not validated odds.

| Scenario | Expected 2027–2032 years Boek is strongest scorer |
| --- | ---: |
| Baseline | 4.65 |
| Faster aging for all NFL veterans | 4.34 |
| Slower aging for all NFL veterans | 4.90 |
| Rookie contributions 30% weaker across league | 5.57 |
| Rookie contributions 30% stronger across league | 3.54 |
| Injury risk 50% higher across league | 4.49 |
| Boek permanently loses JSN and Bijan | 3.40 |
| Hayden permanently loses Gibbs and Allen | 4.73 |

**Important:** the player-loss test is an extreme permanent counterfactual;
it is not a routine injury forecast. A 300-run test has more Monte Carlo
noise than a production-grade validated projection.

## Current status

The dedicated GitHub Actions experiment checks pass, producing three
downloadable artifacts: dynasty scoring forecast, historical form backtest,
and stress results. An unrelated existing website regression asserts that
every archived dynasty-market snapshot must carry recovered provenance;
that assertion failed in the website suite but does not belong to these
new modeling changes.

Next validation priorities: NFL-wide started + bench scoring priors,
historically fitted rookie distribution and longevity curves, sensitivity
to correlations between players and full-year lineup availability,
and time-cutoff asset snapshot backtests where true snapshots exist.


## Experimental v2.1: Actual NFL-wide scoring and rookie follow-up

A separate draft-branch-only GitHub Actions workflow now builds
`data/dynasty_nfl_history.json` by reusing FIG's existing Sleeper weekly
NFL player-stats parser, standardizing 2023–2025 to FIG's **2026** scoring
weights. This is research data only; it never replaces official league
scores or the production playoff scoring archive.

- 2023: **679** NFL player-season records, Weeks 1–17
- 2024: **706** NFL player-season records, Weeks 1–17
- 2025: **702** NFL player-season records, Weeks 1–17
- 2026: reuse the current NFL-wide archive through verified Week 7
- **299 of 318** current FIG rostered skill-position players have observed
  NFL-wide games in the 2023–2026 scoring samples, representing **6,797**
  played-game observations; remaining player priors are retained instead
  of pretending they never scored.

The model prioritizes NFL-wide **played games** for rostered and bench players,
falls back to official historical FIG starter points when needed, and then
regresses low-sample players toward RosterAudit market-linked positional priors.
It never treats an unstarted fantasy player as having an NFL 0-point game.

The rookie component now uses **80 actually selected FIG rookies** from
2024 and 2025: 20 picks per fantasy draft round. Each selection's rookie
NFL scoring is measured over a fixed 17-week denominator, including
zero-game rookies. The 40 rookies drafted in 2024 also have a completed
2025 NFL season, from which the model measures **first-to-second-year**
change. For a 2025 rookie without a completed sophomore year, the model
samples changes from similarly productive 2024 selections in the same
fantasy draft round, preferring the same position. Later-career growth,
future injury probability and positional aging remain documented
hypothetical assumptions.

This is an improvement in input provenance, **not proof of calibration**:
two rookie classes, one sophomore follow-up class and three historical
NFL seasons are not a large enough sample for precise 2032 probabilities.
2026 current-week results and the present RosterAudit market values are
not retrospectively available at 2023–2025 cutoffs, so do not use them to
pretend this is a leakage-free long-term performance backtest.

For reproducibility:

    python scripts/build_dynasty_nfl_history.py
    node tests/test_dynasty_dominance.js
    node scripts/dynasty_dominance_model.js --runs 5000 --out /tmp/fig-dynasty-v2.json
    node scripts/stress_dynasty_dominance.js --runs 500 --out /tmp/fig-stress-v2.json

The data acquisition workflow commits only the historical research JSON
onto this **draft branch**. The public site stays unchanged.

## Retrospective validation (October 30, 2026)

The model's **scoring components**, not the 2027–2032 league probabilities,
were checked against genuinely unseen historical outcomes.

### NFL-wide player persistence, held-out 2025

One-year full-season scoring (all 17 weeks, missed weeks included) was
modeled using 2023 to predict 2024, fitting only those observations.
The frozen coefficient was 0.80 times prior-year weekly scoring with no
intercept. It was evaluated on 2024 to predict 2025, which played no part
in parameter selection. All seasons use FIG's 2026 scoring weights.

| 2024 to 2025 scoring cohort | n | Unchanged PPG MAE | Pretrained 0.80 PPG MAE |
| --- | ---: | ---: | ---: |
| All 2024 players with at least one NFL appearance | 706 | 2.276 | **2.100** |
| Played at least 8 games in 2024 | 358 | 3.581 | **3.268** |
| 2024 full-week PPG of 8+, at least 8 appearances | 150 | 5.081 | **4.546** |
| 2024 full-week PPG of 15+, at least 8 appearances | 49 | 6.459 | **5.428** |

The **0.80 coefficient has not been inserted directly into the dynasty
simulator**: it is fitted on all-17-week PPG that already includes
missed games and lost roles. The simulator starts with played-game
production and independently samples availability. Direct multiplication
would risk counting missed time twice. It motivates a future split
between role retention, played-game productivity, and injury time.

For 193 prior-season players still on FIG's 2026 rosters, the
position-specific age curve slightly improved 2025 MAE from 4.349 to
4.318 PPG. This survivor-only cohort is biased toward remaining useful
NFL players; it is not an independent age curve validation.

### Rookie holdout: real FIG 2024 draft -> 2025 draft

Fantasy draft-round priors were learned from 40 players drafted in
2024, then tested against the 40 distinct rookies drafted in 2025.
No 2025 results were used to select prior values.

- 2025 class MAE: **3.817 PPG** using 2024 round averages, versus
  **3.931 PPG** for a pooled class-average baseline.
- Each round has only **10 training and 10 holdout players**.
- Historical 2024 round-three 10th-to-90th range contained only
  **1 of 10** 2025 round-three rookie outcomes. The uncertainty
  distribution is insufficiently calibrated.
- The 2024 class's 2025 sophomore performance is available for fitting,
  but **no separate independent sophomore cohort is yet available**
  to test second-year extrapolations.

### Franchise scoring benchmark, not a dynasty replay

The prior-season team PPG baseline was evaluated across all 10 franchises,
using 2023->2024 to train a regression toward the league mean, then 2024
to predict 2025. The mean regression achieved **16.983 PPG MAE**, versus
**16.744 PPG MAE** from unchanged prior-season scoring. This is a case
where a seemingly attractive trained adjustment actually **failed** its
out-of-sample test and should not be advertised as improvement.

### Publication gate

`node scripts/assess_dynasty_validation.js` returns
`NOT_READY_FOR_VALIDATED_ODDS` with these explicit unresolved issues:

- No date-correct **pre-2026** RosterAudit dynasty-market archive:
  the actual market snapshots begin on **October 9, 2026**.
- No tested time-safe joining of full historical rosters, traded draft
  holdings, and market priors for a complete multiseason historical replay.
- No independent out-of-sample sophomore rookie class.
- No elapsed 2027–2032 seasons with which to check the calibration of
  the actual six-year strongest-roster probabilities.

The GitHub Actions model workflow executes no-leakage unit tests and
uploads full player, rookie, franchise and publication-gate research
artifacts. It **must not** be taken as evidence that exact championship
or dynasty dominance probabilities have been validated.

Run locally on the draft branch:

    node model_tests/test_dynasty_retrospective.js
    node scripts/backtest_dynasty_players.js --out /tmp/dynasty-player-backtest.json
    node scripts/backtest_dynasty_franchise.js --out /tmp/dynasty-franchise-backtest.json
    node scripts/assess_dynasty_validation.js --out /tmp/dynasty-publication-readiness.json

All official league records, Sleeper updates, website UI and the live
playoff calculator remain untouched.


## Time-sliced historical full-roster reconstruction (2024/2025)

The draft branch now contains
`scripts/build_dynasty_asof_snapshots.js` and
`model_tests/test_dynasty_asof.js`.

The builder reconstructs **all ten actual fantasy rosters at the end of
Week 7** using `data/weekly_full_rosters.json` rather than substituting
present-day roster memberships. It reconstructs original-franchise draft
picks from timestamped `data/transactions.json` transfers, including
trades that occurred in earlier league seasons. No 2026 RosterAudit prices
are inserted into 2024–2025.

| Snapshot | Actual rostered players | Future owned picks | Time-safe lineup baseline MAE, Weeks 8–14 | Frozen baseline leader | Actual rest-of-year leader |
| --- | ---: | ---: | ---: | --- | --- |
| 2024 after Week 7 | 303 | 120 | 14.82 PPG | Hayden | Hayden |
| 2025 after Week 7 | 318 | 120 | 10.56 PPG | Hayden | Hayden |

Baselines were calculated from NFL games **through the cutoff only**,
scored consistently using FIG's 2026 scoring weights. The target is
historical actual regular-season team scoring over Weeks 8–14.
Because actual scores use the earlier years' specific scoring rules and
future lineup/roster decisions, this is a **partial short-horizon test**
and the PPG absolute error is not a perfectly like-for-like comparison.

Blending 30% previous-season player scoring into the frozen roster was
*less* accurate in 2024 (22.55 PPG MAE) but *slightly* better in 2025
(9.56 PPG MAE). The model **does not retroactively tune that weight
using the 2025 results**.

The 2024 and 2025 pick replay flagged respectively **three and one**
Sleeper `previous_owner_id` chain inconsistencies, which remain visible
in the report. These are evidence gaps in the chain, NOT proof of an
incorrect final owner. As an independent check, replaying transfers
through 2026 Week 7 exactly matches **120/120** official current
2027–2029 pick owners despite **two chain warnings**. Never suppress
the warnings or convert a chain mismatch into a known-clean transfer.

One 2025 Week 7 roster entry carried the non-offensive position DB and
is excluded from the QB/RB/WR/TE lineup forecast, but retained in the
roster-count audit.

**No-leakage regression:** the tests alter NFL game results *after*
each historical cutoff and inject a fabricated Week 8 pick transaction.
Neither can change the historical pre-cutoff projection or owned picks.

### What this newly verifies

- Historical fantasy roster membership of all ten franchises at an
  actual Week 7 decision point.
- Historical 120 original-franchise pick assignments per snapshot
  across the next three annual four-round drafts.
- Forward consistency of the pick transfer ledger with all 120
  presently known 2027–2029 original pick owners.
- Time-safe week 8–14 team strength comparisons, including
  demonstrable forecast error and a holdout year.

### What remains *unverified*

This is **not** a fully backtested multiyear dynasty engine. Historical
2024 and 2025 RosterAudit *market values* were never archived at those
dates, so the exact current simulation cannot be run historically
without importing future values into its priors. Actual subsequent
fantasy team scores also reflect later trading, waivers, rookie picks,
injuries, and managers' weekly lineup choices, whereas these projections
freeze the old roster and treat picks as owned assets. Proper
multiyear calibration needs historical as-of player priors and
explicit treatment of unknown future roster transactions.

### Commands

    node model_tests/test_dynasty_asof.js
    node scripts/build_dynasty_asof_snapshots.js --out /tmp/dynasty-historical-asof.json
    node scripts/assess_dynasty_validation.js --asof /tmp/dynasty-historical-asof.json --out /tmp/dynasty-publication-readiness.json

The CI research artifact contains historical rosters, all their future
pick holdings, model errors, chain warnings, and a 2026 reconciliation
check. All of this stays on the draft PR.


## Frozen-asset one-season holdout (October 30, 2026)

A standalone, **non-market-based one-season forecast** now operates on the
two verified Week 7 historical roster and future-pick snapshots:
`scripts/backtest_dynasty_next_season.js`.

- 2024 W7 cutoff → 2025 full 14-week regular season.
- 2025 W7 cutoff → 2026 verified Weeks 1–7.
- Uses **only pre-cutoff NFL scores** for each current rostered player.
- For 2026, first-year future picks draw from the actual **2024** completed
  FIG rookie-draft outcomes (40 players). The 2025 rookie class is deliberately
  **not** used to predict 2026; it would leak future information.
- For the 2025 target, there was **no completed earlier FIG rookie-draft
  class** at the 2024 Week 7 cutoff. That forecast excludes unobservable
  rookie contributions and explicitly discloses the omission.
- Future player trades and waiver acquisitions are never invented.
- The target is real subsequent team scoring, including later roster
  turnover. These are not equivalent to a frozen roster's outcomes.

### Actual historical results — 750 Monte Carlo trials per snapshot

| Cutoff -> target | Model MAE using undiscouned full-week production | Simple Week-7 roster baseline MAE | Difference | 10–90% interval coverage |
| --- | ---: | ---: | ---: | ---: |
| 2024 W7 -> 2025 season | **24.03 PPG** | **22.55 PPG** | 1.48 PPG worse | **60%** |
| 2025 W7 -> 2026 W1–7 | **25.23 PPG** | **23.96 PPG** | 1.27 PPG worse | **70%** |

Both model predicted #1 ranks matched actual leading scoring teams
(Hayden in 2025 and Boek in 2026), **but the 10-team scoring predictions
failed to beat the simple historical roster baseline**. Probability
interval coverage is also below nominal 80%. **Do not publish the
model's season-by-season #1 probabilities as calibrated odds.**

Crucial Boek–Hayden comparisons:

- From 2024 Week 7, simulated 2025 PPG: Hayden **189.88** vs Boek
  **161.03**. Real 2025: Hayden **214.30**, Boek **209.55**.
- From 2025 Week 7, simulated 2026 PPG: Boek **224.38** vs Hayden
  **223.30**. Actual verified 2026 W1–7: Boek **234.91** vs Hayden
  **213.94**.
- Mean 2024-to-2025 franchise roster retention measured at the
  following season's Week 7 was **53.1%**, and for 2025-to-2026
  **50.7%**. Future trading, waivers and draft acquisitions are
  therefore an important *missing process*, not an earned bonus for any
  particular manager.

An experimental 0.80 carry-forward multiplier **failed more badly**:
36.01 PPG MAE for 2025 and 38.74 for 2026, with 80% intervals covering
only 30% and 10% of observed outcomes respectively. We therefore use
1.00 full-week persistence by default in this *separate one-year test*.
This does not rewrite the live playoff calculator or multiyear dynasty
projection, which must be calibrated independently.

### Statistical / publication consequences

The formal validation gate now flags these as **failed**:

1. The experimental one-year model must outperform the simple cutoff
   roster baseline in **both** holdouts.
2. Its nominal 80% intervals must cover at least 80% of the ten
   observed team scores at **each** historical cutoff.

The code now contains deterministic tests that keep the publication
gate blocked when the model fails these checks. Passing CI means the
model is working **as coded**, not that its predictions are statistically
trustworthy.

Run locally:

    node model_tests/test_dynasty_next_season.js
    node scripts/backtest_dynasty_next_season.js --runs 750 --out /tmp/fig-next-year.json
    node scripts/backtest_dynasty_next_season.js --runs 250 --persistence 0.8 --out /tmp/fig-overdiscounted.json

The project remains a research-only branch with no website/production
deployment or changes to the existing historical league records.
