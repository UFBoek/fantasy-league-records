# FIG Legacy Points 2.0: 2017-2025 backtest

Research-only simulation using `research/fig_historical_ppg_2010_2025.json` (NFL regular seasons). Generated from the same proposed award bands as `hall-of-fame-legacy-v245.js`. The regression test `tests/test_hall_of_fame_legacy.js` recomputes the sample from raw weekly rows and verifies the player counts, ratios and Mike Evans / Cooper Kupp totals.

**Not official FIG eligibility.** Every recorded NFL appearance counts as a hypothetical fantasy start, including games where the player would have been benched, and the sample excludes seasons before 2017. Certain pre-2021 50+ yard bonus stats may be absent. Official FIG calculations use verified starter game logs and completed seasons only.

## Score calibration

| Metric | Legacy 1.0 | Legacy 2.0 |
|---|---:|---:|
| Season points (all players) | 22,295 | 28,645 |
| Game points (all players) | 10,453 | 21,680 |
| Total | 32,748 | 50,325 |
| Season share | 68.08% | 56.92% |
| Players scoring 350+ | 20 | 43 |
| Players scoring 300+ | 32 | 58 |
| Players scoring 450+ | 12 | 30 |
| Players scoring 600+ | 9 | 12 |

All 1,529 modeled players are included in the denominator, even those who are never serious Hall candidates.

## Key career comparisons

| Player | Pos | Previous total | 2.0 season | 2.0 game | 2.0 total |
|---|---|---:|---:|---:|---:|
| Travis Kelce | TE | 941 | 775 | 273 | **1,048** |
| Patrick Mahomes | QB | 819 | 735 | 365 | **1,100** |
| Josh Allen | QB | 807 | 670 | 396 | **1,066** |
| Christian McCaffrey | RB | 861 | 690 | 304 | **994** |
| Davante Adams | WR | 684 | 640 | 253 | **893** |
| Derrick Henry | RB | 606 | 530 | 253 | **783** |
| Justin Jefferson | WR | 445 | 405 | 175 | **580** |
| Cooper Kupp | WR | 443 | 420 | 156 | **576** |
| Stefon Diggs | WR | 341 | 365 | 164 | **529** |
| Keenan Allen | WR | 356 | 355 | 172 | **527** |
| Mike Evans | WR | 311 | 310 | 179 | **489** |
| CeeDee Lamb | WR | 339 | 330 | 151 | **481** |
| Tyler Lockett | WR | 134 | 150 | 96 | **246** |

Evans and Kupp are a key design check: the scoring gap decreases from 132 to 87. Kupp retains an advantage, while Evans's productive seasons gain greater weight.

## Current FIG dataset cross-check

Using the actual FIG archive from 2023 through 2026 Week 7 (5,238 verified player starts):

| Component | Legacy 1.0 | Legacy 2.0 |
|---|---:|---:|
| Completed-season awards | 5,825 | 7,640 |
| Verified game bonuses | 2,513 | 5,085 |
| Season share | 69.86% | **60.04%** |
| Game share | 30.14% | **39.96%** |
| Current players above 350 | 0 | **3** |

The three current points-qualified players would be Josh Allen (456), Ja'Marr Chase (372) and Christian McCaffrey (366). All current 2026 seasonal awards remain pending until the season is complete.

### Interpretation and tradeoffs

- This is a replacement eligibility system, not an addition to the old three-of-five criteria. There is no automatic induction.
- 60/40 is an aggregate target, not a guaranteed ratio for an individual player or for every historical window.
- Positionally distinct game tiers increase the rewards for ordinary QB starts more than for other positions. The annual positional fairness and Hall class composition should be reviewed after publication.
- Legacy Points 2.0 keeps the eight-start completed-season minimum, includes playoffs in the **actual FIG league** calculation, and preserves the commissioner-selected founding class and watchlist.
- Future scoring updates will move the realized aggregate percentage as new games and full seasons are added.

## 2.0 season awards

| Legacy points | QB PPG | RB PPG | WR PPG | TE PPG |
|---:|---:|---:|---:|---:|
| 30 | 25 | 16 | 15.5 | 13.5 |
| 50 | 26.5 | 18.5 | 18.5 | 15 |
| 70 | 28.5 | 19.5 | 19.5 | 16 |
| 95 | 29.5 | 22.5 | 21.5 | 17 |
| 120 | 32 | 26 | 25 | 18.5 |
| 145 | 34.5 | 28 | 27.5 | 20.5 |
| 175 | 37.5 | 30 | 30 | 22.5 |
| 205 | 41 | 33 | 33 | 25 |

## 2.0 game awards

| Scoring band | QB | RB | WR | TE |
|---:|---:|---:|---:|---:|
| 20+ | 1 | 2 | 2 | 3 |
| 30+ | 3 | 5 | 5 | 10 |
| 40+ | 7 | 10 | 10 | 18 |
| 50+ | 13 | 15 | 15 | 26 |
| 60+ | 22 | 25 | 25 | 35 |

One award per game, from the highest attained band, never the sum of all crossed bands.
