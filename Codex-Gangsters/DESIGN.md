# Design Overview

## High-Level Goals
- Maintain a single streaming city scene that supports at least four themed districts without full-map loads.
- Keep all state data-driven through JSON (vehicles, weapons, peds, missions, spawn rules) for rapid iteration.
- Support 60 FPS with ≤150 active agents by using pooling, spatialised spawning, and LOD heuristics.
- Provide clear UX for heat, cash, health, missions, and save/resume flows.

## Systems Summary
### Streaming City
- Fixed grid of 1024×1024px chunks; active radius of 1 chunk around the player.
- `BootScene` preloads all chunk tilemaps; `CityScene` lazy-instantiates layers when needed.
- Day/night: 24 in-game hours == 24 minutes real time; ambient overlay darkens night; weather randomised with rain/fog overlays.

### Player & Weapons
- On-foot motion uses acceleration with drag to keep movement punchy.
- Inventory implemented via `Player` class with per-weapon state (clip/reserve/reload timers).
- Weapons defined in `src/data/weapons.json`; hitscan for firearms, projectile arc for grenades, melee AoE.

### Vehicles
- Vehicle stats from `src/data/vehicles.json` feed a pure physics step (`stepVehiclePhysics`) used by both player and AI control.
- AI vehicles follow patrol waypoints (placeholder loops) and respect density targets per district.
- Collisions trigger camera shake, heat raises, and health damage on foot.

### AI Population
- `TrafficSystem` pools `Vehicle` and `Ped` instances, instantiates them using ped/vehicle spawn zones filtered by district, weather, and time-of-day rules (`spawn_zones.json`).
- Peds run a simple state machine and flee when alerted by disturbances.
- Police reinforcement spawns scale with wanted heat and reuse the same pooling infrastructure.

### Wanted System
- Levels 0–5 configured in code with escalation tables.
- Heat rises on hostile actions (`GameEvents.PlayerFired`, collisions, explosions) and decays once line-of-sight timer expires.
- On escalation, police vehicles/peds spawn near the player according to level-specific tactics.

### Missions & Economy
- Mission definitions (`missions.json`) supply objective types (reach, pickup, drop-off, chase, escape, timed).
- `MissionSystem` orchestrates the linear objective progression, timers, and emits UI events.
- Cash rewards credited on success; safehouse/respray interactions reduce penalties.
- Saves use localStorage (`SaveSystem`) with slot-based JSON, storing player state, world time/weather, and active mission id.

### UI / HUD
- `UIScene` renders HUD (health, ammo, cash, heat stars) and minimap (scaled to 2048px world).
- Mission modals for board/payphone, shop placeholder, pause menu stub with resume.
- Tutorial hints scheduled for first few minutes of play.

### Debug Tooling
- `WaypointEditor` exposes `window.editor` for authoring lane graphs; `SpawnZonePainter` exposes `window.spawnPainter` for painting rectangles.
- Debug overlays export JSON directly to the clipboard/console for quick iteration of data files.

## Data Schemas
### `vehicles.json`
```
{
  "id": "compact",
  "name": "Whiptail Compact",
  "spriteKey": "vehicle_compact",
  "width": 28,
  "height": 52,
  "maxSpeed": 280,
  "acceleration": 240,
  "braking": 200,
  "turnRate": 2.2,
  "grip": 0.16,
  "drift": 0.32,
  "passengerCapacity": 2,
  "weight": 1100
}
```

### `weapons.json`
```
{
  "id": "pistol",
  "name": "Sidearm",
  "spriteKey": "weapon_pistol",
  "category": "pistol",
  "damage": 22,
  "fireRate": 220,
  "projectileSpeed": 900,
  "projectileLife": 400,
  "spread": 4,
  "clipSize": 12,
  "reloadTime": 1400,
  "recoil": 8,
  "soundKey": "sfx_pistol"
}
```

### `peds.json`
```
{
  "id": "citizen",
  "name": "Citizen",
  "baseSpeed": 120,
  "sightRadius": 220,
  "hearingRadius": 260,
  "courage": 0.2,
  "cashMin": 5,
  "cashMax": 30
}
```

### `missions.json`
```
{
  "id": "mission_race_docks",
  "name": "Dockside Dash",
  "giver": "board",
  "description": "Sprint through the industrial routes.",
  "reward": 450,
  "objectives": [
    { "id": "race_start", "description": "Reach start", "type": "reach", "target": { "x": 1500, "y": 400, "district": "industrial" } },
    { "id": "race_lap", "description": "Hit checkpoints", "type": "timed", "target": { "x": 1800, "y": 420, "district": "industrial" }, "timeLimit": 90000 }
  ]
}
```

### `spawn_zones.json`
- `districtRules`: LOD densities + allowed ped/vehicle IDs per district/time/weather.
- `zones`: interactive (`mission`, `payphone`, `shop`, `safehouse`, `respray`) and spawn regions (`ped`, `vehicle`). Includes world-space x/y and rectangle dimensions.

## Performance Notes
- Pools for peds/vehicles prevent GC spikes. Recycled through `TrafficSystem.recyclePed/Vehicle`.
- Wanted response spawns capped (≤3 vehicles/≤10 officers).
- Minimap updates every 200ms to reduce draw cost.
- Debug overlays are dev-only (`import.meta.env.PROD` guard).

## Save Format
```
{
  "version": 1,
  "createdAt": 1737600000000,
  "updatedAt": 1737600100000,
  "player": {
    "x": 520,
    "y": 520,
    "district": "downtown",
    "cash": 820,
    "health": 90,
    "armor": 20,
    "inventory": ["fists", "pistol", "smg"],
    "activeWeapon": "smg",
    "heat": 2
  },
  "world": {
    "timeOfDayMinutes": 780,
    "weather": "rain",
    "discoveredDistricts": ["downtown", "industrial"],
    "activeMissionId": "mission_caper"
  }
}
```

## Roadmap Thoughts
- Replace placeholder traffic patrols with JSON-authored waypoint graphs generated from the in-game editor.
- Expand mission logic with branching objectives and failure penalties beyond cash loss.
- Add weapon shops and garage interactions tied to economy schema.
- Introduce audio sliders + rebindable controls in pause menu.
