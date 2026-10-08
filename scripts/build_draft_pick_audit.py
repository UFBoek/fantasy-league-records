#!/usr/bin/env python3
"""Update the website's draft-outcome evidence from Sleeper.

GitHub Actions runs this after build_site_data.py. It deliberately writes only
stable, source-derived JSON under data/, never a timestamped Colab ZIP.

For reproducible local testing, --source-zip accepts the one-time v2 export.
A unique owner+round match is evidence-based, NOT explicit proof of original
pick identity. All ambiguous/conflicting picks remain unresolved.
"""

import argparse
import json
import os
import tempfile
import zipfile
from pathlib import Path

import requests

import draft_pick_audit_engine as engine
from rookie_pick_attribution import attribute_linear_rookie_picks

SITE_ROOT = Path(__file__).resolve().parent.parent


def from_archive(path):
    with zipfile.ZipFile(path) as zf:
        def read(name):
            matches = [x for x in zf.namelist() if len(Path(x).parts) == 2 and x.endswith('/' + name)]
            if len(matches) != 1:
                raise ValueError(f'Expected one {name} in {path}, got {len(matches)}')
            return json.loads(zf.read(matches[0]))
        return (
            read('league_chain.json'),
            read('drafts.json'),
            read('draft_selections.json'),
            read('completed_trade_transactions.json'),
            read('draft_traded_pick_snapshots.json'),
            read('league_traded_pick_snapshots.json'),
        )


def write_json(path, records):
    path.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(records, ensure_ascii=False, indent=2, sort_keys=True) + '\n'
    path.write_text(text, encoding='utf-8')


def main():
    cli = argparse.ArgumentParser()
    cli.add_argument('--source-zip', help='Use saved raw v2 audit data instead of live Sleeper')
    args = cli.parse_args()
    engine.DA_LEAGUE_ID = os.getenv('SLEEPER_LEAGUE_ID', engine.DA_LEAGUE_ID)

    if args.source_zip:
        collected = from_archive(Path(args.source_zip))
    else:
        # Avoid committing 100+ raw response files or the timestamped audit ZIP.
        with tempfile.TemporaryDirectory(prefix='sleeper-draft-audit-') as td:
            collected = engine.da_collect(requests.Session(), Path(td))

    reports = engine.da_build_reports(*collected)
    picks, direct_matches = attribute_linear_rookie_picks(reports['pick_resolution_audit'], collected[1], collected[2])
    rounds = reports['draft_round_reconciliation']
    targeted = reports['james_hayden_picks']

    if not picks or not rounds:
        raise RuntimeError('Draft audit returned no completed-draft evidence')
    if any(r.get('selection_verified_by_unique_match') and r.get('resolution_status') != 'UNIQUE_OWNER_ROUND_MATCH' for r in picks):
        raise RuntimeError('Inconsistent draft attribution status')
    for r in picks:
        if r.get('resolution_status') not in ('UNIQUE_OWNER_ROUND_MATCH', 'DIRECT_DRAFT_SLOT_MATCH') and (r.get('player_name') or r.get('pick_no')):
            raise RuntimeError('Ambiguous pick was assigned a player: ' + str(r))

    write_json(SITE_ROOT / 'data/draft_pick_outcomes_audit.json', picks)
    write_json(SITE_ROOT / 'data/draft_pick_round_reconciliation.json', rounds)

    from collections import Counter
    print('Draft audit:', len(picks), 'completed pick identities,', len(targeted), 'James–Hayden trade picks')
    print('Direct original-slot matches:', direct_matches)
    print('James–Hayden statuses:', dict(Counter(r['resolution_status'] for r in picks if r.get('in_james_hayden_trade'))))
    print('Unreconciled rounds:', sum(not r['all_owner_counts_match'] for r in rounds))


if __name__ == '__main__':
    main()
