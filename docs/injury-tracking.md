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
  are corroborated**. Zero missed snaps must never count.
- `injury_game_outcome`: one of:
  - `did_not_return` — exited injured and did not return
  - `limited_return_no_finish` — returned for limited snaps but the injury
    prevented them from finishing the game in their normal role
  - `returned_full_and_finished` — resumed normal playing time, finished the
    game, and must be **excluded**, even if some snaps were missed earlier
  - `unknown` — insufficient evidence of how the game ended; excluded
- `game_outcome_source_url`: HTTPS evidence explicitly documenting the
  injury-related exit/limitation and game-finish outcome. Snap percentages
  alone are not enough: normal rotations, coaching decisions and blowout
  substitutions must not be mistaken for injury departures.
- `subsequent_nfl_games_missed`: 0 or greater, or null if not established
- `placed_on_ir` / `season_ending`: confirmed outcomes, default false
- `severity_source_url`: required HTTPS source if tagging a major injury

Only a **verified injury-related disruption that prevents full game
completion** qualifies as a started in-game injury. This requires a
documented injury exit, missed snaps, and evidence that the player either
did not return at all or returned only briefly and did not finish the game
normally. The player must also have been started in fantasy that completed
league week. A player who returns at full participation and finishes the
game does **not** count, regardless of temporarily missed snaps.

An **established rotational player** started **at least two of the four
prior completed fantasy weeks on that same franchise**. An injury counts
as a rotation injury if the game-ending disruption is verified by the
same rules, even when the manager benched the player during the injury week.

A **major rotation injury** requires corroborated IR placement,
season-ending status, or at least four subsequent NFL games missed. The
severity source must explicitly support that result.

These categories can overlap: never add them as if they were separate
injury events. Don't count recovery weeks repeatedly.

## Played-through and brief-return counterexamples

- A player like the described Josh Allen example who sustains an injury but
  misses **zero** game snaps is excluded.
- A player who misses a few snaps, **returns fully and finishes the game** is
  also excluded, even if a sideline injury evaluation occurred.
- A player who leaves injured, returns for only a few snaps, then cannot
  finish the game because of the injury **counts**.
- A player who exits injured and never returns **counts**.
- If the end-of-game impact is uncertain, the case is excluded pending
  corroborating evidence. A low fantasy score or snap percentage alone
  does not demonstrate an injury-related early game exit.

A later major-injury report cannot override a verified full-game finish for
that week's in-game or rotational injury counts. Separate later injuries
require their own verified event record.

## Historical completeness

This archive begins in 2023. `injury_history.json` deliberately reports
`coverage: reviewed_events_only` and
`is_complete_historical_census: false` until externally evidenced
historical game exits can be fully audited. Empty verified data does not
mean zero injuries actually occurred.

Run `python scripts/build_injury_history.py` after refreshing Sleeper
lineups and before publishing changed JSON. Do not claim a complete
injury-luck ranking while the evidence audit is incomplete.

## 2026 pilot — first reviewed evidence (October 9)

The first six source-reviewed game-ending injury events have been entered into
`data/injury_events_reviewed.json` (2026 weeks 1–4), with direct source links
and corroboration of injury-related early game exits. **These are an initial
sample, not a complete list of 2026 injuries.** An injury is not described as
major without a separate, verified severity record. Week 5 is still active and
is not eligible for official counts.

The second file `data/injury_candidate_leads.json` contains 17 hand-curated
NFL.com roundup leads from weeks 1–4 that still require game-finish review.
`scripts/build_injury_candidates.py` matches them against completed Sleeper
lineups, reports which team started or frequently started the player, and
writes `data/injury_candidates.json` without publishing a single injury count.

**Example of why this matters:** NFL.com reports Zay Flowers exited and did not
return in Week 1, but subsequent reporting indicates he might have been
available if the game had been closer. He remains a review lead rather than
an automatically counted game-ending injury. Saquon Barkley's temporary Week 2
stinger exit and return similarly needs an explicit normal-finish check.

The site exposes the source-backed first pass at `#/injuries` from Records.
Manager totals show only the verified cases currently in the ledger and are
not ranked as definitive injury luck. Any unverified lead appears separately
and is never incorporated into verified totals.

### Adding new events

1. Record the player's season/week, Sleeper player ID and NFL team source URL.
2. Verify the injury directly caused early exit, including missed snaps and
   failure to finish the game normally. Distinguish protective/blowout rest.
3. Record `game_outcome_source_url` for a documented `did_not_return` or
   `limited_return_no_finish` outcome. A complete full return is excluded.
4. Leave `subsequent_nfl_games_missed: null` and severity flags false until
   a separate source verifies a major injury.
5. Commit the reviewed ledger. The GitHub Actions refresh regenerates the
   injury history, candidates and safely validated site data.

The injury-count logic remains independent of current-week live scores and
will continue to use **completed fantasy weeks only**.
