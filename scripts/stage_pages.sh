#!/usr/bin/env bash
# Stage everything the website requires for GitHub Pages.
# Called by both the normal publisher and the scheduled data updater.
set -euo pipefail

destination="${1:?Usage: bash scripts/stage_pages.sh OUTPUT_DIRECTORY}"
mkdir -p "$destination"

# The mobile filenames change as new site versions ship. Include them automatically.
cp index.html app.js styles.css editorial-v74.css layout-v75.css layout-v76.css layout-v77.css player-headshots-v78.css playoffs-v79.css trade-contrast-v80.css record-fit-v81.css history-paging-v82.css h2h-v88.css mobile-*.css mobile-*.js live-matchups.css live-matchups.js manifest.webmanifest sw.js "$destination/"
cp -R data assets resources "$destination/"
touch "$destination/.nojekyll"
printf 'Staged FIG website in %s\n' "$destination"
