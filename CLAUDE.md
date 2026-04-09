# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development

```bash
npm run dev   # serves on http://localhost:3000 with auto-open
```

No build step — this is a static site (HTML + CSS + JS).

## Git Workflow

After completing any meaningful unit of work, commit and push to GitHub:

```bash
git add <files>
git commit -m "type: short description"
git push
```

- Commit after each logical change (feature, fix, refactor) — don't batch unrelated work
- Use conventional commit prefixes: `feat:`, `fix:`, `chore:`, `refactor:`, `style:`
- Push after every commit so work is never lost locally

## Architecture

Single-page tool with three files:

- **`index.html`** — full markup, all DOM IDs, volcano buttons with inline SVG fallbacks
- **`styles.css`** — warm ONI sepia palette via CSS custom properties (`--bg`, `--orange`, `--ice`, etc.), component styles (.block, .step-wrap, .vol-btn, etc.)
- **`main.js`** — single IIFE, no dependencies; all logic lives here

### Two calculators

**Timer Sensor** (`calcTimer`): computes OFF/ON durations so a conveyor loader fills exactly one package. Key constants: `PKG_PER_ON = 20` kg per second of on-time (fixed game mechanic). Formula: `off = round((pkg_g / rate) - on_time)`.

**Steam Room** (`calcSteam` / `renderSteam`): calculates ice tempshift plates needed to absorb steam. Key constant: `PLATE_KG = 800` kg of cooling per plate. Plate count can be nudged ±1 via `_plateOffset`.

### DOM / event conventions

- All element lookups via `el(id)` = `document.getElementById`
- Stepper buttons use `data-target` (input ID) and `data-delta` attributes — wired generically in `wireEvents`
- Volcano buttons carry `data-rate` and a `--mat-clr` CSS variable for the active accent color
- Dimension W × H ↔ tiles are kept in sync via `onDimChange` / `onTilesChange`; the `_lockDim` flag prevents recursion
- Rate matching uses a `< 0.15` tolerance to snap to known volcano rates

### Assets

Volcano PNG icons in `assets/images/`; each `.vol-btn` has an inline SVG sibling that shows on image load error.
