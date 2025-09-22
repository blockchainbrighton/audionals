# Spawn Zone Painter

The painter is a debug overlay that lets designers sketch pedestrian, vehicle, and mission trigger zones directly inside the running build.

## Quick Start
1. Run `npm run dev` and open the game in the browser.
2. Press `ALT + Z` to toggle the painter overlay.
3. Use the mouse wheel to cycle zone types (`ped`, `vehicle`, `mission`, `shop`, `safehouse`, `respray`).
4. Hold the left mouse button and drag to paint a rectangle. Release to commit it to the in-memory list.
5. Hit `ENTER` to export the current zones – a JSON blob prints in the browser console.
6. Copy the blob into `src/data/spawn_zones.json` under the appropriate array.

## Controls
- `ALT + Z`: Toggle overlay.
- Scroll: Change active zone type.
- `SHIFT` while dragging: Forces a square zone.
- `BACKSPACE`: Undo last zone.
- `CTRL + BACKSPACE`: Clear all in-memory zones.

## Data Contract
Each painted zone serialises to:
```json
{
  "id": "ped_spawn_downtown_01",
  "district": "downtown",
  "type": "ped",
  "x": 520,
  "y": 520,
  "width": 300,
  "height": 220
}
```
- Coordinates are world-space pixels.
- The `id` is auto-generated but should be renamed to something mnemonic before committing.

## Integration Notes
- Ped and vehicle zones are consumed by `TrafficSystem` for LOD-aware spawning.
- `mission`, `shop`, `safehouse`, and `respray` zones are interactive and created in `CityScene.createZones()`.
- Painter output is deterministic; repeated exports replace previous rectangles instead of appending duplicates.

## Safety
- The overlay never mutates source files; it only prints JSON to the console.
- The helper stores the last export in `localStorage.spawnZoneDraft` so you can recover from accidental refreshes.
