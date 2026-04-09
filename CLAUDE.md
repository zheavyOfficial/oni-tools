# CLAUDE.md

## Dev

```bash
npm run dev   # localhost:3000
```

Static site — HTML + CSS + JS, no build step. Only dep: `http-server`.

## Git

- `git commit -m "type: desc"` — prefixes: `feat:` `fix:` `chore:` `refactor:` `style:`
- Only push when explicitly asked

## Stack

- `index.html` — markup, DOM IDs, volcano buttons, tab bar
- `styles.css` — shadcn oklch dark theme (`b3lCH1qQS`), Geist font via CDN
- `main.js` — single IIFE, all logic + events

## Key logic

**Timer** (`calcTimer`): `off = round((pkg_g / rate) - on_time)` — `PKG_PER_ON = 20` kg/s  
**Steam** (`calcSteam`): ice tempshift plates at `PLATE_KG = 800` kg each, nudgeable via `_plateOffset`

**Volcano buttons** — label-only selector. Clicking updates `updateVolDisplay(name)` (vol-card icon + name). Does NOT touch rate input.  
`VOLCANOES` array: `{ name, color }` — no rate stored.

## Conventions

- DOM: `el(id)` = `getElementById`
- Steppers: `data-target` + `data-delta` on `.step-btn`, wired generically
- Dim↔tiles: `onDimChange` / `onTilesChange` with `_lockDim` guard
- Assets: `assets/images/` — vol PNGs + SVG fallbacks per button
