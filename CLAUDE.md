# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development

```bash
npm run dev   # serves on http://localhost:3000 with auto-open
```

No build step — static site (HTML + CSS + JS). Only dev dependency is `http-server`.

## Git Workflow

- Commit after each logical change: `git commit -m "type: short description"`
- Prefixes: `feat:`, `fix:`, `chore:`, `refactor:`, `style:`
- Only push when the user explicitly asks (e.g. "push", "push to GitHub")

## Architecture

**ONI Tools** — fan calculator site for Oxygen Not Included. Tab-based shell with one active tool: Volcano Timer.

### Files

| File | Role |
|------|------|
| `index.html` | Full markup, DOM IDs, volcano buttons with inline SVG fallbacks, tab bar |
| `styles.css` | shadcn oklch dark theme via CSS custom properties, component styles |
| `main.js` | Single IIFE, no dependencies; all logic + event wiring |

### Color palette

shadcn preset `b3lCH1qQS` — oklch neutral dark + warm amber chart palette:
- Background/card: `--background`, `--card`, `--secondary`, `--muted`
- Chart/accent: `--chart-1` through `--chart-5` (warm amber scale)
- Functional: `--orange`, `--teal`, `--green`, `--red` (mapped from chart + semantic tokens)
- Font: Geist Variable via fontsource CDN

### Two calculators

**Timer** (`calcTimer`): OFF/ON durations so a conveyor loader fills exactly one package.
- Key constant: `PKG_PER_ON = 20` kg per second of on-time
- Formula: `off = round((pkg_g / rate) - on_time)`

**Steam Room** (`calcSteam` / `renderSteam`): ice tempshift plates needed to absorb steam.
- Key constant: `PLATE_KG = 800` kg per plate
- Plate count nudgeable via `_plateOffset`

### Volcano selector

Volcano buttons are label-only — clicking one updates the badge display but does NOT change the rate input or trigger recalculation. Rate is always set manually by the user via the stepper input.

`VOLCANOES` array has `name`, `rate`, and `color` fields. Used for badge display and button rendering.

### DOM / event conventions

- All lookups via `el(id)` = `document.getElementById`
- Stepper buttons: `data-target` (input ID) + `data-delta`, wired generically in `wireEvents`
- Volcano buttons: `data-vol` (volcano name) + `--mat-clr` CSS variable
- Dim W×H ↔ tiles synced via `onDimChange` / `onTilesChange` with `_lockDim` recursion guard
- Volcano badge: `updateVolBadge(name)` updates `#vol-badge-name`, `#vol-badge-img`, and `#bar-vol-tag`

### Assets

- `assets/images/volcano.png` — header icon + favicon
- Volcano PNG icons in `assets/images/`; each `.vol-btn` has an inline SVG fallback on image load error
