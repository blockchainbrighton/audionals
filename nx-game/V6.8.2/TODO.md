# NarcotiX Game - Future Enhancements & Optimization Plan


Replace Item images with SVG images for all items replacing current characters

Same for NPCs eventually.




## 1. Gameplay & Mechanics

*   **Combat & Movement:**
    *   [x] **Mouse Aiming:** Implement mouse-based aiming for ranged weapons.
    *   [x] **Top-Down Perspective:** Refactor player character to top-down view with dynamic leg animations.
    *   [x] **Mouse Click Attack:** Allow Left Mouse Button to trigger attacks.
    *   [ ] Implement distinct damage types (Kinetic, Energy, Bio) and corresponding resistances.
    *   [ ] Introduce melee combos or charged attacks.
    *   [ ] Add stealth kills or non-lethal takedowns.

*   **World Building & Interaction:**
    *   [ ] **Building Interiors:** Redesign interactive locations (Shops, Quest Givers) to be physical rooms with doorways (locked/unlocked) and entry/exit text, similar to the Safehouse.
    *   [ ] **Doors:** Implement door logic (auto-open vs. locked/key required).

*   **Metadata Integration (Traits):**
    *   [x] **Expression Visuals:** Implement rendering of 'expression' trait (e.g., 'XO', 'X)') on pills and player face.
    *   [x] **Pill Colors:** Ensure `hex1` and `hex2` colors are correctly applied to pill visuals.
    *   [ ] **Animations:** Implement logic for `animation` trait (e.g., handling 'Gif' or other animation types) on pills.

*   **AI:**
    *   [x] Create enemy states: Patrol, Investigate, Alert (Chase), Hunt.

## 2. UI/UX Improvements

*   **Visuals & Interface:**
    *   [x] **Zoom Control:** Implement Camera Zoom In/Out via Mouse Wheel.
    *   [ ] **Item Imagery:** Ensure Stash House and other lists always display item images (SVGs) alongside text in neat tables.
    *   [x] Specialized UI for "Inventory" and "Shop" (Cyberpunk theme).
    *   [ ] Implement visual shaders for pill effects.

*   **Input:**
    *   [ ] Gamepad support.
    *   [ ] Customizable keybindings.

## 3. Technical & Performance

*   **Asset Management:**
    *   [ ] Implement `AssetLoader` to pre-load/cache images and sounds.
    *   [ ] Use Sprite Sheets/Atlases.

*   **Rendering:**
    *   [ ] Implement "Spatial Hash" or Quadtree for collision optimization.
    *   [ ] Use off-screen canvas for static layers.

*   **Architecture:**
    *   [ ] Refactor `game` object into a Singleton class.
    *   [ ] Move hardcoded strings to config.
    *   [ ] TypeScript migration.

## 4. Audio

*   **Sound Architecture:**
    *   [ ] **Dedicated Folder Structure:** Reorganize sound/music code into a dedicated folder.
    *   [ ] **Location Soundtracks:** Ensure all locations (Safehouse, Shops, etc.) have specific, easily swappable soundtracks.
    *   [ ] **Character Soundtracks:** Create a folder for character themes (e.g., Walkman tracks).
    *   [x] Basic spatial audio.
    *   [x] Cyberpunk synth-wave background music.

## 5. NFT & Blockchain Integration

*   **Wallet Connection:**
    *   [ ] Integrate Stacks.js.
    *   [ ] Verify ownership of specific NFTs.

*   **Dynamic Metadata:**
    *   [ ] Fetch live data from the blockchain.