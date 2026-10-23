---
name: FIG League
description: A professional broadcast scorebook for an interconnected fantasy league archive.
colors:
  royal-blue: '#2459cc'
  blue-wash: '#eaf0ff'
  navy-navigation: '#101d35'
  silver-ground: '#f2f5f9'
  white-surface: '#ffffff'
  soft-surface: '#f7f9fc'
  scoreboard-ink: '#16243b'
  slate-muted: '#596a80'
  cool-rule: '#dce3ec'
  win-green: '#17704c'
  loss-red: '#b53c43'
  championship-gold: '#94671b'
typography:
  display:
    fontFamily: '''Barlow Condensed'', Barlow, sans-serif'
    fontSize: 42px
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: -0.02em
  display-phone:
    fontFamily: '''Barlow Condensed'', Barlow, sans-serif'
    fontSize: 34px
    fontWeight: 700
    lineHeight: 1.08
    letterSpacing: -0.015em
  title:
    fontFamily: Barlow, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif
    fontSize: 21px
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: -0.015em
  body:
    fontFamily: Barlow, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1.5
  table-body:
    fontFamily: Barlow, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.4
  control:
    fontFamily: Barlow, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif
    fontSize: 12px
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: '0'
  label:
    fontFamily: Barlow, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif
    fontSize: 11px
    fontWeight: 600
    letterSpacing: 0.04em
  record-value:
    fontFamily: '''Barlow Condensed'', Barlow, sans-serif'
    fontSize: 34px
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: -0.015em
rounded:
  control: 8px
  compact-surface: 10px
  table: 12px
  surface: 14px
  profile: 16px
spacing:
  '8': 8px
  '12': 12px
  '16': 16px
  '20': 20px
  '24': 24px
  '28': 28px
  '32': 32px
  '48': 48px
components:
  button-primary:
    backgroundColor: '{colors.royal-blue}'
    textColor: '{colors.white-surface}'
    rounded: '{rounded.control}'
    padding: 10px 18px
  button-secondary:
    backgroundColor: '{colors.white-surface}'
    textColor: '{colors.slate-muted}'
    rounded: '{rounded.control}'
    typography: '{typography.control}'
    padding: 9px 14px
  filter-selected:
    backgroundColor: '{colors.royal-blue}'
    textColor: '{colors.white-surface}'
    rounded: '{rounded.control}'
    typography: '{typography.control}'
    padding: 9px 14px
  input-search:
    backgroundColor: '{colors.white-surface}'
    textColor: '{colors.scoreboard-ink}'
    rounded: '{rounded.control}'
    padding: 9px 12px
    width: 240px
  desktop-navigation:
    backgroundColor: '{colors.navy-navigation}'
    textColor: '#c4d1e7'
    padding: 26px 16px 16px
    width: 224px
  mobile-navigation:
    backgroundColor: '{colors.white-surface}'
    textColor: '{colors.slate-muted}'
  record-card:
    backgroundColor: '{colors.white-surface}'
    textColor: '{colors.scoreboard-ink}'
    rounded: '{rounded.surface}'
  franchise-tabs:
    textColor: '{colors.slate-muted}'
    padding: 12px 0
  record-table:
    backgroundColor: '{colors.white-surface}'
    textColor: '{colors.scoreboard-ink}'
    rounded: '{rounded.table}'
    typography: '{typography.table-body}'
---

# Design System: FIG League

## Overview

**Creative North Star: "The Professional Broadcast Scorebook"**

The Professional Broadcast Scorebook makes a dense league archive feel composed and immediate. Cool silver grounds and white surfaces organize the statistics; navy navigation anchors the application, while royal blue identifies actions and selected views. Barlow gives names, controls and notes a clear sporting voice. Barlow Condensed gives major titles and numerical records a stronger vertical presence.

The interface keeps original franchise portraits and the approved app icon as its identity. Historical records remain stable and connected to their details. Mobile layouts preserve those connections through a persistent dock, early franchise tabs and locally scrolling tables. Motion acknowledges an action or a genuinely changed live score; it does not turn archived results into a performance.

**Key Characteristics:**

- Dense, readable statistics with tabular numerals.
- One consistent interaction accent across every section.
- Flat data surfaces, precise dividers and restrained hover depth.
- Franchise identity, player imagery and earned championship accents.
- Context-preserving navigation with reduced-motion support.

This document extracts the implemented system from `ui-platform.css`, `ui-platform.js` and `index.html`. The frontmatter is normative for the captured primitives. The sidecar contains motion, responsive details and isolated component specimens. Its synthesized tonal ramps are documentation previews, not additional deployed palette tokens.

## Colors

A cool neutral field supports one clear blue interaction accent, with semantic colors reserved for results and achievements.

### Primary

- **Royal Blue** (`royal-blue`): active filters, links, selected navigation and primary actions.
- **Blue Wash** (`blue-wash`): selected icon backplates and quiet hover states.

### Neutral

- **Navigation Navy** (`navy-navigation`): the desktop rail and selected sports feature surfaces.
- **Silver Ground** (`silver-ground`): the application canvas.
- **White Surface** (`white-surface`): cards, tables, fields and the mobile dock.
- **Soft Surface** (`soft-surface`): table headers, controls groups and secondary statistics.
- **Scoreboard Ink** (`scoreboard-ink`): primary text and numerical values.
- **Slate Muted** (`slate-muted`): secondary labels and provenance on pale surfaces.
- **Cool Rule** (`cool-rule`): one-pixel borders and separators.

### Semantic accents

**Win Green** and **Loss Red** identify positive and negative outcomes. **Championship Gold** identifies earned achievement. These colors supplement words and values rather than replacing them.

**The Action Color Rule.** Use royal blue for navigation, selection and exploration. Keep win, loss and championship colors tied to their stated meaning.

## Typography

**Display Font:** Barlow Condensed, falling back to Barlow and sans-serif.

**Body Font:** Barlow, falling back to the platform UI stack. Regular, medium, semibold and bold files are self-hosted; condensed semibold and bold files are also self-hosted.

### Hierarchy

The frontmatter captures the desktop display, phone display, section title, body, table, control, label and record-value roles. Major page titles use the condensed display face. Section titles use Barlow semibold. Table figures use tabular numerals; compact labels use restrained tracking.

The body becomes 14px on phones. Section titles become 18px, while general page titles use the phone display token. The home title is a specific 32px phone variant. Phone inputs use 16px text to remain comfortable to edit. Descriptive section notes use short measures, commonly no more than 55ch.

**The Readable Metadata Rule.** Keep functional labels at least 11px. Use condensed type for major titles and values, and Barlow for compact names and explanatory text.

## Layout

The desktop application has a fixed navigation rail (224px), a sticky header (76px minimum), and a centered content region (1440px maximum). Page padding is 28px vertically at the top and 32px at the sides, with 48px below. The rail narrows to 200px between 1024px and 1240px.

At 1023px and below, the rail gives way to a full-width six-destination bottom dock. The shell reserves 90px plus the bottom safe-area inset. The dock has a 76px minimum height and 56px minimum link targets. Safe-area padding protects its bottom and sides; the masthead also respects the top inset. Standalone mode adds its own top and bottom padding adjustments.

At 699px and below, content uses 16px side gutters and 20px top padding; side gutters become 12px below 360px. Statistics collapse into fewer columns without dropping their data. Franchise tabs follow the team identity, before the active tab content. Career and valuation summaries remain below that content.

Dense tables keep an identity pane and scroll their numerical columns locally. The identity width is 188px on desktop, 142px on phones and 130px below 360px. Matched row heights are 54px on desktop and 56px on phones; headers are 44px. Preserve this alignment when changing typography or cell padding.

Use the observed spacing steps in the frontmatter. Repeated items favor 8–16px gaps; section separation generally uses 24–28px. Avoid arbitrary oversized empty card bodies.

## Elevation & Depth

Depth comes primarily from white and soft surfaces against the silver ground, with thin cool borders. Cards are flat at rest. Hover-capable devices add a faint shadow and border emphasis to interactive record and franchise surfaces. The dock has a separate upward ambient shadow to distinguish it from scrolling content.

### Shadow Vocabulary

- **Interactive surface hover:** `0 6px 20px rgb(22 36 59 / .06)`.
- **Persistent dock:** `0 -4px 20px rgb(22 36 59 / .04)`.

**The Flat List Rule.** Use one boundary around repeated records and separators between internal rows. Do not give every row its own rounded card.

## Shapes

Controls use gently curved corners; data containers use the larger surface radii captured in the frontmatter. Tables and compact modules have their own intermediate radius. Internal rows are square within a shared outer boundary. Franchise portraits remain circular, with matching width, height and flex basis (76px on phones, 104px on larger profiles).

Tab selection uses a square underline rather than a rounded stripe. Tabler outline icons use a consistent thin stroke (1.75px), usually 21px, increasing to 22px in the dock. Preserve the original portrait artwork and PWA icon geometry.

## Components

### Buttons and filter chips

Compact and direct. Primary actions use royal blue with white text, 44px minimum height and the primary padding token. Secondary controls use a white surface, cool border and muted text, usually 40px minimum height. Selection fills the entire control blue. Hover on secondary controls uses blue wash and blue text. A press scales eligible controls to 0.97 when motion is allowed.

### Inputs / Fields

White, outlined and readable. Fields use the control radius, a subdued blue-gray stroke, and 42px minimum height on desktop or 44px on phones. Search expands to available phone width. The caret follows the action color. All keyboard-operable controls retain a clear three-pixel blue focus outline with a three-pixel offset.

### Cards / Containers

Record and franchise cards use white surfaces, cool borders and the shared surface radius. Values receive the condensed numerical treatment; descriptions and provenance use muted Barlow. Repeated snapshot entries share one outer boundary with separators. Trade KPI values and labels are themed together on pale child surfaces.

### Navigation

The desktop rail uses muted light text, a blue-navy active backplate and a slightly lighter navy hover state. The mobile dock exposes Home, Teams, Records, Players, Streaks and More, each with an icon and label. Its active label and icon become royal blue, and the icon gains a blue-wash backplate. The contextual back control preserves browser history and exploration context.

Franchise tabs are horizontally scrollable, with 48px minimum height, blue text and a three-pixel underline for the active tab. Keep all seven destinations. Tab controls must remain accessible near the identity, rather than after the long statistical summary.

### Tables and lineups

Use tabular numerals, aligned row geometry, readable sort controls and local horizontal scrolling. Keep identities visible while comparisons move. Lineup status stays compact (12–13px), with large type reserved for scores. The visible labels POS and BN retain their accessible meanings; metadata uses the established label floor.

### Motion and loading

Control color changes last 180ms and press transitions last 150ms. New route content enters over 180ms with a small four-pixel vertical movement; opened detail content uses 180ms. Sorting can animate visible row movement for 200ms. A genuinely changed live score receives 260ms of feedback. Static historical values do not count up.

Skeleton surfaces use a quiet opacity pulse while waiting for data. They must not replace an already mounted asynchronous calculator shell. Reduced-motion mode disables decorative animations and transitions, including smooth programmatic scrolling. Exact motion curves and responsive thresholds are recorded in the sidecar.

## Do's and Don'ts

### Do:

- **Do** preserve the supplied franchise portraits and app icon.
- **Do** keep every statistical value connected to its existing detail route.
- **Do** keep frozen identity rows and scrolling statistical rows the same height.
- **Do** use equal width, height and flex basis for circular profile portraits.
- **Do** give phone inputs 16px text and retain visible keyboard focus.
- **Do** respect safe areas, browser history, restored filters and scroll position.
- **Do** animate changed live values and user-driven transitions only when reduced motion is not requested.

### Don't:

- **Don't** introduce decorative gradients, glass panels or rainbow category borders.
- **Don't** use white or pale text on the pale data surfaces.
- **Don't** shrink metadata below the established 11px floor to force it into a column.
- **Don't** animate static historical numbers or replace authentic unavailable states with invented data.
- **Don't** hide columns, links or filters to make a phone layout fit.
- **Don't** stretch franchise portraits or crop the existing app icon into a new identity.
