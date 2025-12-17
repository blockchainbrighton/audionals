# NarcotiX Game - Future Enhancements & Optimization Plan

## 1. Gameplay & Mechanics

*   **Expanded Combat System:**
    *   [ ] Implement distinct damage types (Kinetic, Energy, Bio) and correcd sponding resistances for enemies and players.
    *   [ ] Introduce melee combos or charged attacks.

*   **Metadata Integration (New Traits):**
    *   [ ] Implement visual representation for `expression` trait (e.g., 'XO', 'X)') on pills.
    *   [ ] Implement logic for `animation` trait (e.g., handling 'Gif' or other animation types).
    *   [ ] Ensure `hex1` and `hex2` colors are correctly applied to pill visuals.

*   **Stealth & AI:**
    *   [ ] Add stealth kills or non-lethal takedowns.
    *   [x] Create enemy states: Patrol, Investigate (Alerted Position), Alert (Chase), Hunt.

*   **Visuals & Juice:**
    *   [ ] Implement visual shaders for pill effects (based on `pill_effects_taxonomy.csv`).

*   **Questing:**
    *   [x] Basic Quest System (Quest Givers, Tracking, Rewards).
    *   [ ] Multi-stage quests with branching outcomes based on player choice or pill usage.
    *   [ ] Daily/Procedural missions from the "Central Exchange" for varied replayability.

*   **Economy:**
    *   [x] Basic Shop & Trading System (Exchange Nodes).

## 2. Technical & Performance

*   **Asset Management:**
    *   [ ] Implement an `AssetLoader` class to pre-load and cache images/sounds.
    *   [ ] Use Sprite Sheets/Atlases.

*   **Rendering Optimization:**
    *   [ ] Implement a "Spatial Hash" or Quadtree.
    *   [ ] Use an off-screen canvas.

*   **Code Architecture:**
    *   [ ] Refactor the `game` object into a proper singleton class.
    *   [ ] Move hardcoded UI strings/numbers to configuration.
    *   [ ] TypeScript migration.

## 3. UI/UX Improvements

*   **HUD Enhancements:**
    *   [x] Specialized UI for the "Inventory" and "Shop" (Cyberpunk theme).

*   **Input Handling:**
    *   [ ] Gamepad support.
    *   [ ] Customizable keybindings.

## 4. NFT & Blockchain Integration

*   **Wallet Connection:**
    *   [ ] Integrate Stacks.js.
    *   [ ] Verify ownership of specific NFTs.

*   **Dynamic Metadata:**
    *   [ ] Fetch live data from the blockchain.

## 5. Audio

*   **Sound Engine:**
    *   [x] Add spatial audio (Basic implementation in `soundManager.js`).
    *   [x] Cyberpunk synth-wave background music.