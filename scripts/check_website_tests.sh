#!/usr/bin/env bash
# Front-end behavior tests are intentionally separate from the scheduled
# Sleeper data refresh. UI regressions must not halt weekly score publication.
set -euo pipefail
node tests/test_record_break_watch.js
node tests/test_team_record_views.js
node tests/test_single_season_watch.js
node tests/test_trade_ratings.js
node tests/test_record_drilldowns.js
node tests/test_waiver_history.js
node tests/test_historical_predictions.js
node tests/test_playoff_current_lineups.js
