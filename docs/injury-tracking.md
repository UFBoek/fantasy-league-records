# FIG injury history — evidence and definitions

The injury leaderboard must **never infer an injury from fantasy points or a
low snap share**. nflverse's published documentation once reported that
injury-report feeds ended after 2024, but the GitHub release archive now has
2025 and 2026 CSV assets as of October 2026. NFL snap counts and injury
reports alone cannot prove a player left due to injury.

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

A **Major injury** requires an independently documented **season-ending
injury** (with a source expressly confirming the player will miss the rest
of the NFL season). Neither injured reserve placement nor four missed
games alone is sufficient. The player must have been started or part of
the established fantasy rotation, and the injury must also qualify as
a verified injury-limited NFL game exit.

Major is **mutually exclusive** with Started and Rotation for that event.
A verified season-ending injury is counted once, as **Major only**; it is
never additionally counted as an in-game starter injury or a rotational
injury. Non-major started and rotational injuries may overlap, because
an established regular starter satisfies both criteria. Use
`injury_events` for the unique injury total and never add the Started
and Rotation totals together. Don't count recovery weeks repeatedly.

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

The site exposes team-first Injury History at `#/injuries` from Records.
Click any of the 10 franchises (`#/injuries/team/6`), select a year
(`#/injuries/team/6/2024`), then click an injury for the evidence
(`#/injuries/event/EVENT_ID`). Every team profile and team-season page
has a direct injury-history link.

Manager totals show only verified cases and are not definitive injury-luck
rankings. Unconfirmed snap-count leads are grouped **under each team and
season** in a separate review panel, rather than mixed with counted cases.

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


## Structured discovery: 2023–2026

\`scripts/discover_injury_candidates.py\` downloads **per-season structured
CSV files** from two GitHub release feeds under \`nflverse/nflverse-data\`:

- \`releases/download/snap_counts/snap_counts_YEAR.csv\`: Pro Football
  Reference offensive participation by game.
- \`releases/download/injuries/injuries_YEAR.csv\`: NFL pregame/practice
  injury reports; subsequent reports are supporting clues, not proof
  an injury happened in an earlier game.

The script intersects completed Sleeper starter/rotation lineups with
players whose in-game NFL offensive participation is unusually low versus
their own season reference (at least two other normal-sized games).
A next-week injury report elevates review priority.

**Critical guardrail:** A player with *no NFL snaps* that week is excluded
from in-game injury leads. That pattern could be a bye, game-day inactive,
coaching decision or a previously acquired injury; none is proof of an
in-game departure. Sam Darnold's 2025 Week 8 Seattle bye was a real false
positive caught and removed by this rule.

This is an evidence triage system, not an injury classifier. Confirmed
game-ending conditions require separately reviewed NFL/team reporting.
No source records or generic snap percentages can award league injury
counts automatically. Even the resulting leads list may omit injuries
where no reliable season-long comparison exists, especially first-week
season-ending injuries.

The data file \`data/injury_discovery_candidates.json\` has
\`counts_toward_injuries: false\` and \`is_complete_injury_history: false\`.
Its candidates are only review suggestions. Historical verified injuries
still come exclusively from \`data/injury_events_reviewed.json\`.

### Automation

\`.github/workflows/discover-injuries.yml\` runs **daily at 11:47 UTC**
(GitHub schedule is best-effort) and whenever the discovery workflow,
script or discovery tests change. It scans seasons 2023–2026, runs
\`tests/test_injury_discovery.py\`, publishes updated review suggestions,
and stamps the browser manifest to notify open tabs. If any provider
data is missing/incomplete or tests fail, it stops without replacing the
last successful discovery snapshot.

Separately, the Sleeper refresh checks every five minutes and performs
a full rebuild hourly, using source-reviewed injury events in
\`scripts/build_injury_history.py\` only after fantasy weeks have closed.

### Initial historical verification sample

The first 2023–2025 source-backed entries include the in-game injuries
to Anthony Richardson, Deebo Samuel and Joe Burrow (2023);
Chris Olave, Jayden Daniels and Brandon Aiyuk (2024);
and Xavier Worthy, CeeDee Lamb and C.J. Stroud (2025).

Joe Burrow's wrist injury and Brandon Aiyuk's ACL/MCL injury have
independent NFL.com documentation confirming **season-ending** outcomes.
Both are counted as **Major only**, not Started or Rotation.
Other cases remain non-major until severity evidence is checked.

**The historical audit remains incomplete.** Continue verifying
higher-priority leads against game-ending reports and exclude
fully returned players; user approval of a set of review leads is not
a substitute for precise event-by-event game-outcome evidence.
