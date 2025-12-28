# NarcotiX Systems - Mission Manifest

This document serves as the central record for all missions, side quests, and their respective steps. It is the blueprint for the game's narrative progression and content gating.

## 1. Main Campaign (Progression)

**Manager:** `ProgressionManager.js`
**Data Source:** `game/js/data/campaign.js`
**Mechanism:** Linear progression. Completion of one mission triggers the next based on `prereq`. Events (KILL, BUY, INTERACT) are monitored globally to track progress.

| ID | Prereq | Title | Type | Objective | Unlocks | Dialogue / Context |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `mission_01_wakeup` | `null` | **System Reboot** | INTERACT | Interact with the **Safehouse Stash**. | `feature_inventory` | "Systems online. You need to check your stash before heading out." |
| `mission_02_arm_up` | `mission_01_wakeup` | **Arming Protocol** | EQUIP | Retrieve and Equip the **Pistol**. | `zone_street`, `feature_combat` | "It's dangerous out there. Retrieve your sidearm and calibrate your aim." |
| `mission_03_first_blood` | `mission_02_arm_up` | **Cleaning the Streets** | KILL | Kill 1 **Security Drone**. | `shop_central_exchange` | "Hostiles detected. Clear the perimeter." |
| `mission_04_trade_route` | `mission_03_first_blood` | **Liquid Assets** | BUY | Buy a **Nanite Repair** from Central Exchange. | `zone_casino_district` | "Good work. You're leaking data though. Go buy a patch." |
| `mission_04_explore` | `mission_04_trade_route` | **The Neon District** | GOTO | Find the entrance to the **Casino District**. | `feature_minigames` | "The wealthy elites gather in the Casino district. High risk, high reward." |
| `mission_05_jackpot` | `mission_04_explore` | **Feeling Lucky** | INTERACT | Play the **Slot Machine**. | `open_world_access` | "Test your luck. Maybe you'll hit the big one." |

---

## 2. Side Protocols (Quests)

**Manager:** `QuestManager.js`
**Data Source:** `game/js/managers/questManager.js` (Internal `availableQuests` array)
**Mechanism:** Optional tasks. Accepted via dialogue with NPCs (e.g., Glitch_Codex). Custom `onAccept` and `checkCompletion` logic.

| ID | Title | Giver | Type | Objective | Reward |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `q_deliver_xdata` | **Hot XData Packet Delivery** | Glitch_Codex | DELIVER | Deliver 5 **NarcotiX Pills** to the **Xemist Den**. | 100c, Nanite Repair |
| `q_defrag_zone` | **Defrag Corrupted Zone Epsilon** | Glitch_Codex | CLEAR_ZONE | Kill 2 **Enforcers** in **Zone Epsilon**. | 150c, Adrena Rush Injector |
| `q_retrieve_formula` | **Retrieve Leaked Xemist Formula** | Glitch_Codex | FIND_ITEM | Find the **XData Fragment** held by a **Zone Warden**. | 250c, Kaos Elixir |

---

## 3. Developer Guide: Adding Content

### Adding a Main Campaign Mission
1.  Open `game/js/data/campaign.js`.
2.  Add a new object to the `CAMPAIGN_DATA` array.
3.  Ensure `prereq` matches the `id` of the previous mission.
4.  Supported Types:
    *   `INTERACT`: Triggered by `LOCATION_ENTERED` event (requires `targetId`).
    *   `EQUIP`: Triggered by `WEAPON_UPDATED` event (requires `targetId`).
    *   `KILL`: Triggered by `ENEMY_KILLED` event (requires `targetType`, optional `count`).
    *   `BUY`: Triggered by `ITEM_BOUGHT` event (requires `itemId`).
    *   `GOTO`: Triggered by entering a specific zone (requires `targetZone`).

### Adding a Side Quest
1.  Open `game/js/managers/questManager.js`.
2.  Add a new object to `this.availableQuests` in `defineQuests()`.
3.  Define properties:
    *   `giverId`: ID of the NPC/Tile offering the quest.
    *   `type`: `DELIVER_ITEM_TO_NPC`, `CLEAR_ZONE`, or `FIND_ITEM`.
    *   `onAccept`: Function returning boolean (true if accepted).
    *   `checkCompletion`: Function returning boolean (true if complete).
