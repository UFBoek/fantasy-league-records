# FIG Legacy Points 2.1: Smoothed season awards, 2017-2025

Research-only backtest over all 1,529 players with recorded NFL scoring appearances in 2017-2025. Uses FIG scoring settings via `research/fig_historical_ppg_2010_2025.json` and counts every recorded NFL appearance as a *hypothetical* FIG start. These totals are not official Hall of Fame Legacy Points.

## Why smooth awards?

Previously, a WR at 15.49 PPG received zero season points while 15.50 earned 30. The new curve begins at the 0-point positional floors (QB 22 / RB 13 / WR 13 / TE 10) and interpolates continuously through every existing seasonal milestone. The cap remains 205 points for the highest award. Awards are rounded to one decimal and earned only at season completion with eight or more verified FIG starts.

George Pickens through 2026 Week 7: 15.457142857 WR PPG, **29.5 pending seasonal points**, not zero. Seven FIG starts means the preview is not earned yet.

## 450 vs 500 vs 550 selection

| Eligibility cutoff | Original tiered 2.0 | New smoothed 2.1 |
|---|---:|---:|
| 450 | 30 | 40 |
| **500** | Not previously used | **31** |
| 525 | Not previously used | 29 |
| 550 | Not previously used | 26 |
| 600 | Not previously used | 22 |

The **500-point** requirement almost exactly preserves the original 450-point tiered model's 30 eligible players, while the smoother scoring accounts for sustained performance more fairly.

## Career benchmarks

| Player | Previous tiered Legacy 2.0 | Smoothed Legacy 2.1 |
|---|---:|---:|
| Cooper Kupp | 576 | 657.1 |
| Mike Evans | 489 | 600.1 |
| Justin Jefferson | 580 | 639.1 |
| Ja'Marr Chase | 609 | 652.1 |
| Patrick Mahomes | 1,100 | 1,211.4 |
| Josh Allen | 1,066 | 1,173.0 |

The Evans-Kupp gap declines to 57 from 87 points with smoothing. A player who has regularly been near seasonal milestones no longer loses all recognition for falling just short.

## Official league archive cross-check

The 2023-2026 Week 7 FIG started-player archive (completed seasonal awards through 2025) gives:

| Component | Tiered Legacy 2.0 | Smoothed Legacy 2.1 |
|---|---:|---:|
| Completed season points | 7,640 | 10,253.7 |
| Verified game points | 5,085 | 5,085 |
| Season share | 60.04% | 66.85% |
| Game share | 39.96% | 33.15% |
| Eligibility threshold | 450 | **500** |
| Players meeting new/current threshold | 1 | 0 |
| Highest scorer | Josh Allen, 456 | Josh Allen, 484.5 |

No game scoring bands were changed. **Raising the Hall eligibility threshold does not preserve the 60/40 scoring composition.** Additional balancing would require revisiting award values rather than eligibility. The current change intentionally prioritizes the removal of cliffs and a similar number of historically eligible players.

Research caveats: the 2017-2025 mock omits pre-2017 seasons; it includes all NFL appearances, not genuine FIG starters; certain historical bonus data may be incomplete. Actual FIG only credits verified lineup starts and awards seasons after completion.
