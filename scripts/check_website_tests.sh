#!/usr/bin/env bash
# Front-end behavior tests are intentionally separate from the scheduled
# Sleeper data refresh. UI regressions must not halt weekly score publication.
set -euo pipefail
PYTHONPATH=. python tests/test_boekmuse_touchdowns.py
node tests/test_league_ask.js
node tests/test_league_ask_ai.js
node tests/test_record_break_watch.js
node tests/test_team_record_views.js
node tests/test_single_season_watch.js
node tests/test_trade_ratings.js
node tests/test_record_drilldowns.js
node tests/test_waiver_history.js
node tests/test_historical_predictions.js
node tests/test_playoff_current_lineups.js
node tests/test_playoff_matchup_details.js
node tests/test_playoff_live_scoring.js
node tests/test_playoff_live_forecast.js
node tests/test_playoff_projected_pf.js
node tests/test_playoff_implication_rank.js
node tests/test_playoff_live_score_bounds.js
node tests/test_playoff_season_draw.js
node tests/test_playoff_week_gate.js
node tests/test_playoff_weekly_expected.js
node tests/test_roster_search_interaction.js
node tests/test_dynasty_market.js
