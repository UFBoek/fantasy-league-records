#!/usr/bin/env python3
"""Refresh public RosterAudit dynasty values for the Fromm is Garbage league.

Fetch once per daily GitHub Actions run, never from visitor browsers.
Store public market values only; no private data, no manufactured historic values.
No data file is overwritten if RosterAudit is unavailable or returns invalid data.
"""
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data'
BASE = 'https://rosteraudit.com/wp-json/ra/v1'
ATTRIBUTION = {'text': 'Values by RosterAudit.com', 'url': 'https://rosteraudit.com'}
USER_AGENT = 'FrommIsGarbage-LeagueArchive/1.0 (personal non-commercial fantasy league website)'


def get_json(path, params=None, session=None):
    caller = session or requests
    url = f'{BASE}/{path}'
    resp = caller.get(url, params=params, timeout=35,
                      headers={'User-Agent': USER_AGENT, 'Accept': 'application/json'})
    resp.raise_for_status()
    obj = resp.json()
    if not isinstance(obj, (dict, list)):
        raise ValueError(f'{path}: unexpected JSON root')
    return obj


def number(value):
    if isinstance(value, bool) or value is None:
        return None
    try:
        val = float(str(value).replace(',', ''))
        return round(val) if 0 <= val < 100000 else None
    except (TypeError, ValueError):
        return None


def league_format(settings):
    scoring = json.loads(settings['scoring_settings_json'])
    slots = json.loads(settings['roster_positions_json'])
    sf = 'SUPER_FLEX' in slots or 'SUPERFLEX' in slots or slots.count('QB') >= 2
    rec = float(scoring.get('rec', 0))
    te_bonus = float(scoring.get('bonus_rec_te', 0))
    # RosterAudit public presets support full/half and one Superflex TEP variant.
    family = 'sf' if sf else '1qb'
    if te_bonus > 0 and sf and rec >= .95:
        key = 'sf_ppr_tep'
    elif rec >= .95:
        key = f'{family}_ppr'
    elif rec >= .4:
        key = f'{family}_half'
    else:
        raise ValueError('League scoring is not closely represented by a documented RosterAudit preset')
    return {'key': key, 'format': family, 'teams': int(settings['total_rosters']),
            'receptions': rec, 'te_reception_bonus': te_bonus,
            'approximation': True,
            'explanation': 'RosterAudit market-value preset, not an exact reproduction of all Sleeper scoring bonuses.'}


def _iter_lightweight(raw, fmt):
    if isinstance(raw, dict) and isinstance(raw.get('values'), dict):
        raw = raw['values']
    if isinstance(raw, dict) and isinstance(raw.get('players'), dict):
        raw = raw['players']
    if not isinstance(raw, dict):
        raise ValueError('Expected Sleeper-ID-keyed RosterAudit values object')
    out = {}
    for pid, v in raw.items():
        if not str(pid).isdigit():
            continue
        if isinstance(v, dict):
            value = number(v.get(fmt, v.get('value', v.get('val_sf' if fmt=='sf' else 'val_1qb'))))
        else:
            value = number(v)
        if value is not None:
            out[str(pid)] = {'value': value}
    if len(out) < 50:
        raise ValueError(f'RosterAudit values only contained {len(out)} recognized players; refusing partial snapshot')
    return out


def _rows(raw):
    if isinstance(raw, list):
        return raw
    if isinstance(raw, dict):
        for key in ('players', 'rankings', 'results', 'data', 'items'):
            child = raw.get(key)
            if isinstance(child, list):
                return child
            if isinstance(child, dict):
                for k in ('players', 'rankings', 'items', 'data'):
                    if isinstance(child.get(k), list):
                        return child[k]
    return []


