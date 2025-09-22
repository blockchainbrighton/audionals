# Codex Gangsters

Codex Gangsters is a Phaser 3 + TypeScript open-world action sandbox that streams a four-district city, supports free-roaming on-foot and in vehicles, and ships as a static Vite build. The project targets modern desktop browsers (Chrome, Safari) at 60 FPS.

## Features
- **Streaming world** with four themed districts, day/night cycle, and weather (clear, rain, fog).
- **Player systems**: twin-stick style WASD + mouse, five weapon classes, melee, grenade arcs, and smooth vehicle hijacking.
- **Vehicle handling**: drift-aware arcade physics, player and AI traffic, impact camera shake, wanted escalation spawns.
- **AI population**: peds with flee/react loops, traffic pooling driven by JSON spawn tables.
- **Heat / Wanted**: 0–5 escalation with patrols, roadblocks, SWAT pressure, and decay when line-of-sight is broken.
- **Missions**: JSON-authored objectives (reach, pickup/drop-off, chase, escape, timed) plus crown events hooked into UI.
- **Economy & saves**: cash rewards, safe-house autosave, slot saves via TAB, localStorage persistence.
- **HUD & UI**: minimap, objective tracker, heat stars, pause/settings stub, mission board/payphone/shop modals.
- **Debug tooling**: in-game waypoint editor (`ALT+W`) and spawn zone painter (`ALT+Z`) that export JSON for content iteration.

## Getting Started
```bash
npm install
npm run dev
```
Open the displayed localhost URL (default: `http://localhost:5173`).

### Build & Preview
```bash
npm run build
npm run preview
```
The production bundle is emitted to `dist/` and is deployable to static hosts like GitHub Pages or Netlify.

### Type Checking & Tests
```bash
npm run typecheck
npm run test
```
Unit tests cover vehicle physics integration, wanted level decay, and mission FSM progression via Vitest.

### Soak Test
A lightweight data soak test simulates 500 NPCs and prints heap deltas. Run:
```bash
npm run soak
```
It is designed to accompany in-browser profiling (spawn painter has an export for feeding real spawn JSON).

## Controls
- **Movement**: `WASD` or arrow keys
- **Aim**: Mouse cursor
- **Shoot / attack**: Left mouse button
- **Secondary (unequip to fists)**: Right mouse button
- **Reload**: `R`
- **Enter / exit vehicles**: `E`
- **Weapon quick-select**: `1` fists, `2` pistol, `3` SMG, `4` shotgun, `5` grenade
- **Interact (missions, shops, save)**: `F`
- **Quick saves (slots)**: `TAB`
- **Pause menu**: `ESC`
- **Debug waypoint editor**: `ALT+W`
- **Debug spawn painter**: `ALT+Z` (scroll to change type, `ENTER` to export, `BACKSPACE` / `CTRL+BACKSPACE` to undo/clear)

## Project Layout
```
public/              # Static index.html shell
src/
  main.ts           # Phaser bootstrap + config
  game/             # Scenes (Boot, City, UI) and debug tooling
  actors/           # Player & vehicle implementations
  ai/               # Pedestrian logic
  systems/          # Mission, traffic, wanted, save systems
  data/             # JSON definitions (vehicles, weapons, peds, missions, spawn zones)
  utils/            # Shared helpers (event emitter, physics math)
assets/             # Generated sprites, tilesets, audio
tools/              # Level authoring docs + soak-test.cjs
```

## Deployment Notes
- The game builds as a static bundle (`dist/`) with a relative `base: './'` to support GitHub Pages.
- Audio and textures are generated at runtime or via scripts to guarantee IP-safe content.
- LocalStorage key: `codex-gangsters-saves` (three-slot array, versioned).

## Original Assets / Attribution
See [ATTRIBUTION.md](./ATTRIBUTION.md) for a breakdown of runtime-generated visuals and procedurally generated audio.

## Debug Workflows
- **Waypoint Editor**: exposes `window.editor` helpers (`addWaypoint`, `linkWaypoints`, `alignToGrid`, `export`).
- **Spawn Painter**: exposes `window.spawnPainter` helpers (zones persist to `localStorage.spawnZoneDraft`).
- Combine these with `npm run dev` to iterate on live tilemap streaming without rebuilding.

Enjoy exploring Codex City!
