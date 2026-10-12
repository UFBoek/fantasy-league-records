"""Keep reversed/void dynasty trades out of every public trade view and refresh."""
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
OMITTED = {"996717833432182784", "1224205259237232640"}
REDO = "997041669574823936"
OTHER_BOEK_JAMES = "1000716004733722624"


def read(name):
    return json.loads((DATA / (name + ".json")).read_text(encoding="utf-8"))


class TradeExclusionsTests(unittest.TestCase):
    def test_refresh_importer_applies_curated_exclusions(self):
        source = (ROOT / "scripts/build_site_data.py").read_text(encoding="utf-8")
        self.assertIn("EXCLUDED_PUBLIC_TRADE_IDS", source)
        for txid in OMITTED:
            self.assertIn('"' + txid + '"', source)
        self.assertIn('transactions_df["transaction_id"].astype(str).isin(', source)

    def test_void_trades_are_absent_from_public_history(self):
        for name in ("trades", "trade_sides", "trade_assets", "transactions"):
            ids = {str(item["transaction_id"]) for item in read(name)}
            self.assertTrue(OMITTED.isdisjoint(ids), name + " includes a void trade")
            self.assertIn(REDO, ids, name + " is missing the legitimate 3-team redo")
            self.assertIn(OTHER_BOEK_JAMES, ids, name + " omitted an unrelated trade")

    def test_trade_tables_and_manifest_remain_consistent(self):
        trades = read("trades")
        trade_ids = {str(t["transaction_id"]) for t in trades}
        sides = read("trade_sides")
        assets = read("trade_assets")
        for name, rows in (("trade_sides", sides), ("trade_assets", assets)):
            self.assertEqual({str(r["transaction_id"]) for r in rows}, trade_ids, name)
        redo = next(t for t in trades if str(t["transaction_id"]) == REDO)
        self.assertEqual(set(redo["franchise_ids"]), {1, 3, 10})
        self.assertEqual(redo["franchises_involved"], 3)
        manifest = read("manifest")
        for name in ("trades", "trade_sides", "trade_assets", "transactions"):
            self.assertEqual(manifest[name], len(read(name)), name)

    def test_downstream_trade_lineage_has_no_void_references(self):
        lineage = read("trade_lineage")
        serialized = json.dumps(lineage)
        self.assertTrue(all(txid not in serialized for txid in OMITTED))


if __name__ == "__main__":
    unittest.main()