def _parse_rankings(rows, fmt):
    out = {}
    for x in rows:
        if not isinstance(x, dict):
            continue
        pid = x.get('sleeper_id', x.get('player_id'))
        if pid is None or not str(pid).isdigit():
            continue
        vals = x.get('values', {}) if isinstance(x.get('values'), dict) else {}
        raw = x.get('value', x.get('dynasty_value', x.get('val_sf' if fmt=='sf' else 'val_1qb')))
        if raw is None:
            raw = vals.get(fmt, vals.get('value'))
        val = number(raw)
        if val is None:
            continue
        entry = {'value': val}
        name = x.get('name', x.get('full_name'))
        if isinstance(name, str) and name.strip():
            entry['name'] = name
        pos = x.get('position')
        if isinstance(pos, str):
            entry['position'] = pos
        for field in ('trend_7d', 'trend_30d'):
            t = x.get(field)
            if t is not None:
                try: entry[field] = int(t)
                except (ValueError, TypeError): pass
        out[str(pid)] = entry
    return out


def _pick_entry(year, rnd, slot, raw, fmt):
    try:
        year, rnd = int(year), int(rnd)
    except (ValueError, TypeError):
        return None
    if year < 2026 or year > 2040 or rnd < 1 or rnd > 5:
        return None
    slot = str(slot).lower().strip()
    if slot not in ('early','mid','late'):
        return None
    if isinstance(raw, dict):
        n = number(raw.get('val_sf' if fmt=='sf' else 'val_1qb', raw.get(fmt, raw.get('value'))))
    else:
        n = number(raw)
    if n is None:
        return None
    return f'{year}:{rnd}:{slot}', n


def parse_picks(raw, fmt):
    """Conservatively parse only explicitly labeled early/mid/late picks.

    RosterAudit's public API can evolve; unknown structures yield no pick values
    rather than guessing against a displayed player valuation.
    """
    result = {}
    entries = _rows(raw)
    if not entries and isinstance(raw, dict):
        for key in ('picks', 'pick_values', 'draft_picks'):
            obj = raw.get(key)
            if isinstance(obj, list): entries = obj; break
            if isinstance(obj, dict):
                for year, rounds in obj.items():
                    if not str(year).isdigit() or not isinstance(rounds, dict): continue
                    for rnd, slots in rounds.items():
                        if not isinstance(slots, dict): continue
                        for slot, value in slots.items():
                            p = _pick_entry(year, rnd, slot, value, fmt)
                            if p: result[p[0]] = p[1]
                if result: return result
    for item in entries:
        if not isinstance(item, dict): continue
        # Public /picks rows use pick_season, pick_round and pick_slot.
        # Keep the older aliases for other documented response variations.
        year = item.get('pick_season', item.get('season', item.get('year', item.get('draft_year'))))
        rnd = item.get('pick_round', item.get('round', item.get('round_number')))
        slot = item.get('pick_slot', item.get('slot', item.get('tier', item.get('range'))))
        if slot is None and any(k in item for k in ('early','mid','late')):
            for label in ('early','mid','late'):
                if label in item:
                    p = _pick_entry(year, rnd, label, item[label], fmt)
                    if p: result[p[0]] = p[1]
            continue
        if slot is None and isinstance(item.get('values'), dict):
            for label, value in item['values'].items():
                p = _pick_entry(year, rnd, label, value, fmt)
                if p: result[p[0]] = p[1]
            continue
        p = _pick_entry(year, rnd, slot, item, fmt)
        if p: result[p[0]] = p[1]
    return result


