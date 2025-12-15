# NarcotiX Game - Future Enhancements & Optimization Plan

## 1. Gameplay & Mechanics

*   **Expanded Combat System:**
    *   [ ] Implement distinct damage types (Kinetic, Energy, Bio) and corresponding resistances for enemies and players.
    *   [ ] Introduce melee combos or charged attacks.

*   **Stealth & AI:**
    *   [ ] Add stealth kills or non-lethal takedowns.
    *   [ ] Create enemy states: Patrol, Investigate, Alert, Hunt.

*   **Visuals & Juice:**
    *   [ ] Implement visual shaders for pill effects.

*   **Questing:**
    *   [ ] Multi-stage quests with branching outcomes based on player choice or pill usage.
    *   [ ] Daily/Procedural missions from the "Central Exchange" for varied replayability.

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
    *   [ ] Specialized UI for the "Inventory" and "Shop" (Cyberpunk theme).

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
    *   [ ] Add spatial audio.
    *   [ ] Cyberpunk synth-wave background music.