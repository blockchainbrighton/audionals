# NarcotiX Game - Future Enhancements & Optimization Plan

## 1. Gameplay & Mechanics

*   **Expanded Combat System:**
    *   [ ] Implement distinct damage types (Kinetic, Energy, Bio) and corresponding resistances for enemies and players.
    *   [ ] Add "Active Reload" mechanic (perfect timing grants damage boost).
    *   [ ] Introduce melee combos or charged attacks.

*   **Deepened Pill Taxonomy:**
    *   [ ] Implement visual shaders for more effects (e.g., `GHOST_SIGHT` actually revealing invisible layers).
    *   [ ] Add "Overdose" mechanic: Consuming too many pills in short succession causes compounded negative effects or hallucinations.
    *   [ ] Create "Synergy" effects: Specific pill combinations yielding unique buffs.

*   **Stealth & AI:**
    *   [ ] Implement line-of-sight (FOV) cones for enemies rather than simple radius detection.
    *   [ ] Add stealth kills or non-lethal takedowns.
    *   [ ] Create enemy states: Patrol, Investigate, Alert, Hunt.

*   **Questing:**
    *   [ ] Multi-stage quests with branching outcomes based on player choice or pill usage.
    *   [ ] Daily/Procedural missions from the "Central Exchange" for varied replayability.

## 2. Technical & Performance

*   **Asset Management:**
    *   [ ] Implement an `AssetLoader` class to pre-load and cache images/sounds before the game starts, showing a loading bar.
    *   [ ] Use Sprite Sheets/Atlases for game entities instead of individual draw calls or simple colored rectangles.

*   **Rendering Optimization:**
    *   [ ] Implement a "Spatial Hash" or Quadtree for collision detection and rendering culling to support larger maps and more entities.
    *   [ ] Use an off-screen canvas (double buffering) if rendering becomes complex, though current `requestAnimationFrame` handling is decent.

*   **Code Architecture:**
    *   [ ] Refactor the `game` object into a proper singleton class or Engine class.
    *   [ ] Move hardcoded UI strings and magic numbers into a localized `constants.js` or JSON configuration.
    *   [ ] TypeScript migration: As the codebase grows, static typing would prevent many runtime errors.

## 3. UI/UX Improvements

*   **HUD Enhancements:**
    *   [ ] specialized UI for the "Inventory" and "Shop" that doesn't rely on simple DOM overlays; integrate them visually into the cyberpunk theme.

*   **Input Handling:**
    *   [ ] Gamepad support (Xbox/PS controller mapping via Gamepad API).
    *   [ ] Customizable keybindings.

## 4. NFT & Blockchain Integration

*   **Wallet Connection:**
    *   [ ] Integrate Stacks.js to allow users to connect their actual Stacks wallet.
    *   [ ] Verify ownership of specific NFTs to unlock "Owner-Only" areas or starting loadouts.

*   **Dynamic Metadata:**
    *   [ ] Fetch live data from the blockchain to see if an NFT has "leveled up" or changed (if the smart contract supports mutable state).

## 5. Audio

*   **Sound Engine:**
    *   [ ] Add spatial audio (sounds get quieter as you move away from the source).
    *   [ ] Cyberpunk synth-wave background music that reacts to combat state (calm vs. intense).