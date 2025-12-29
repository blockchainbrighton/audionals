# NarcotiX Systems: System Architecture & Requirements
## Technical Roadmap for Expansion Phases

This document details the code structure changes required to support the features outlined in the Design Document.

---

## 1. 🗣️ Dialogue System (`DialogueManager.js`)

**Requirement:** Branching conversations with NPCs.
**Structure:**
```javascript
// Data Structure Example
const DIALOGUE_TREE = {
    "neon_shade_intro": {
        text: "You look lost, kid. Or maybe just broke.",
        options: [
            { text: "I need info.", next: "ask_info_cost" },
            { text: "Out of my way.", next: "end_rude" }
        ]
    },
    "ask_info_cost": {
        text: "Info costs. 500 Creds. Up front.",
        requirements: { money: 500 },
        options: [
            { text: "Here.", action: "pay_500", next: "reveal_secret" },
            { text: "I'll come back.", next: "end" }
        ]
    }
}
```
**Implementation:**
*   Create `game/js/managers/dialogueManager.js`.
*   Integrate UI overlay in `hud.js` to show dialogue box + buttons.
*   Pause Game Loop (`game.paused = true`) during dialogue.

---

## 2. 🚪 Interior / Sub-Map System (`ZoneManager.js` Upgrade)

**Requirement:** transitioning from the "Overworld" to small "Interior" maps.
**Approach:**
*   **Map Data:** `mapManager.js` currently generates one big map. We need to support loading *different* arrays.
*   **Transition:**
    *   Event: `PLAYER_ENTER_PORTAL` -> `targetMap: 'casino_interior'`.
    *   Action: Save Overworld state -> Clear Map -> Load Interior Tileset -> Spawn Interior Entities.
*   **Files:**
    *   `game/data/maps/overworld.js` (Current)
    *   `game/data/maps/casino_interior.js` (New)

---

## 3. 🧪 Status Effect System (`StatusManager.js`)

**Requirement:** Damage Over Time (DOT), Stuns, Buffs.
**Structure:**
*   Add `statusEffects` array to `Entity` class.
*   **Effect Object:** `{ type: 'POISON', duration: 3000, tickRate: 1000, value: 5 }`.
*   **Update Loop:** In `Entity.update()`, iterate through effects and apply logic.
*   **Visuals:** Add tinted overlay or particle effect to entity when affected.

---

## 4. 🤖 AI Behaviors (`Enemy.js` Extension)

**Requirement:** Varied enemy tactics.
**Implementation:**
*   Refactor `Enemy.update()` to use a **State Machine**.
*   **States:**
    *   `WANDER`: Random movement.
    *   `CHASE`: Direct line to player.
    *   `FLANK` (New): Move perpendicular to player.
    *   `FLEE` (New): Move away from player (low HP).
    *   `CAST` (New): Stop moving, play animation, spawn projectile.

---

## 5. 🎒 Weighted Loot Tables (`ItemManager.js`)

**Requirement:** Better loot in harder zones.
**Implementation:**
*   Current: `spawnRandomItem()` is purely random.
*   New: `spawnLoot(tier)`.
    *   `Tier 1` (Street): Ammo, Bandages.
    *   `Tier 2` (Casino): Cash, Stims.
    *   `Tier 3` (Undercity): Rare Weapons, Quest Items.

