# Audio & Building Themes

This game ships a lightweight, generative synth engine. It handles ambient music, spatial fades for buildings, and the Walkman override. Use this guide to understand and extend the building sound design.

## Signal Flow (init)
- Music bus → low-pass filter → stereo panner → reverb send → master gain → compressor → destination.
- Walkman bus runs in parallel with chorus + stereo delay, feeding the master.
- Reverb send is blended via a dedicated wet gain; both music and reverb end at the master.
- Initialization lives in `soundManager.init` (`game/js/soundManager.js:520+`).

## Context Detection (updateMusicState)
- Runs every frame (`updateMusicState`, `soundManager.js:568+`), reading:
  - `mapManager.currentMapId` (interior vs. overworld).
  - `game.gameState` (shop/casino modal, stash, etc.).
  - Combat state (`enemyManager` chase/attack check).
  - Walkman toggle and pause state.
- Profiles: `SAFEHOUSE`, `EXPLORATION` (default overworld), `SHOP`, `BAR`, `CASINO`, `ARMOURY`, `COMBAT`, `WALKMAN`. Each defines tempo/scale/pattern.
- Spatial sources (`soundManager.sources`) mark overworld building anchors (x/y/radius/profile). Nearest source within radius sets:
  - `targetEnvVol`: Scales down with distance (creates volume fade when walking away).
  - `targetFilter`: Drops to ~300 Hz near a building (muffled indoor feel), lerps back toward 20 kHz as you leave.
  - `targetPan`: Stereo pan based on left/right offset to the source.

## Entering/Exiting Buildings
- `game.enterLocation` calls `soundManager.playTheme(type)` (`type` maps to profile keys like `SHOP`, `BAR`, `ARMOURY`, `CASINO`). This switches the active profile immediately for the modal/room.
- Door transitions change `mapManager.currentMapId` (e.g., `bar_interior`), so the next `updateMusicState` tick selects the matching profile and keeps volume high and filter open inside.
- Exiting uses `game.exitLocation` followed by `updateMusicState`: context reverts to overworld logic. As you walk away from the building marker, the nearest-source math lowers volume, reopens the low-pass filter, and recenters pan—producing the audible fade and un-muffle.

## Scheduling & Intensity
- A simple 16th-note scheduler (`scheduler`/`playTick`, `soundManager.js:672+`) plays drums/bass/pads on the current profile’s pattern.
- Intensity is lerped based on movement/combat and Walkman state; it influences tempo (for Walkman), drum density, and mix gain.

## Extending Building Audio
1. Add/adjust spatial sources: edit `soundManager.sources` (position in pixels, radius, and profile key).
2. Add a new profile (optional): extend `soundManager.profiles` with tempo/scale/pattern; ensure `updateMusicState` can select it (via game state, map ID, or a new interaction type).
3. Hook interactions: call `soundManager.playTheme('<PROFILE>')` from the relevant UI/door code if you need an immediate profile change.
4. Tune fades: adjust `targetEnvVol` scaling, `targetFilter` values, or the lerp factors in `updateMusicState` for sharper/softer transitions.

## Debug Tips
- Watch `console.log` entries from `switchProfile` to verify profile swaps.
- If a building feels silent, confirm its source radius covers the doorway and that `currentMapId` or `gameState` matches a profile selection path.
- To tighten exit behavior, you can add a short envelope (e.g., drop filter then open) when `exitLocation` fires, but current behavior relies on the continuous spatial fade.***
