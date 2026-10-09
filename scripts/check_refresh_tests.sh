#!/usr/bin/env bash
# Offline regression checks that remain valid when new league games/trades arrive.
# Several legacy UI and trade snapshot tests assert fixed 2026 values and are
# intentionally not used to gate a recurring live data refresh.
set -euo pipefail
python -m unittest discover -s tests -p 'test_rosteraudit_values.py'
python -m unittest discover -s tests -p 'test_rookie_pick_attribution.py'
python -m unittest discover -s tests -p 'test_all_play_records.py'
python -m unittest discover -s tests -p 'test_record_categories.py'
python -m unittest discover -s tests -p 'test_player_record_refresh.py'
python -m unittest discover -s tests -p 'test_injury_history.py'