def refresh(session=None, fixture_values=None, fixture_picks=None, fixture_rankings=None):
    seasons = json.loads((DATA/'league_settings.json').read_text())
    cfg = league_format(max(seasons, key=lambda r: int(r['season'])))
    fmt = cfg['format']
    if fixture_values is None:
        lightweight = get_json('rankings/values', {'format_key': cfg['key']}, session=session)
    else:
        lightweight = fixture_values
    players = _iter_lightweight(lightweight, fmt)
    value_source = 'rankings/values'
    size_adjusted = False
    # Prefer position/scarcity-adjusted 10-team rankings when available and parseable.
    # Fail back to documented full Sleeper-ID mapping rather than losing coverage.
    try:
        combined = {}
        for page in range(1, 16):
            raw = fixture_rankings if fixture_rankings is not None else get_json(
                'rankings', {'format': fmt, 'format_key': cfg['key'], 'league_size': cfg['teams'],
                             'per_page': 100, 'page': page}, session=session)
            rows = _rows(raw)
            if not rows: break
            combined.update(_parse_rankings(rows, fmt))
            if fixture_rankings is not None or len(rows) < 100: break
        if len(combined) >= 50:
            # only overwrite values that are actually present in the size-adjusted response
            players.update(combined)
            size_adjusted = True
            value_source = 'rankings (league_size adjusted) + rankings/values fallback'
    except (requests.RequestException, ValueError, KeyError) as exc:
        print('Size-adjusted rankings unavailable; using documented values endpoint:', exc)

    try:
        raw_picks = fixture_picks if fixture_picks is not None else get_json('picks', session=session)
        picks = parse_picks(raw_picks, fmt)
    except (requests.RequestException, ValueError, KeyError) as exc:
        print('Pick values unavailable; no unverified pick prices will be shown:', exc)
        picks = {}
    # The league's James-original-pick house rule is deliberately anchored to the
    # early 2027 reference tiers. Preserve a previously *sourced* tier if the
    # public API omits that slot today (never extrapolate from a mid/late price).
    # Track which prices are older so the site does not imply they just refreshed.
    carried_early_2027 = []
    carried_late_tiers = []
    previous_file = DATA / 'rosteraudit_values.json'
    if previous_file.exists():
        try:
            previous = json.loads(previous_file.read_text())
            if previous.get('status') == 'ready' and previous.get('format', {}).get('key') == cfg['key']:
                previous_picks = previous.get('future_picks', {})
                for rnd in range(1, 5):
                    key = f'2027:{rnd}:early'
                    if key not in picks and number(previous_picks.get(key)) is not None:
                        picks[key] = number(previous_picks[key])
                        carried_early_2027.append(key)
                # Hayden- and Boek-origin picks use the LATE tier in their
                # actual draft year. Keep already sourced late prices if the
                # next API response omits them, without manufacturing tiers.
                for key, prior in previous_picks.items():
                    parts = key.split(':')
                    if (len(parts) == 3 and parts[0].isdigit() and
                        parts[1] in ('1', '2', '3', '4') and parts[2] == 'late' and
                        int(parts[0]) >= 2027 and key not in picks and
                        number(prior) is not None):
                        picks[key] = number(prior)
                        carried_late_tiers.append(key)
        except (OSError, ValueError, TypeError, AttributeError):
            pass
    payload = {
        'status': 'ready', 'updated_at': datetime.now(timezone.utc).isoformat(timespec='seconds'),
        'provider': 'RosterAudit', 'attribution': ATTRIBUTION,
        'format': cfg, 'size_adjusted': size_adjusted,
        'value_source': value_source,
        'players': players, 'future_picks': picks,
        'carried_early_2027_tiers': carried_early_2027,
        'carried_late_pick_tiers': sorted(carried_late_tiers),
        'notes': [
            'Current market dynasty estimates. Never trade-date valuations.',
            'Player values use Sleeper IDs; missing IDs are not assigned guessed values.',
            'Non-special future picks use generic mid-round estimates; Hayden/Boek-origin picks use their draft year’s late tiers.',
            'James-origin picks use an early 2027 proxy. If a reference tier disappears from the API, its last sourced value is carried forward and flagged.',
        ]
    }
    if not players:
        raise ValueError('Empty player values; no files overwritten')
    dest = DATA / 'rosteraudit_values.json'
    temp = dest.with_suffix('.json.tmp')
    temp.write_text(json.dumps(payload, separators=(',', ':'), ensure_ascii=False)+'\n')
    temp.replace(dest)
    print(f'Wrote {len(players)} player values and {len(picks)} pick tiers for {cfg["key"]}; 10-team adjustment={size_adjusted}')
    return payload


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.parse_args()
    refresh()
