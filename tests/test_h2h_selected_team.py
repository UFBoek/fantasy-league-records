"""Prevent the H2H page from reverting to canonical smaller-ID perspective."""
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
H2H=json.loads((ROOT/'data/h2h.json').read_text())
APP=(ROOT/'app.js').read_text()


def test_complete_bidirectional_archive():
    ids=sorted({int(x['franchise_id']) for x in H2H})
    assert len(ids)==10
    assert len(H2H)==90
    for selected in ids:
        rows=[x for x in H2H if int(x['franchise_id'])==selected]
        assert len(rows)==9
        assert {int(x['opponent_franchise_id']) for x in rows}==set(ids)-{selected}
        for row in rows:
            reverse=next(r for r in H2H if int(r['franchise_id'])==int(row['opponent_franchise_id']) and int(r['opponent_franchise_id'])==selected)
            assert row['wins']==reverse['losses']
            assert row['losses']==reverse['wins']
            assert abs(row['points_for']-reverse['points_against'])<0.01
            assert abs(row['point_differential']+reverse['point_differential'])<0.01


def test_selected_view_uses_selected_teams_direct_record():
    assert 'matchups.filter(x=>+x.franchise_id===+selected)' in APP
    assert "matchups.filter(x=>+x.franchise_id<+x.opponent_franchise_id)" in APP
    assert 'const aW=num(x.wins),bW=num(x.losses),ties=num(x.ties)' in APP
