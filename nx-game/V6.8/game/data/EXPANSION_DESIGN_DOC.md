# NarcotiX Systems: Expansion Design Document v2.0
## Phase 2: "The Neon Fugue" & Phase 3: "Deep Web"

This document outlines the detailed narrative, mechanics, and asset requirements for the long-form campaign expansion.

---

## 1. 📖 The Extended Campaign (Missions 06-12)

### Arc 1: The High Rollers (Casino District)
**Theme:** *Opulence, Deception, Economy.*
**Goal:** Infiltrate the elite circle to find the "Backdoor" into the system.

| ID | Title | Objective | New Mechanics | Key Assets |
| :--- | :--- | :--- | :--- | :--- |
| **M06** | **Golden Ticket** | Earn 500 Creds (Gambling/Combat). | **Minigames**: Slots/Roulette logic updates. | `chip_stack.svg` |
| **M07** | **Velvet Rope** | Bribe the Bouncer to enter VIP Lounge. | **Dialogue**: Branching choice (Pay/Intimidate). | `bouncer_npc.svg` |
| **M08** | **The Broker** | Purchase "Root Key" info from **Neon_Shade**. | **Trading**: Buying "Info" (Abstract items). | `neon_shade_npc.svg` |

### Arc 2: The Descent (Undercity)
**Theme:** *Decay, Horror, Hardcore Combat.*
**Goal:** Physically travel to the server farm beneath the city.

| ID | Title | Objective | New Mechanics | Key Assets |
| :--- | :--- | :--- | :--- | :--- |
| **M09** | **System Purge** | Survive the "Lockdown" ambush (2 mins). | **Survival Mode**: Timed waves. | `red_alert_overlay.png` |
| **M10** | **Into the Deep** | Locate the Sewer Entrance. | **Zone Transition**: Loading interior maps. | `manhole_cover.svg` |
| **M11** | **Data Leech** | Harvest 5 Cores from Stalker Droids. | **Loot**: Specific mob drops. | `stalker_droid.svg` |
| **M12** | **Prime Access** | Defeat **Prime_Warden** & Hack the Core. | **Boss Fight**: Multi-stage (Shield/Attack). | `prime_warden.svg` |

---

## 2. 🏗️ New Buildings & Zones

To support the expansion, the Map System must support "Interiors".

### A. The Velvet Chip (Casino Interior)
*   **Type:** Safe Zone (mostly).
*   **Features:** Slot Machines (Interactable), Bar (Shop), VIP Lounge (Restricted).
*   **Visuals:** Gold/Purple floor tiles, carpet textures.

### B. Sector Zero (Undercity)
*   **Type:** Hostile Zone.
*   **Features:** Toxic Sludge (Damages player), Dark lighting (Player needs light source?).
*   **Visuals:** Green/Black pipes, rust, industrial waste.

---

## 3. 🎭 New Character Types

### A. The "Fixer" (NPC)
*   **Example:** Neon_Shade.
*   **Behavior:** Stationary, Invulnerable.
*   **Interaction:** Opens a **Dialogue Interface** (not just a shop). Can give Side Missions.

### B. The "Stalker" (Enemy)
*   **Example:** Sewer Droid.
*   **Behavior:** High Speed, Low Health. Uses "Stealth" (transparency) until close.
*   **Attack:** Melee bleed effect.

### C. The "Tank" (Boss)
*   **Example:** Prime_Warden.
*   **Behavior:** Slow, Massive Health.
*   **Ability:** "Ground Slam" (Area of Effect stun).

---

## 4. ⚔️ Arsenal Expansion (New Weapons & Items)

### Weapons
1.  **Arc_Rifle** (Tech)
    *   *Effect:* Chain Lightning. Hits target and 1 nearby enemy for 50% dmg.
2.  **Bio_Injector** (Melee)
    *   *Effect:* Short range. Applies "Poison" (DOT) to enemies.
3.  **Glitch_Grenade** (Throwable)
    *   *Effect:* Stuns mechanical enemies for 3 seconds.

### Items
1.  **Stim_Pack_Red**: +Damage for 10 seconds.
2.  **Stim_Pack_Blue**: +Speed for 10 seconds.
3.  **Access_Key_V1**: Unlocks standard doors.
4.  **Access_Key_Root**: Unlocks the End Game.

---

## 5. 🔄 Side Mission Loops (The "Gig" Economy)

Accessible via **Terminals** in the Safehouse.

*   **Bounty:** "Kill [Elite Enemy Name] in [Zone]." (Reward: High Creds).
*   **Fetch:** "Retrieve [Lost Data] from [Zone]." (Reward: Rare Item).
*   **Courier:** "Deliver [Package] to [NPC] in [Time Limit]." (Reward: Reputation/XP).