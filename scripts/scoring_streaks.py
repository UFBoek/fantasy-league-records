"""Consecutive completed regular-season weekly scoring achievements for FIG.

The public weekly_scoring_ranks dataset is authoritative, and has exactly one
row per franchise per completed regular-season week. No live matchup scores are
used. Career Games joins the last regular-season week of one season to Week 1
of the following season, as existing FIG career streaks do.
"""
from collections import defaultdict

SCORING_STREAK_FIELDS = {
    "Weekly High Score": "weekly_high_score",
    "Top-3 Scoring Weeks": "weekly_top_3",
}
FRANCHISE_IDS = frozenset(range(1, 11))


def _true(value):
    return value is True or str(value).lower() == "true"


def _next_week(previous, current):
    if previous is None:
        return True
    prev_year, prev_week = previous
    year, week = current
    return ((year == prev_year and week == prev_week + 1)
            or (year == prev_year + 1 and week == 1))


def build_scoring_streaks(weekly_ranks, owner_names=None):
    """Generate length >= 2 runs of #1 and top-three league-wide weekly finishes."""
    owner_names = owner_names or {}
    weeks = defaultdict(dict)
    for item in weekly_ranks:
        year = int(item["season"])
        week = int(item["week"])
        franchise = int(item["franchise_id"])
        key = (year, week)
        if franchise not in FRANCHISE_IDS or franchise in weeks[key]:
            raise ValueError(f"Invalid or duplicate scoring rank for {key}, team {franchise}")
        weeks[key][franchise] = item

    if not weeks:
        return []
    for key, franchises in weeks.items():
        if set(franchises) != FRANCHISE_IDS:
            raise ValueError(f"Incomplete weekly scoring leaderboard for {key}")

    ordered_weeks = sorted(weeks)
    latest = ordered_weeks[-1]
    results = []

    for streak_type, field in SCORING_STREAK_FIELDS.items():
        for franchise in sorted(FRANCHISE_IDS):
            run = []
            previous = None

            def flush():
                if len(run) < 2:
                    return
                first, last = run[0], run[-1]
                total = round(sum(float(x["points_for"]) for x in run), 2)
                name = (owner_names.get(franchise)
                        or owner_names.get(str(franchise))
                        or last["owner_name"])
                results.append({
                    "franchise_id": franchise,
                    "owner": str(name),
                    "streak_type": streak_type,
                    "streak_mode": "Career Games",
                    "length": len(run),
                    "start_season": str(first["season"]),
                    "start_week": int(first["week"]),
                    "end_season": str(last["season"]),
                    "end_week": int(last["week"]),
                    "total_points": total,
                    "average_points": round(total / len(run), 2),
                    "active": (int(last["season"]), int(last["week"])) == latest,
                })

            for week_key in ordered_weeks:
                if not _next_week(previous, week_key):
                    flush()
                    run = []
                row = weeks[week_key][franchise]
                if _true(row.get(field)):
                    run.append(row)
                else:
                    flush()
                    run = []
                previous = week_key
            flush()

    return sorted(results, key=lambda x: (
        x["streak_type"], -x["length"], -x["total_points"],
        x["franchise_id"], int(x["start_season"]), x["start_week"],
    ))
