#!/usr/bin/env python3
"""Compile ordered CSS into one cache-fingerprinted asset in the staged site.

Keep the original HTML and CSS unchanged in Git for local development.
Only the deployed GitHub Pages copy is rewritten.
"""
from __future__ import annotations

import hashlib
import re
import sys
from pathlib import Path

STYLE_TAG = re.compile(
    r'(?m)^[ \t]*<link rel="stylesheet" href="([^"/?]+\.css)(?:\?[^"]*)?"'
    r'(?: media="([^"]+)")?\s*/>[^\S\n]*(?:\n|$)'
)
SW_STYLE = re.compile(r"(?m)^[ \t]*'\./[^'\n]+\.css\?[^'\n]+',\s*\n")
CACHE_NAME = re.compile(r"const CACHE_NAME = 'fig-league-shell-[^']+';")


def bundle(stage: Path) -> dict[str, object]:
    """Bundle CSS and rewrite only staged index.html/sw.js after validation."""
    html_path = stage / 'index.html'
    worker_path = stage / 'sw.js'
    html = html_path.read_text(encoding='utf-8')
    worker = worker_path.read_text(encoding='utf-8')
    tags = list(STYLE_TAG.finditer(html))
    if len(tags) < 10:
        raise ValueError(f'Expected site stylesheet list, found {len(tags)}')

    parts = ['/* Generated site CSS. Edit the original .css files instead. */\n']
    for match in tags:
        filename, media = match.group(1), match.group(2)
        source = stage / filename
        if not source.is_file():
            raise FileNotFoundError(f'Missing CSS source: {source}')
        css = source.read_text(encoding='utf-8')
        if re.search(r'(?m)^\s*@(import|charset|namespace)\b', css, re.I):
            raise ValueError(f'{filename} contains a non-bundleable at-rule')
        # Preserve the cascade, media constraints, and the CSS URL base path.
        parts.append(f'\n/* CSS source: {filename} */\n')
        parts.append(f'@media {media} {{\n{css}\n}}\n' if media else css + '\n')

    compiled = ''.join(parts)
    fingerprint = hashlib.sha256(compiled.encode('utf-8')).hexdigest()[:12]
    ref = f'fig-site.css?v={fingerprint}'
    first = True

    def replace_tag(match: re.Match) -> str:
        nonlocal first
        if first:
            first = False
            return f'  <link rel="stylesheet" href="{ref}" />\n'
        return ''

    next_html = STYLE_TAG.sub(replace_tag, html)
    next_worker, replaced = SW_STYLE.subn('', worker)
    if replaced != len(tags):
        raise ValueError(f'CSS sources differ in HTML and SW: {len(tags)} vs {replaced}')
    shell_header = 'const APP_SHELL = [\n'
    if next_worker.count(shell_header) != 1:
        raise ValueError('Cannot identify service worker APP_SHELL')
    next_worker = next_worker.replace(shell_header, shell_header + f"  './{ref}',\n", 1)
    next_worker, renamed = CACHE_NAME.subn(
        f"const CACHE_NAME = 'fig-league-shell-css-{fingerprint}';", next_worker
    )
    if renamed != 1:
        raise ValueError('Cannot identify service worker cache name')

    (stage / 'fig-site.css').write_text(compiled, encoding='utf-8')
    html_path.write_text(next_html, encoding='utf-8')
    worker_path.write_text(next_worker, encoding='utf-8')
    return {'stylesheets': len(tags), 'bytes': len(compiled.encode('utf-8')), 'hash': fingerprint}


if __name__ == '__main__':
    if len(sys.argv) != 2 or not Path(sys.argv[1]).is_dir():
        raise SystemExit('Usage: python scripts/build_css_bundle.py STAGED_SITE_DIR')
    print('Compiled site CSS:', bundle(Path(sys.argv[1])))
