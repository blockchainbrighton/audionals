# NarcotiX Systems - Game Project

## Project Overview

**NarcotiX Systems** is a cyberpunk-themed, HTML5/Canvas-based RPG/Adventure game. The game is set in a dystopian 2088 metaverse where users (Xperients) collect and use "NarcotiX" pills to subvert the system. It is integrated with a Stacks NFT collection, loading metadata for in-game items and displaying their corresponding images.

The project uses Vanilla JavaScript (ES6 Modules) without external frameworks, rendering directly to a 2D HTML5 Canvas.

## Directory Structure

The project is contained within the `New-Game-Folder-Dec25-v2.0` directory.

- **`game/`**: The core game directory.
    - **`index.html`**: The main entry point. Open this file in a browser to play the game.
    - **`css/style.css`**: Game styling and UI layout.
    - **`js/`**: Contains all game logic source code.
        - **`game.js`**: The central game engine, handling the loop, state management, and coordinating other managers.
        - **`main.js`**: Bootstraps the game, handling DOM events and initialization.
        - **`config.js`**: Global configuration constants (tile size, viewport dimensions, etc.).
        - **`mapManager.js`, `itemManager.js`, `enemyManager.js`**: Systems for managing respective game entities.
        - **`touchControls.js`**: Handles on-screen touch controls for mobile/tablet support.
        - **`player/`**: Directory containing player-specific logic (movement, combat, inventory, etc.).
    - **`about.md`**: Lore and background information about the NarcotiX world.

- **Root Files**:
    - **`narcotix-collection-metadata.csv`**: Data file containing attributes for the NFT collection, loaded by the game to generate in-game items.
    - **`Narcotix-Collection-Metadata.html`**: Utility or viewer for the metadata.
    - **`NX-Explorer-game.html`**: A standalone explorer tool used to test and verify NFT metadata and image rendering.

## Building and Running

Since this is a client-side web project, there is no build step required for development.

1.  **Run**: Open `game/index.html` in a modern web browser.
    *   *Note:* Due to ES6 module usage (`<script type="module">`), you may need to serve the directory via a local web server (e.g., `python3 -m http.server`, `npx serve`, or VS Code's "Live Server" extension) rather than opening the file directly via `file://` protocol, to avoid CORS errors when loading modules or the CSV file.

## Key Game Concepts

*   **Game Loop**: Managed in `main.js` and `game.js` using `requestAnimationFrame`.
*   **State Management**: `game` object in `game/js/game.js` acts as the central store for state (player, map, enemies, etc.).
*   **Rendering**: Custom 2D rendering using the Canvas API in `game.js` (and `render` methods in sub-managers).
*   **Input**: Handles Keyboard (WASD/Arrows) and Touch inputs.
*   **NFT Integration**: The game loads `narcotix-collection-metadata.csv` on startup.
    *   **Image Gathering**: NFT images are dynamically fetched using the Hiro Token Metadata API. The URL format is `https://assets.hiro.so/api/mainnet/token-metadata-api/{CONTRACT}/{ID}.png`, where `CONTRACT` is `SP8HMQP4Q63V3E6SXXPXZ4WJXA263HBD95QY2AM3.narcotix`.
    *   **Item Generation**: `itemManager.js` processes the CSV data to create in-game consumable items corresponding to each NFT. It assigns the calculated `imageUrl` to the item definition.
    *   **Display**:
        *   **Inventory**: `playerInventory.js` renders a small thumbnail of the NFT image alongside the item name using the stored `imageUrl`.
        *   **HUD Popup**: `hud.js` displays a larger version of the image and the item's traits when an NFT item is picked up or inspected.

## Development Conventions

*   **Modules**: The project uses native ES6 modules (`import`/`export`).
*   **Managers**: Logic is divided into "Manager" objects (e.g., `mapManager`, `enemyManager`) that attach to the main `game` object.
*   **No Build Tools**: Currently, no bundlers (Webpack, Vite, etc.) are in use.
*   **Style**: Standard JavaScript coding style. semicolons are used.

## Lore Context

*   **Setting**: 2088 Metaverse, ruled by a sterile global government.
*   **Factions**: Xemists (creators of pills), Xperience junkies (players), Kingpins of Kaos.
*   **Mechanics**: Collecting pills, managing "Vitality" and "Creds", avoiding "System Enforcers".