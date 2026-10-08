"""Attribute completed linear-rookie draft picks to original franchises.

For 2024–2026, league commissioner/user supplied original pick order;
all 30 positions were independently confirmed against Sleeper's draft
`slot_to_roster_id`. The original draft slot, not the manager selecting,
is what identifies the traded asset.

Important: a correct draft-slot -> selection link is independent of the
transaction chain, which can remain incomplete or incorrect; chain warnings
are preserved, never silently converted into a claim about transfers.
"""
from collections import Counter, defaultdict

# Ordered franchise IDs for overall draft slots 1..10, for *every* round
# of each linear rookie draft. Source: commissioner-confirmed original orders.
CONFIRMED_ORIGINAL_DRAFT_ORDERS = {
    '2024': (2, 8, 1, 5, 7, 3, 9, 10, 6, 4),
    '2025': (4, 2, 10, 8, 3, 7, 9, 5, 1, 6),
    '2026': (10, 4, 8, 5, 7, 9, 3, 2, 1, 6),
}


def attribute_linear_rookie_picks(audit_rows, drafts, selections):
    """Return new rows and summary, after strict, all-round slot audits.

    Future drafts may be attributed using draft metadata if complete and
    internally consistent; confirmed seasons are additionally cross-checked
    against manually established original franchise identities. Never infer
    the original owner from the selecting roster or trade ledger alone.
    """
    drafts_by_id = {str(d['draft_id']): d for d in drafts if d['draft_kind'] == 'rookie'}
    pick_groups = defaultdict(list)
    for selection in selections:
        if selection['draft_kind'] == 'rookie':
            pick_groups[(str(selection['draft_id']), int(selection['round']))].append(selection)

    result = [dict(row) for row in audit_rows]
    lookup = {(str(row['draft_id']), int(row['round']), int(row['original_franchise'])): row
              for row in result}
    verified_counts = Counter()

    for draft_id, draft in drafts_by_id.items():
        if draft.get('status') != 'complete':
            continue
        if draft['draft_type'] != 'linear':
            continue  # Never generalize to snake/auction draft formats.
        year = str(draft['draft_season'])
        size = int(draft['teams'])
        slot_map = draft.get('slot_to_roster_id') or {}
        observed_order = tuple(int(slot_map.get(str(i)) or 0) for i in range(1, size + 1))
        expected_order = CONFIRMED_ORIGINAL_DRAFT_ORDERS.get(year)
        if expected_order is not None and observed_order != expected_order:
            raise ValueError(f'{year}: Sleeper original draft order no longer matches user-confirmed order: '
                             f'{observed_order!r} vs {expected_order!r}')
        if 0 in observed_order or len(set(observed_order)) != size:
            # No complete one-franchise-per-slot map, so do not overwrite the original audit.
            continue
        if expected_order is not None and len(expected_order) != size:
            raise ValueError(f'{year}: wrong number of user-confirmed draft slots')

        complete_rounds = 0
        for rnd in range(1, int(draft['rounds']) + 1):
            picks = pick_groups.get((draft_id, rnd), [])
            if len(picks) != size:
                continue
            by_slot = {}
            for pick in picks:
                slot = int(pick['draft_slot']) if pick.get('draft_slot') is not None else 0
                overall = int(pick['pick_no']) if pick.get('pick_no') is not None else 0
                if not 1 <= slot <= size or overall != (rnd - 1) * size + slot:
                    raise ValueError(f'{year} round {rnd}: inconsistent slot/pick numbers')
                if slot in by_slot:
                    raise ValueError(f'{year} round {rnd}: duplicate original slot {slot}')
                if not pick.get('player_name') or not pick.get('player_id'):
                    raise ValueError(f'{year} round {rnd} slot {slot}: selection missing player')
                by_slot[slot] = pick
            if len(by_slot) != size:
                continue
            for slot, original in enumerate(observed_order, 1):
                row = lookup.get((draft_id, rnd, original))
                if row is None:
                    raise ValueError(f'{year} round {rnd}: missing audited original franchise {original}')
                selection = by_slot[slot]
                selecting = selection.get('selecting_roster_id')
                row.update({
                    'resolution_status': 'DIRECT_DRAFT_SLOT_MATCH',
                    'selection_verified_by_draft_slot': True,
                    'selection_verified_by_unique_match': False,
                    'draft_slot': slot,
                    'pick_no': int(selection['pick_no']),
                    'player_id': str(selection['player_id']),
                    'player_name': selection['player_name'],
                    'selecting_franchise': int(selecting) if selecting is not None else None,
                    'original_order_source': ('USER_CONFIRMED_AND_SLEEPER_DRAFT_SLOTS'
                                              if expected_order is not None else 'SLEEPER_DRAFT_SLOTS'),
                    'possible_pick_numbers': [int(selection['pick_no'])],
                    'possible_players': [selection['player_name']],
                    'chain_final_owner_matches_selector': (int(selecting) == int(row['expected_draft_owner'])
                                                           if selecting is not None and row.get('expected_draft_owner') is not None
                                                           else None),
                })
                verified_counts[year] += 1
            complete_rounds += 1
        if expected_order is not None and complete_rounds != int(draft['rounds']):
            raise ValueError(f'{year}: Expected all {draft["rounds"]} rounds; only matched {complete_rounds}')

    for year in CONFIRMED_ORIGINAL_DRAFT_ORDERS:
        if year not in {str(d['draft_season']) for d in drafts_by_id.values()}:
            # Can use a reduced fixture without all seasons; not an error.
            continue
        d = next(d for d in drafts_by_id.values() if str(d['draft_season']) == year)
        if d['status'] == 'complete' and d['draft_type'] == 'linear' and verified_counts[year] != int(d['rounds']) * len(CONFIRMED_ORIGINAL_DRAFT_ORDERS[year]):
            raise ValueError(f'{year}: Not all confirmed completed-draft picks received a direct match')
    return result, dict(verified_counts)
