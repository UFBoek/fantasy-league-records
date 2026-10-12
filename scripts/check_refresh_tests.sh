#!/usr/bin/env bash
# Offline regression checks, including curated trade exclusions, remain valid when new league games/trades arrive.
# Several legacy UI and trade snapshot tests assert fixed 2026 values and are
# intentionally not used to gate a recurring live data refresh.
set -euo pipefail
python -m unittest discover -s tests -p 'test_rosteraudit_values.py'
python -m unittest discover -s tests -p 'test_rookie_pick_attribution.py'
python -m unittest discover -s tests -p 'test_all_play_records.py'
python -m unittest discover -s tests -p 'test_record_categories.py'
python -m unittest discover -s tests -p 'test_player_record_refresh.py'
python -m unittest discover -s tests -p 'test_draft_team_history.py'
python -m unittest discover -s tests -p 'test_trade_exclusions.py'
node tests/test_record_break_watch.js
node tests/test_team_record_views.js
node tests/test_single_season_watch.js
node tests/test_trade_ratings.js
node tests/test_waiver_history.js
