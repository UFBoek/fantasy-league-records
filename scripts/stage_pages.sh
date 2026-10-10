#!/usr/bin/env bash
# Stage everything the website requires for GitHub Pages.
# Called by both the normal publisher and the scheduled data updater.
set -euo pipefail

destination="${1:?Usage: bash scripts/stage_pages.sh OUTPUT_DIRECTORY}"
mkdir -p "$destination"

# Ship all site-root stylesheets and scripts. A manual allowlist silently
# excluded newly added CSS (including the mobile trade archive redesign), even
# though index.html correctly referenced the stylesheet.
# Only static root-level CSS/JS is present; backend code stays under scripts/.
cp index.html ./*.css ./*.js manifest.webmanifest sw.js "$destination/"

# Fail publishing if the HTML references a root-level versioned asset that did
# not make it into the artifact. This prevents future "deployed but unchanged" UI.
while IFS= read -r asset; do
  [[ -z "$asset" ]] && continue
  if [[ ! -f "$destination/$asset" ]]; then
    printf 'Missing published asset: %s\n' "$asset" >&2
    exit 1
  fi
done < <(grep -oE '(href|src)="[^"]+\.(css|js)\?v=[0-9]+"' index.html | cut -d '"' -f 2 | cut -d '?' -f 1)
cp -R data assets resources "$destination/"
# The abandoned injury-history research is retained in GitHub but is not part
# of the public site. Remove all related data and styles from Pages artifacts.
rm -f "$destination/data"/injury_*.json
rm -f "$destination/injury-pilot-v104.css" "$destination/injury-history-v105.css" "$destination/injury-teams-v108.css"
# Catch accidental regressions before pushing an inaccurate injury archive.
if grep -Eq '(#/injuries|injury-(pilot|history|teams))' "$destination/index.html" "$destination/app.js" "$destination/sw.js"; then
  echo 'Injury history was accidentally included in public website assets.' >&2
  exit 1
fi
touch "$destination/.nojekyll"
printf 'Staged FIG website in %s\n' "$destination"
