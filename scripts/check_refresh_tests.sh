#!/usr/bin/env bash
# Data-integrity regression tests that gate Sleeper updates, including trade exclusions.
# Frontend/UI tests run independently via verify-website.yml so an interface
# change cannot freeze the official weekly results and historical records.
# Several legacy UI and trade snapshot tests assert fixed 2026 values and are
# intentionally not used to gate a recurring live data refresh.
set -euo pipefail
python -m unittest discover -s tests -p 'test_rosteraudit_values.py'
python -m unittest discover -s tests -p 'test_dynasty_market_history.py'
python -m unittest discover -s tests -p 'test_validate_refresh.py'
python -m unittest discover -s tests -p 'test_rookie_pick_attribution.py'
python -m unittest discover -s tests -p 'test_all_play_records.py'
python -m unittest discover -s tests -p 'test_record_categories.py'
python -m unittest discover -s tests -p 'test_player_record_refresh.py'
python -m unittest discover -s tests -p 'test_draft_team_history.py'
python -m unittest discover -s tests -p 'test_trade_exclusions.py'
python -m unittest discover -s tests -p 'test_week_finalization.py'
python -m unittest discover -s tests -p 'test_playoff_player_scores.py'
python -m unittest discover -s tests -p 'test_playoff_nfl_wide.py'
