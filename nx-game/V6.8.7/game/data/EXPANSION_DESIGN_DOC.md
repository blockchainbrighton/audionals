# NarcotiX Systems: Expansion Design Document
## Phase 2: "The Neon Fugue"

### 1. Narrative Overview
**Theme:** *Reality is a Glitch.*
The player has awakened and armed themselves, but the world feels... synthetic. The "NarcotiX" pills aren't just drugs; they are code-injection packets modifying the user's perception of the simulation.

**The Arc:**
1.  **Awakening (Current):** Basic survival and tool acquisition.
2.  **The Fugue (Expansion):** Peeling back the layers. The player meets **Neon_Shade**, an info-broker who reveals that the "Syndicate" is farming human processing power.
3.  **System Override (End-Game):** Infiltrating the Core to either reset the simulation or ascend as a "God Mode" user.

---

### 2. Character Profiles

#### **The Protagonist (User)**
*   **Role:** The "Anomaly".
*   **Motivation:** Survival, then curiosity, then rebellion.

#### **Glitch_Codex (The Guide)**
*   **Type:** Rogue Subroutine / AI.
*   **Location:** Scattered terminals / HUD comms.
*   **Personality:** Cryptic, fragmented, speaks in code. "The firewall is... thinning."
*   **Function:** Quest Giver (Side Ops), Tutorial voice.

#### **Neon_Shade (The Broker)**
*   **Type:** NPC (Human Avatar).
*   **Location:** Casino VIP Lounge.
*   **Personality:** Smooth, transactional, cynical.
*   **Function:** Campaign Quest Giver. Requires "Creds" or "Data" to talk.

#### **Prime_Warden (The Antagonist)**
*   **Type:** Boss Entity (Heavy Enforcer model).
*   **Location:** The Syndicate Tower (Future Zone).
*   **Function:** Pursuer. Spawns periodically in high-heat zones.

---

### 3. Gameplay Mechanics Expansion

#### **A. Hacking System (New Minigame)**
*   **Concept:** Interactive locking mechanism for high-tier loot chests and secure doors.
*   **Visuals:** A HUD overlay featuring a hex-grid or frequency wave.
*   **Mechanic:** "Signal Locking". A moving bar oscillates; player must press SPACE when it aligns with the green target zone 3 times in a row. Speed increases each success.
*   **Integration:** Used in missions to "Hack Terminals" or "Disable Security Grids".

#### **B. The Combat Arena (Survival Mode)**
*   **Location:** "The Pit" (Underground layer of the Map).
*   **Loop:** Player enters a closed room. Waves of enemies spawn.
*   **Reward:** High-tier Loot (NFT weapons), massive Cred payouts.
*   **Narrative:** "Stress-testing the subject."

#### **C. Dynamic Events**
*   **Drop Pods:** Random supply drops in the open world (signaled by sound/minimap). Attracts high-level mobs.
*   **Lockdown:** Random zones turn red (lethal) for 60 seconds. Player must flee.

---

### 4. Campaign Expansion (Missions 06-12)

| ID | Title | Objective | Mechanic | Narrative Beat |
| :--- | :--- | :--- | :--- | :--- |
| **M06** | **Golden Ticket** | Earn 500 Creds at the Casino. | Economy/Minigame | "You need capital to talk to the elites." |
| **M07** | **The Broker** | Buy "VIP Pass" & Enter Lounge. | Buy/Interact | Meet Neon_Shade. |
| **M08** | **Signal Trace** | Plant a bug on 3 Comm Towers. | Exploration/Interact | "Tap into their network." |
| **M09** | **The Glitch** | Survive a "System Purge" (Ambush). | Combat (Survival) | The system notices you. |
| **M10** | **Firewall** | Defeat the "Gatekeeper" (Mini-Boss). | Boss Fight | Accessing the Subway. |
| **M11** | **Dark Descent** | Travel to the Undercity. | Goto (New Zone) | Leaving the neon lights behind. |
| **M12** | **Root Access** | Hack the Mainframe. | Hacking Minigame | Truth revealed. |

---

### 5. New Side Quests (Loops)

*   **"Data Running":** Pick up a packet, deliver it to X within 60 seconds. No fast travel (if implemented).
*   **"Hitman":** Assassinate a specific Elite Mob that wanders a zone.
*   **"Collection":** Find 5 "Glitch Artifacts" hidden in map corners.

---

### 6. Technical Requirements
1.  **`HackingGame.js`**: A class similar to `SlotsGame.js` but for reflex timing.
2.  **`WaveManager.js`**: Logic to spawn groups of enemies in a sequence.
3.  **Map Expansion**: Draw "The Undercity" (Tileset: dark pipes, slime, grime) and "VIP Lounge" (Tileset: Gold, plush carpet).
