# FIG injury history — evidence and definitions

The injury leaderboard must **never infer an injury from fantasy points or a
low snap share**. nflverse injury-report coverage has a gap after 2024. NFL
snap counts alone cannot prove a player left due to injury.

## Injury event verification

`data/injury_events_reviewed.json` is an explicit reviewed-event ledger.
Every counted event must contain these required fields:

- `event_id`: unique stable ID, e.g. `2026-w05-sleeperplayer123-leg`
- `season`, `week`, `sleeper_player_id`, `player_name`
- `verification_status`: exactly `verified`
- `source_url`: HTTPS source documenting the injury; not speculation
- `injury_description`: concise, sourced injury event description
- `exited_due_to_injury`: whether the player left because of injury
- `missed_snaps_confirmed`: **true only when injury-related missed snaps
  are corroborated**. Being injured but continuing to play with zero missed
  snaps MUST be false.
- `subsequent_nfl_games_missed`: 0 or greater, or null if not established
- `placed_on_ir` / `season_ending`: confirmed outcomes, default false
- `severity_source_url`: required HTTPS source if tagging a major injury

Only a verified exit *with missed game snaps* qualifies as a **started
in-game injury**, and only when the player was started in the fantasy lineup
for that completed league week.

An **established rotational player** started **at least two of the four
prior completed fantasy weeks on that same franchise**. An injury counts
as a rotation injury if verified and meaningful, even when the manager
benched the player during the injury week.

A **major rotation injury** requires corroborated IR placement,
season-ending status, or at least four subsequent NFL games missed. The
severity source must explicitly support that result.

These categories can overlap: never add them as if they were separate
injury events. Don't count recovery weeks repeatedly.

## Josh Allen counterexample

If a player gets hurt but misses **zero** NFL game snaps and misses **zero**
subsequent NFL games, do **not** count an in-game injury or rotation injury
merely because an injury was mentioned. A low fantasy score or injury
designation is also not enough evidence.

## Historical completeness

This archive begins in 2023. `injury_history.json` deliberately reports
`coverage: reviewed_events_only` and
`is_complete_historical_census: false` until externally evidenced
historical game exits can be fully audited. Empty verified data does not
mean zero injuries actually occurred.

Run `python scripts/build_injury_history.py` after refreshing Sleeper
lineups and before publishing changed JSON. Do not claim a complete
injury-luck ranking while the evidence audit is incomplete.
