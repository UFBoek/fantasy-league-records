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
