# Asset Attribution

All assets are original to this project and generated within the repository. No third-party audio, textures, fonts, or trademarks are included.

## Visuals
- **Sprites & tiles**: Runtime-generated with Phaser `Graphics` in `BootScene.generate*` helpers.
- **Tilemaps**: Procedurally authored JSON in `assets/tilemaps/`, created by `python3` scripts (`assets/tilesets/city_tiles.png` generated via custom PNG writer in `BootScene`).
- **Debug overlays**: Drawn via code (no external art).

## Audio
- `assets/sfx/*.wav` and `assets/music/ambient.wav` are generated through the Node `wave` script in `BootScene` setup (`python3` sine-wave generator defined in repo). Each file is unique to this project and CC0 by author.

## Fonts
- Default system fonts only (monospace) via CSS/Canvas text rendering.

## Tools & Scripts
- `tools/soak-test.cjs`, `tools/waypoint_editor.md`, and `tools/spawn_zone_painter.md` were authored for this project to support original workflows.

If you extend the project with external assets, document sources and licenses here to maintain IP safety.
