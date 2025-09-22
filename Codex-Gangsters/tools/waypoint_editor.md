# Waypoint Editing Workflow

The traffic system consumes a lightweight JSON waypoint graph stored alongside tilemaps. The current demo uses procedural patrol loops, but the editor flow below keeps everything data-driven when authoring bespoke routes.

## Coordinate System
- World units are pixels. One tile is 32×32 px.
- Each district chunk is 1024×1024 px and anchored to `(chunkX * 1024, chunkY * 1024)`.
- Waypoints use absolute world coordinates so they stay valid across chunks.

## Editor Checklist
1. Launch the dev server with `npm run dev` and open the debug console (`~`).
2. Press `ALT + W` in the running game to toggle waypoint visualisation (implemented in `CityScene` debug block).
3. Use the console command `window.editor.addWaypoint(x, y, laneId)` to place a waypoint. The helper snaps to the nearest tile centre.
4. Call `window.editor.linkWaypoints(aId, bId, weight)` to connect nodes.
5. When you are done, run `window.editor.export()` – this prints a JSON payload to the console.
6. Paste the JSON into `assets/data/waypoints.json` and commit.

## Tips
- Keep lane graphs directional. Duplicate links for bidirectional roads.
- For intersections, create a short “buffer” waypoint before the turn to stop AI vehicles from clipping.
- Use `window.editor.alignToGrid(distance)` to nudge the last node to a clean grid position.
- Avoid more than 12 connections per node. The AI only evaluates the closest 8 for performance.
- Store metadata (speed limits, one-way flags) on each link; the helper accepts an optional `meta` object.

## Maintenance
- Update the `TrafficSystem` loader whenever you add a new `laneId`.
- Keep exported files under version control – the helper emits deterministic ordering.
