# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Development

```bash
npm run dev   # serves on http://localhost:3000 with auto-open
```

No build step — static site (HTML + CSS + JS). Only dev dependency is `http-server`.

## Git Workflow

- Commit after each logical change: `git commit -m "type: short description"` then `git push`
- Prefixes: `feat:`, `fix:`, `chore:`, `refactor:`, `style:`
- Push after every commit

## Architecture

**ONI Tools** — fan calculator site for Oxygen Not Included. Tab-based shell with one active tool: Volcano Timer.

### Files

| File | Role |
|------|------|
| `index.html` | Full markup, DOM IDs, volcano buttons with inline SVG fallbacks, tab bar |
| `styles.css` | Dark blue-grey ONI palette via CSS custom properties, spacing scale (`--sp-*`), component styles |
| `main.js` | Single IIFE, no dependencies; all logic + event wiring |

### Color palette

Dark mode inspired by the ONI game UI:
- Background: `--bg` (#0d1117), panels: `--panel` / `--panel-lt`
- Heat/volcano accent: `--orange` / `--orange-lt`
- Steam/cool accent: `--teal` / `--teal-lt`
- Text: `--text` (primary), `--text-muted` (secondary)

### Two calculators

**Timer** (`calcTimer`): OFF/ON durations so a conveyor loader fills exactly one package.
- Key constant: `PKG_PER_ON = 20` kg per second of on-time
- Formula: `off = round((pkg_g / rate) - on_time)`

**Steam Room** (`calcSteam` / `renderSteam`): ice tempshift plates needed to absorb steam.
- Key constant: `PLATE_KG = 800` kg per plate
- Plate count nudgeable via `_plateOffset`

### Volcano data

`VOLCANOES` array has both `rate` (community/datamined) and `wikiRate` (wiki-verified: 300 g/s for all non-Niobium, 1200 g/s for Niobium). Dynamic preset row shows both when they differ.

### DOM / event conventions

- All lookups via `el(id)` = `document.getElementById`
- Stepper buttons: `data-target` (input ID) + `data-delta`, wired generically in `wireEvents`
- Volcano buttons: `data-rate` + `--mat-clr` CSS variable
- Dim W×H ↔ tiles synced via `onDimChange` / `onTilesChange` with `_lockDim` recursion guard
- Rate matching: `< 0.15` tolerance to snap to known volcano rates
- Dynamic presets built by `renderPresets(volcano)` on volcano select

### Assets

Volcano PNG icons in `assets/images/`; each `.vol-btn` has an inline SVG fallback on image load error.
