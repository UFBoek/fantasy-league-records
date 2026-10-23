---
version: 1
slug: "index-html"
primary_target: "index.html"
related_targets: ["app.js","ui-platform.css","ui-platform.js"]
---

# FIG application overhaul

Mode: Operate. Scope: every existing route and shared component. The detailed user brief supplies product constraints and explicitly delegates design choices and implementation without further confirmation. This session uses code-led implementation as requested; no standing workflow preference is inferred.

Grounded candidates: 1. sports broadcast control room; 2. club matchday program; 3. professional broadcast scorebook; 4. scouting database; 5. stadium wayfinding; 6. championship almanac; 7. fantasy draft room. Seed adaaf054 assigned candidate 3. External catalog unavailable; no challenger boards were used. The user's commercial sports app references constrain the direction.

## Direction contract

THESIS: The league's living scorebook, where every result opens a deeper story. Prioritize working scores and standings over a marketing hero.

OWN-WORLD: White and cool silver content, navy navigation, one royal-blue interaction accent, subtle gold for earned championships. Barlow UI typography, Barlow Condensed for major score numerals and titles. Precise rules, 12–16px cards, compact 8px controls, consistent Tabler icons.

STORY: Open current matchups, compare the standings, follow any franchise, player, or historical result, then return to the exact exploration context.

FIRST VIEWPORT: Desktop has a 224px navy rail and a compact top bar; a short league title leads into a scoreboard and standings composition. Mobile has a safe-area-aware masthead, current matchups, compact standings controls, and persistent six-destination navigation.

FORM: Professional broadcast scorebook, grounded candidate 3, seed adaaf054. Signature interaction: contextual back navigation with restored position, fast route settling, and visible feedback only on genuinely changed live scores. Historical statistics remain stable.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

Validation: baseline route/link/control inventory, render every route family on desktop and phone, exercise filters/sorts/drilldowns, check data and calculation source diffs, reduced motion, PWA assets, keyboard navigation and browser history. No merge or production deployment.
