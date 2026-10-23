# UI and route inventory

Baseline: `a5ad19b45624ebd0a7f6231a4b43ec0095136856`. Captured before UI changes.

The router contains 34 named route families. Automated baseline inspection rendered 423 concrete routes with zero uncaught JavaScript errors.

## Route families

- `#/breakdown`
- `#/champions`
- `#/draft`
- `#/dynasty`
- `#/game`
- `#/games`
- `#/h2h`
- `#/historical-predictions`
- `#/home`
- `#/livematch`
- `#/manager`
- `#/manager-ratings`
- `#/matchup`
- `#/minigames`
- `#/more`
- `#/player`
- `#/playerbomb`
- `#/playerbombrank`
- `#/players`
- `#/playerweeks`
- `#/playoff-calculator`
- `#/playoffbracket`
- `#/record`
- `#/records`
- `#/rivalry`
- `#/singleseasons`
- `#/special`
- `#/standings`
- `#/streak`
- `#/streaks`
- `#/team`
- `#/teams`
- `#/teamseason`
- `#/trades`

## Shared interaction contracts

Preserve hash URLs and data-key/data-value hooks; two-pane frozen rank/name columns; sortable headers; mobile sort controls and expanded statistics; season/view/position/team filters; search; pagination; record exclusions; team tabs; details disclosures; clickable scores, owners and players; draft grades and return explorers; trade side/rating filters; lineup budget eligibility; scenario winners and simulation tools.

## Integration contracts

Manifest and approved icons unchanged. Existing service-worker handlers retained, new shell assets registered. Sleeper live polling and published-snapshot refresh cadence unchanged. No data JSON or statistical builder/math modules changed. Deployment workflows remain untouched.

## Inspected route examples

