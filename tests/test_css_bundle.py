"""Regression coverage for the deployed CSS bundle and cache versioning."""
import hashlib
import shutil
import tempfile
import unittest
from pathlib import Path

from scripts.build_css_bundle import bundle

ROOT = Path(__file__).resolve().parents[1]


class CssBundleTests(unittest.TestCase):
    def test_preserves_stylesheet_order_media_and_cache_fingerprint(self):
        with tempfile.TemporaryDirectory() as temp:
            stage = Path(temp)
            for name in ('index.html', 'sw.js'):
                shutil.copyfile(ROOT / name, stage / name)
            for css in ROOT.glob('*.css'):
                shutil.copyfile(css, stage / css.name)
            original_html = (stage / 'index.html').read_bytes()
            original_worker = (stage / 'sw.js').read_bytes()

            result = bundle(stage)
            compiled = (stage / 'fig-site.css').read_text(encoding='utf-8')
            html = (stage / 'index.html').read_text(encoding='utf-8')
            worker = (stage / 'sw.js').read_text(encoding='utf-8')
            self.assertEqual(result['stylesheets'], 43)
            self.assertEqual(html.count('<link rel="stylesheet" href="fig-site.css?v='), 1)
            self.assertIn('@media (max-width:699px) {', compiled)
            first = compiled.index('/* CSS source: styles.css */')
            middle = compiled.index('/* CSS source: layout-v75.css */')
            last = compiled.index('/* CSS source: historical-predictions-v189.css */')
            self.assertLess(first, middle)
            self.assertLess(middle, last)
            self.assertEqual(worker.count("'./fig-site.css?v="), 1)
            self.assertNotIn("'./styles.css?v=", worker)
            self.assertEqual(result['hash'], hashlib.sha256(compiled.encode()).hexdigest()[:12])
            # Bundle compilation never edits the original checkout.
            self.assertNotIn(b'fig-site.css', original_html)
            self.assertIn(b"'./styles.css?v=", original_worker)

    def test_rejects_missing_source_without_rewriting_html(self):
        with tempfile.TemporaryDirectory() as temp:
            stage = Path(temp)
            for name in ('index.html', 'sw.js'):
                shutil.copyfile(ROOT / name, stage / name)
            before = (stage / 'index.html').read_bytes()
            with self.assertRaises(FileNotFoundError):
                bundle(stage)
            self.assertEqual((stage / 'index.html').read_bytes(), before)


if __name__ == '__main__':
    unittest.main()
