# FIG League

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Members of the Fromm Is Garbage fantasy football league exploring their own league's results, franchises, players, transactions, drafts, records, and historical comparisons.

## Product Purpose

An interconnected fantasy league archive and current-season companion. Success means every existing statistic, calculation, filter, sort, detail view, and link remains available through a cohesive, professional interface.

## Operating Context

The user explicitly prioritizes an iPhone home-screen standalone PWA, with equally considered desktop layouts. The existing site is a static vanilla JavaScript hash-router application published on GitHub Pages. Python and GitHub Actions refresh static JSON from Sleeper and RosterAudit. The browser separately refreshes current matchups and checks for new published data.

## Capabilities and Constraints

- Preserve all routes, interactive controls, historical data, statistical methodologies, scripts, and integrations.
- Retain franchise-ID-based identity, manager artwork, player imagery, and historical ownership rules.
- Keep live scores separate from completed historical records and preserve existing polling and data freshness behavior.
- Preserve the app icon, manifest, service-worker behavior, and existing URLs. Extend the shell asset cache only as required by the redesign.
- All implementation occurs on a development branch. Do not merge or deploy without explicit user approval.
- Avoid backend rewrites and new application frameworks or runtime dependencies.

## Brand Commitments

FIG League / Fromm Is Garbage. Preserve approved Puka-inspired app icon and illustrated franchise portraits. The user names ESPN Fantasy, Sleeper, and premium commercial sports applications as the desired level of polish, without requesting their exact branding.

## Evidence on Hand

Existing app.js route/render functions, extension scripts, data/*.json, README.md change history, assets/avatars, assets/icons, and automated tests. Use actual league data, never fabricated performances or results.

## Product Principles

- Exploration is the product: every useful datum remains connected to its detail.
- Keep data dense enough to compare and readable enough for a phone.
- Use fast, purposeful feedback and preserve navigation context.
- Treat mobile standalone use as a primary environment.

## Accessibility & Inclusion

The brief requires reduced-motion accessibility, readable numerical data, comfortable touch targets, responsive layouts, and safe-area support. Preserve keyboard semantics and improve focus visibility, input labels, and route announcements.
