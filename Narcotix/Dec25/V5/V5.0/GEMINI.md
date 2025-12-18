# NarcotiX Systems - Game Project

## Project Overview

**NarcotiX Systems** is a cyberpunk-themed, HTML5/Canvas-based RPG/Adventure game set in a dystopian 2088 metaverse. The game runs on native ES6 modules, uses a top-down perspective with mouse aiming, and integrates a Stacks NFT collection to turn metadata into in-game pills, factions, and cosmetic expression gangs. Generative synth-wave audio, particle effects, and modular managers provide a self-contained browser experience.

## Directory Structure

The project lives in `Dec25/V5/V5.0`.

- **`game/`**: Core game client.
    - **`index.html`**: Canvas layout, HUD/panels, and modal shells for shops/stash/quests/locations.
    - **`about.md`**: Lore and world background.
    - **`css/style.css`**: Styling for HUD, inventory/stash/shop, and modals.
    - **`pill_effects_taxonomy.csv`**: Keyword → effect/side-effect taxonomy for NFT pills.
    - **`extended_expressions.csv`**: Expression gang stats, archetypes, and audio profiles consumed at load.
    - **`expressions/expressions-master.md`**: Master documentation for expression symbols and metadata.
    - **`artwork/`**: SVG assets for pills, weapons, gadgets, and UI icons.
    - **`js/`**: ES module source.
        - **`main.js`**: Bootstraps the client, loads CSV data, and starts the loop.
        - **`game.js`**: Central orchestrator, entity list, state machine, camera/zoom, and location transitions (shops, stash, bar, armoury, casino).
        - **`config.js`**, **`utils.js`**, **`eventBus.js`**: Config constants, shared helpers (pill rendering, tutorials, messages), and lightweight pub/sub.
        - **`Entity.js`**, **`WorldItem.js`**, **`Projectile.js`**, **`Enemy.js`**: Core entity classes for unified update/render.
        - Managers: **`mapManager.js`** (overworld + interior maps with doors), **`itemManager.js`** (taxonomy + NFT integration, spawning, drop logic), **`enemyManager.js`**, **`floatingTextManager.js`**, **`particleManager.js`**, **`soundManager.js`** (location-aware synth engine + Walkman), **`minimap.js`**, **`questManager.js`**, **`shopManager.js`**, **`stashManager.js`**, **`zoneManager.js`**, **`eventManager.js`**, **`touchControls.js`**, **`imageLoader.js`** (Hiro/IPFS image fallback/caching).
        - **`hud.js`**: HUD bindings, item detail panel, gang status, reload bar.
        - **`player/`**: Modular player logic (`player.js`, `playerCore.js`, `playerCombat.js`, `playerInventory.js`, `playerAbilities.js`, `playerStatusEffects.js`, `playerCharacterDesign.js`, `playerWeapons.js`) with mouse aiming, active reload, expression face rendering, and weapon handling.
- **Root files**:
    - **`narcotix-collection-metadata.csv`**: Stacks NFT metadata consumed by the game at runtime.
    - **`NX GAME EXPRESSION KEY.csv`**: Expression rarity/color reference used for gang theming and iconography.
    - **`expression-svgs.html`**: Expression glyph preview/utility page.
    - **`DOCS/TODO.md`**: Project task list (moved into documentation folder).

## Building and Running

Client-side only—no build step.

1.  **Serve**: Run a simple local server (e.g., `python3 -m http.server`) from the project root or `game/` to avoid module/CORS issues when fetching CSV data.
2.  **Play**: Open `game/index.html` in a modern browser.

## Key Game Concepts

*   **Game Loop & Entities**: `main.js` + `game.js` drive the loop, with a unified `entities` array for enemies, projectiles, and world items.
*   **World & Locations**: `mapManager` builds the overworld and interior rooms (safehouse, exchange nodes, Xemist contacts, bar, armoury, casino) with door transitions and a location modal for stash/shop/quest/casino interactions.
*   **Player & Combat**: Top-down avatar with mouse aim + click-to-fire, WASD movement, active reload, abilities, gang-driven stat mods, and melee/ranged weapons.
*   **Items & NFT Integration**: NFT metadata + taxonomy CSV generate consumable pills with effects/side effects, expression gangs, and color-accurate visuals; `imageLoader` resolves Hiro/IPFS art for HUD and inventory.
*   **UI/UX**: HUD with reload and quest status, inventory/shop/stash UIs with imagery, minimap overlay, tutorials, and floating combat text.
*   **Audio & FX**: Generative synth-wave soundtrack with location-aware themes and Walkman override, plus particle and screen messaging systems.

## Development Conventions

*   Native ES6 modules; no bundler.
*   Semicolons and straightforward vanilla JS styling.
*   Managers encapsulate systems (map, items, enemies, quests, audio, etc.) and are attached to the central `game` object.

## Lore Context

*   **Setting**: 2088 Metaverse, ruled by a sterile global government enforcing a "beigetopian" digital reality.
*   **Factions**:
    *   **Xemists**: The secretive creators of NarcotiX pills, coding them to restore authentic human feelings and grant superhuman feats.
    *   **Xperients (Players)**: "Junkies" and "Kingpins of Kaos" who collect, stash, and use pills to subvert the system and experience the "bettaverse".
    *   **System Enforcers**: Agents of the sterile global government, patrolling the metaverse to eliminate anomalies.
*   **Key Elements**:
    *   **NarcotiX Pills**: Digital compounds (NFTs) that act as "passports" to new experiences. They contain "Base" and "Special" compounds.
    *   **XLounge**: A gated virtual club for verified holders to access exclusive pills and stash items.
    *   **XLab & XData**: Research and data tracking facilities for compounds and yields.
*   **Themes**: Subversion, disruption, chaos vs. order, "injecting human warmth" into a cold digital world.
*   **Mechanics**: Collecting pills, managing "Vitality" and "Creds", avoiding "System Enforcers", engaging in "Exchange" at nodes.