| Route | Heading | Links | Controls |
|---|---|---:|---:|
| `#/home` | FROMM ISGARBAGE | 27 | 34 |
| `#/teams` | THE TEAMS | 10 | 0 |
| `#/team/1` | Boek | 73 | 7 |
| `#/team/6` | Hayden | 93 | 7 |
| `#/records` | TEAM RECORDS | 53 | 15 |
| `#/streaks` | STREAKS | 20 | 5 |
| `#/players` | PLAYER RECORDS | 2338 | 26 |
| `#/player/4881` | Lamar Jackson | 89 | 23 |
| `#/draft` | DRAFT RANKINGS | 94 | 13 |
| `#/trades` | TRADE RATINGS | 48 | 28 |
| `#/h2h` | HEAD-TO-HEAD | 9 | 10 |
| `#/champions` | CHAMPIONS | 13 | 8 |
| `#/dynasty` | ROSTER VALUES | 10 | 0 |
| `#/games` | GAME ARCHIVE | 40 | 16 |
| `#/minigames` | MINIGAMES | 1 | 13 |
| `#/manager-ratings` | MANAGER RATINGS | 10 | 5 |
| `#/playoff-calculator` | PLAYOFF CALCULATOR | 0 | 21 |
| `#/historical-predictions` | HISTORICAL PREDICTIONS | 1 | 2 |
| `#/more` | MORE | 13 | 0 |
| `#/team/4` | Sack | 15 | 7 |
| `#/breakdown/teamrecord/RECORD/Regular%20Season/1` | Boek • RECORD | 97 | 10 |
| `#/breakdown/weekly/highscores/Regular%20Season/1` | Boek • WEEKLY HIGH SCORES | 31 | 7 |
| `#/breakdown/streak/125%2B%20Points/Career%20Games/1/2023/10/2026/6` | Boek • 125+ Points | 44 | 0 |
| `#/game/2025/16/2` | MATCHUP LINEUPS | 49 | 0 |
| `#/teamseason/1/2025` | Boek • 2025 | 31 | 0 |
| `#/singleseasons` | SINGLE-SEASON RECORDS | 14 | 2 |
| `#/breakdown/season/20%20BOMBS/1/2025` | Boek • 2025 20 BOMBS | 91 | 6 |
| `#/playoffbracket/2024` | 2024 PLAYOFFS | 9 | 0 |
| `#/special/teamweeks/Regular%20Season` | HIGHEST SCORING WEEKS | 101 | 9 |
| `#/special/teamweeks-low/Regular%20Season` | LOWEST SCORING WEEKS | 101 | 9 |
| `#/special/highscores/Regular%20Season` | WEEKLY HIGH SCORES | 11 | 5 |
| `#/special/top3/Regular%20Season` | TOP-3 WEEKLY SCORES | 11 | 5 |
| `#/record/team/Career%20Points%20Scored/Regular%20Season` | Career Points Scored | 11 | 6 |
| `#/streak/Winning/Career%20Games` | Winning | 59 | 10 |
| `#/playerweeks` | HIGHEST SCORING PLAYER WEEKS | 301 | 10 |
| `#/playerbombrank/5%20BOMBS/all/All-Time%20Combined` | 5 BOMBS | 337 | 5 |
| `#/playerbomb/7553/5%20BOMBS/all/All-Time%20Combined/all` | Kyle Pitts Sr. • 5 BOMBS | 24 | 0 |
| `#/playerbomb/7526/5%20BOMBS/all/All-Time%20Combined/all` | Jaylen Waddle • 5 BOMBS | 17 | 0 |
| `#/playerbomb/6819/5%20BOMBS/all/All-Time%20Combined/all` | Michael Pittman Jr. • 5 BOMBS | 17 | 0 |
| `#/playerbomb/8110/5%20BOMBS/all/All-Time%20Combined/all` | Jake Ferguson • 5 BOMBS | 17 | 0 |
| `#/playerbomb/1466/5%20BOMBS/all/All-Time%20Combined/all` | Travis Kelce • 5 BOMBS | 16 | 0 |
| `#/playerbomb/4983/5%20BOMBS/all/All-Time%20Combined/all` | DJ Moore • 5 BOMBS | 16 | 0 |
| `#/playerbomb/7588/5%20BOMBS/all/All-Time%20Combined/all` | Javonte Williams • 5 BOMBS | 16 | 0 |
| `#/playerbomb/4981/5%20BOMBS/all/All-Time%20Combined/all` | Calvin Ridley • 5 BOMBS | 16 | 0 |
| `#/playerbomb/4046/20%20BOMBS/all/All-Time%20Combined/all` | Patrick Mahomes • 20 BOMBS | 23 | 0 |
| `#/playerbomb/6904/20%20BOMBS/all/All-Time%20Combined/all` | Jalen Hurts • 20 BOMBS | 20 | 0 |
| `#/playerbomb/7547/20%20BOMBS/all/All-Time%20Combined/all` | Amon-Ra St. Brown • 20 BOMBS | 20 | 0 |
| `#/playerbomb/7523/20%20BOMBS/all/All-Time%20Combined/all` | Trevor Lawrence • 20 BOMBS | 20 | 0 |
| `#/playerbomb/9509/20%20BOMBS/all/All-Time%20Combined/all` | Bijan Robinson • 20 BOMBS | 18 | 0 |
| `#/playerbomb/4034/20%20BOMBS/all/All-Time%20Combined/all` | Christian McCaffrey • 20 BOMBS | 18 | 0 |
| `#/playerbomb/3163/20%20BOMBS/all/All-Time%20Combined/all` | Jared Goff • 20 BOMBS | 17 | 0 |
| `#/playerbomb/7564/20%20BOMBS/all/All-Time%20Combined/all` | Ja'Marr Chase • 20 BOMBS | 17 | 0 |
| `#/playerbomb/4984/30%20BOMBS/all/All-Time%20Combined/all` | Josh Allen • 30 BOMBS | 17 | 0 |
| `#/playerbomb/4881/30%20BOMBS/all/All-Time%20Combined/all` | Lamar Jackson • 30 BOMBS | 16 | 0 |
| `#/playerbomb/8183/30%20BOMBS/all/All-Time%20Combined/all` | Brock Purdy • 30 BOMBS | 11 | 0 |
| `#/playerbomb/6797/30%20BOMBS/all/All-Time%20Combined/all` | Justin Herbert • 30 BOMBS | 10 | 0 |
| `#/playerbomb/3294/30%20BOMBS/all/All-Time%20Combined/all` | Dak Prescott • 30 BOMBS | 10 | 0 |
| `#/playerbomb/9221/40%20BOMBS/all/All-Time%20Combined/all` | Jahmyr Gibbs • 40 BOMBS | 5 | 0 |
| `#/playerbomb/6786/40%20BOMBS/all/All-Time%20Combined/all` | CeeDee Lamb • 40 BOMBS | 5 | 0 |
| `#/playerbomb/6770/50%20BOMBS/all/All-Time%20Combined/all` | Joe Burrow • 50 BOMBS | 4 | 0 |

The regression suite compares baseline content links across all captured routes and separately exercises button-driven tabs and tools.
