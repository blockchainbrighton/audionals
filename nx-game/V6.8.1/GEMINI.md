# NarcotiX Systems - Project Master Plan (V6.8+)

## 🎯 Primary Objective: The "Evolving Gameplay" Transformation

**Current Focus:** Transition the game from an open "Sandbox" architecture to a structured "Gated Progression" experience. The goal is to guide players through a narrative-driven journey, unlocking mechanics (inventory, combat, trading) and zones (Safehouse, Alley, Casino) sequentially.

---

## 🏗️ The Evolving Gameplay Architecture

We are implementing a new layer of state management to handle player progression.

### 1. New Core Systems
*   **`ProgressionManager` (The Gatekeeper)**
    *   *Role:* Manages the persistent state of the player's journey (e.g., `unlockedFlags: ["ZONE_ALLEY", "WEAPON_TIER_1"]`).
    *   *Responsibility:* It wraps other managers to "gate" content. It tells `mapManager` which doors are locked and `itemManager` which loot tables are active.
*   **`MissionManifest` (Data Layer)**
    *   *Role:* A centralized JSON/Object structure (`game/data/campaign.js`) defining the linear mission tree.
    *   *Structure:* Missions have `id`, `prereq`, `objectives` (KILL, GOTO, BUY), and `rewards` (unlocks, items).
*   **`Neural Link` (Narrative HUD)**
    *   *Role:* A visual "Comms" system in the HUD to deliver narrative context and objectives from a "Handler" (NPC), replacing static text boxes.

### 2. Required Refactoring
*   **`itemManager.js` & `enemyManager.js`**: Must act as consumers of `ProgressionManager`.
    *   *Change:* `spawnRandomItem()` now checks `ProgressionManager.currentTier` to determine if high-level loot (Rifles, Rare Pills) can drop.
*   **`mapManager.js`**:
    *   *Change:* Implement `checkLock(tileData)` to physically block entry to zones the player hasn't unlocked (e.g., Red Holographic Barriers).
*   **`questManager.js`**:
    *   *Change:* Decouple logic. Instead of hardcoded steps, it listens to the `EventBus` (e.g., `ENEMY_KILLED`) and checks the `MissionManifest` to advance the active mission.

---

## 🗓️ Implementation Roadmap

### Phase 1: Foundation (Architecture) - ✅ COMPLETED
1.  **Create Data Structures**: Define `game/data/campaign.js` with the first 5 tutorial missions. (Done)
2.  **Scaffold Managers**: Create `progressionManager.js` and integrate it into `game.js`. (Done)
3.  **Event Integration**: Ensure `EventBus` emits necessary signals (`ITEM_PICKUP`, `ZONE_ENTER`, `MOB_DEATH`) for the quest system to track. (Done: `ENEMY_KILLED`, `ITEM_BOUGHT`, `LOCATION_ENTERED` added)

### Phase 2: The "Introductory Journey" (Content) - 🚧 IN PROGRESS
Implement the "Walkthrough" flow:
*   **Step 1: Safehouse (Tutorial)**
    *   *Constraint:* Locked inside Safehouse.
    *   *Tasks:* Move, Open Stash.
    *   *Reward:* Unlock Front Door.
*   **Step 2: The Alley (Combat)**
    *   *Constraint:* Street blocked by "Police Barricade".
    *   *Tasks:* Equip Weapon, Kill 1 Drone.
    *   *Reward:* Barricade dissolves.
*   **Step 3: The Exchange (Economy)**
    *   *Constraint:* Casino/Bar locked.
    *   *Tasks:* Reach Exchange Node, Buy Medkit.
    *   *Reward:* Unlock Bar/Casino.

### Phase 3: Visual Polish & Feedback
*   **Visual Locks**: Replace text blocks with visual barriers (Red/Green holograms) on doors.
*   **Guidance**: Add directional arrows/minimap highlights for the current objective.

---

## 📂 Project Structure & Context

**Directory:** `/Dec25/V3/V3.0` (Root)
**Tech Stack:** Vanilla JavaScript (ES6 Modules), HTML5 Canvas. **No Build Step.**

### Key Directories & Files
*   **`game/`**
    *   `index.html`: Entry point.
    *   `narcotix-collection-metadata.csv`: NFT Metadata (Item generation source).
    *   `pill_effects_taxonomy.csv`: Gameplay effects mapping.
    *   **`js/`**
        *   **`core/`**: Core engine files (`game.js`, `main.js`, `config.js`, `utils.js`, `eventBus.js`, `InputManager.js`).
        *   **`managers/`**: Logic managers (`mapManager.js`, `itemManager.js`, `enemyManager.js`, `questManager.js`, `progressionManager.js`, etc.).
        *   **`entities/`**: Game object classes (`Entity.js`, `Enemy.js`, `WorldItem.js`, `Projectile.js`).
        *   **`ui/`**: UI components (`hud.js`, `minimap.js`, `touchControls.js`, `UIFactory.js`).
        *   **`player/`**: Modular player logic (`player.js`, `playerCombat.js`, etc.).
        *   **`data/`**: Static game data (`campaign.js`, `items.js`, etc.).
        *   **`casino/`**: Minigame logic.
        *   **`systems/`**: Low-level systems (`RenderSystem.js`).

### Conventions
*   **Modules**: Use native `import`/`export`.
*   **State**: `game` object is the central store. New managers attach to it.
*   **Assets**: SVGs in `artwork/`. Images loaded dynamically.
*   **CSV**: Metadata is the source of truth for items.

---

## 📚 Reference: Gameplay Mechanics

*   **Combat**: Real-time, WASD + Mouse Aim.
*   **Stats**: Vitality (HP), Energy (Mana), Creds (Money).
*   **NFTs**: "Pills" generated from CSV. Traits determine stats/visuals.
*   **Casino**: Minigames (Slots, Roulette) based on NFT traits.