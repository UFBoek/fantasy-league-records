"""Guard the user-facing trade archive's compact and neutral presentation."""
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]
APP = (ROOT / 'app.js').read_text(encoding='utf8')
CSS = (ROOT / 'styles.css').read_text(encoding='utf8')

class TradeArchivePresentation(unittest.TestCase):
    def test_details_start_collapsed(self):
        self.assertIn('<details class="jh-trade-card"', APP)
        self.assertNotIn('<details open class="jh-trade-card"', APP)
        self.assertIn('<summary class="jh-trade-meta"', APP)

    def test_rule_note_above_trade_12(self):
        self.assertIn('THE JAMES RULE RETURNS · AFTER TRADE 12', APP)
        self.assertRegex(APP, r'\$\{i===0 && tradeRows\.length===12\?ruleNote:\x27\x27\}<details')
        self.assertIn('Future James–Hayden trades require a league vote.', APP)

    def test_neutral_market_gap_narrative(self):
        self.assertIn('Your budget is exactly the current difference between James and Hayden', APP)
        for old in ('This one sparked enough league uproar', 'somebody had to set limits', 'ONE VERY LOUD GAP', 'Hayden took advantage'):
            self.assertNotIn(old, APP)

    def test_summary_controls_and_mobile_styles(self):
        self.assertIn('jhExpandAll', APP)
        self.assertIn("target.open=true", APP)
        self.assertIn('.jh-trade-card[open] .jh-toggle-symbol', CSS)
        self.assertIn('@media(max-width:700px)', CSS)

if __name__=='__main__':
    unittest.main()
