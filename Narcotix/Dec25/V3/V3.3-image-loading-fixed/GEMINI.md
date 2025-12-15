# NarcotiX Systems - Game Project

## Project Overview

**NarcotiX Systems** is a cyberpunk-themed, HTML5/Canvas-based RPG/Adventure game. The game is set in a dystopian 2088 metaverse where users (Xperients) collect and use "NarcotiX" pills to subvert the system. It is integrated with a Stacks NFT collection, loading metadata for in-game items and displaying their corresponding images.

The project uses Vanilla JavaScript (ES6 Modules) without external frameworks, rendering directly to a 2D HTML5 Canvas.

## Directory Structure

The project is contained within the `New-Game-Folder-Dec25-v2.0` directory.

- **`game/`**: The core game directory.
    - **`index.html`**: The main entry point. Open this file in a browser to play the game.
    - **`pill_effects_taxonomy.csv`**: Defines game mechanics, visual effects, and side effects mapped to keywords found in NFT metadata.
    - **`css/style.css`**: Game styling and UI layout.
    - **`js/`**: Contains all game logic source code.
        - **`game.js`**: The central game engine, handling the loop, state management, and coordinating other managers.
        - **`main.js`**: Bootstraps the game, handling DOM events and initialization.
        - **`config.js`**: Global configuration constants (tile size, viewport dimensions, etc.).
        - **`utils.js`**: Utility functions for RNG, distance calculations, tutorials, etc.
        - **`mapManager.js`**: Manages map generation, tile interactions, and rendering.
        - **`itemManager.js`**: Handles item spawning, management, and processing of NFT metadata.
        - **`enemyManager.js`**: Manages enemy AI, spawning, and rendering.
        - **`eventManager.js`**: Handles random events (weather, system glitches, etc.).
        - **`floatingTextManager.js`**: Manages floating damage numbers and status text.
        - **`hud.js`**: Manages the Heads-Up Display (health, stats, inventory, popups).
        - **`minimap.js`**: Handles the minimap rendering logic.
        - **`particleManager.js`**: Manages visual particle effects (blood, sparks, smoke).
        - **`questManager.js`**: Manages quest states, objectives, and NPC interactions.
        - **`shopManager.js`**: Handles shop UI and trading logic.
        - **`soundManager.js`**: Manages background music and sound effects.
        - **`stashManager.js`**: Manages persistent storage (stash) interactions.
        - **`touchControls.js`**: Handles on-screen touch controls for mobile/tablet support.
        - **`zoneManager.js`**: Manages distinct game zones and day/night cycles.
        - **`player/`**: Directory containing modularized player logic.
            - **`player.js`**: Aggregates all player sub-modules into a single `player` object.
            - **`playerAbilities.js`**: Manages player special abilities and cooldowns.
            - **`playerCharacterDesign.js`**: Handles visual customization and animations (limbs, weapons).
            - **`playerCombat.js`**: Manages attack logic, damage calculation, reloading, and health.
            - **`playerCore.js`**: Core player properties (position, movement, collision).
            - **`playerInventory.js`**: Manages inventory storage, equipment, and item usage.
            - **`playerStatusEffects.js`**: Handles buffs, debuffs, and taxonomy-based side effects.
            - **`playerWeapons.js`**: Defines weapon stats and configurations.
    - **`about.md`**: Lore and background information about the NarcotiX world.

- **Root Files**:
    - **`narcotix-collection-metadata.csv`**: Data file containing attributes for the NFT collection, loaded by the game to generate in-game items.
    - **`Narcotix-Collection-Metadata.html`**: Utility or viewer for the metadata.
    - **`NX-Explorer-game.html`**: A standalone explorer tool used to test and verify NFT metadata and image rendering.
    - **`TODO.md`**: Project task list.

## Building and Running

Since this is a client-side web project, there is no build step required for development.

1.  **Run**: Open `game/index.html` in a modern web browser.
    *   *Note:* Due to ES6 module usage (`<script type="module">`), you may need to serve the directory via a local web server (e.g., `python3 -m http.server`, `npx serve`, or VS Code's "Live Server" extension) rather than opening the file directly via `file://` protocol, to avoid CORS errors when loading modules or the CSV file.

## Key Game Concepts

*   **Game Loop**: Managed in `main.js` and `game.js` using `requestAnimationFrame`.
*   **State Management**: `game` object in `game/js/game.js` acts as the central store, initializing and updating all managers.
*   **Modular Player System**: The player logic is split into multiple modules (`core`, `combat`, `inventory`, etc.) and aggregated in `player.js`.
*   **Rendering**: Custom 2D rendering using the Canvas API. Includes layers for map, zones, items, projectiles, particles, enemies, player, and UI.
*   **Input**: Handles Keyboard (WASD/Arrows), Mouse (Interaction), and Touch inputs.
*   **NFT Integration**: The game loads `narcotix-collection-metadata.csv` to generate items.
    *   **Pill Taxonomy**: `pill_effects_taxonomy.csv` maps keywords from NFT metadata to specific **Game Mechanics** (buffs/stats), **Visual Effects** (particles/shaders), and **Side Effects** (debuffs/quirks).
    *   **Image Gathering**: NFT images are dynamically fetched using the Hiro Token Metadata API.
*   **New Systems**:
    *   **Quests**: `questManager` handles missions and NPC dialogue.
    *   **Economy**: `shopManager` allows buying/selling items at "Exchange Nodes".
    *   **Events**: `eventManager` triggers random occurrences based on time/location.
    *   **Particles & Audio**: Dedicated managers for visual polish and immersive sound.

## Development Conventions

*   **Modules**: The project uses native ES6 modules (`import`/`export`).
*   **Managers**: Logic is divided into specialized "Manager" objects (e.g., `mapManager`, `soundManager`) attached to the main `game` object.
*   **No Build Tools**: Currently, no bundlers (Webpack, Vite, etc.) are in use.
*   **Style**: Standard JavaScript coding style. Semicolons are used.

## Lore Context

*   **Setting**: 2088 Metaverse, ruled by a sterile global government.
*   **Factions**: Xemists (creators of pills), Xperience junkies (players), Kingpins of Kaos.
*   **Mechanics**: Collecting pills, managing "Vitality" and "Creds", avoiding "System Enforcers", engaging in "Exchange" at nodes.
