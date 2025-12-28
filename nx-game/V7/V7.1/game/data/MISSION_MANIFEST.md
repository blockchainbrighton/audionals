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

### Planned Expansion: "The Neon Fugue"

| ID | Prereq | Title | Type | Objective | Unlocks | Dialogue / Context |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `mission_06_golden_ticket` | `mission_05_jackpot` | **Golden Ticket** | ACCUMULATE | Earn 500 Creds (Casino/Combat). | `shop_vip_pass` | "You need capital to talk to the elites. The Casino is your best bet." |
| `mission_07_the_broker` | `mission_06_golden_ticket` | **The Broker** | INTERACT | Enter VIP Lounge & Speak to **Neon_Shade**. | `feature_hacking` | "Neon_Shade has the data. But he doesn't talk to broke tourists." |
| `mission_08_signal_trace` | `mission_07_the_broker` | **Signal Trace** | INTERACT | Plant bugs on 3 **Comm Towers** (Street/Alley). | `zone_subway_entrance` | "Tap into their network. We need ears on the ground." |
| `mission_09_the_glitch` | `mission_08_signal_trace` | **The Glitch** | SURVIVE | Survive the **System Purge** Ambush (2 mins). | `n/a` | "They found the tap! They're sending the sweepers. Survive!" |
| `mission_10_firewall` | `mission_09_the_glitch` | **Firewall** | KILL | Defeat the **Gatekeeper** (Mini-Boss). | `zone_undercity` | "The path to the Undercity is blocked by a heavy firewall unit." |
| `mission_11_dark_descent` | `mission_10_firewall` | **Dark Descent** | GOTO | Enter the **Undercity** Zone. | `feature_arena` | "Go underground. The signal is coming from below." |
| `mission_12_root_access` | `mission_11_dark_descent` | **Root Access** | HACK | Hack the **Mainframe Terminal**. | `end_game_tier_1` | "This is it. The truth is inside. Don't blink." |


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
