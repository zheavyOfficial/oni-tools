# ONI Tools — Roadmap

Fan calculator site for Oxygen Not Included. Tabs are added one at a time.

---

## Active: Volcano Timer

Calculates OFF/ON durations for a conveyor loader attached to a metal volcano.

**Status:** Complete (v1)

---

## Planned Tabs (in priority order)

### 1. Geyser / Vent Timer

Same timer concept as Volcano Timer but for water geysers and gas vents.

- Geysers and vents have dormant/active cycles measured in game cycles (600s each)
- User inputs: active duration, dormant duration, output rate
- Outputs: how much resource produced per cycle, average throughput, storage needed

**Key difference from Volcano Timer:** geysers/vents operate on long multi-cycle dormancy, not per-packet timing. Separate calculator logic.

---

### 2. Heat Exchange Calculator

Calculates cooling or heating requirements for a steam room or aquatuner setup.

- Inputs: room size, target temperature, current temperature, material thermal mass
- Aquatuner: cycles needed, coolant flow rate, power usage
- Ice tempshift plates: count needed (this already exists in the Steam Room calculator — can be promoted/expanded here)

---

### 3. Seed Tracker *(most complex)*

Track all geysers, vents, and volcanoes on a single map seed.

**Features:**
- Add entries per geyser/vent/volcano type
- Mark each as tamed / untamed / in progress
- See total resources being produced across all tamed sources
- Persistent per seed (localStorage, keyed by seed name)
- Expandable: add notes, output amounts, location labels

**Architecture notes:**
- Data model: `{ seedName, entries: [{ type, name, tamed, rateGS, notes }] }`
- Storage: `localStorage` under key `oni-seed-{seedName}`
- UI: seed selector dropdown at top, table of entries below, summary row at bottom
- No server needed — fully client-side

---

### 4. Power Grid Calculator *(later)*

Calculate power production vs consumption for a base or isolated grid.

---

### 5. Pipe / Conveyor Throughput *(later)*

Calculate max throughput of liquid/gas pipes and conveyor belts given material and pipe type.

---

## Architecture Notes

- **Tab shell** is already in place — `tab-bar` in `index.html`, `wireTabBar()` in `main.js`
- Each new tool should be its own content section hidden/shown by tab switch
- Consider splitting into separate JS files per tool once there are 3+ tools
- The seed tracker will need a small data layer abstraction (read/write localStorage)
