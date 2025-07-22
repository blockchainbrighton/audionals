# Timeloop Detective

## The Story

You are a private investigator on the verge of cracking the biggest case of your career: a daring daylight heist. You've narrowed down the suspects and the location, but you're missing the crucial "when" and "how." As you close in on the truth, a strange temporal phenomenon traps you in a time loop, forcing you to relive the day of the heist over and over. This curse, however, might just be the key to cracking the case. Each loop is a chance to gather more clues, understand the movements of everyone involved, and ultimately, intervene to prevent the crime.

## How to Play

### Objective

Your goal is to prevent the heist by manipulating the events of the day. You must learn the schedules of the three non-player characters (NPCs) – the Guard, the Thief, and the Manager – to understand how the heist unfolds. Once you have enough information, you can make interventions to alter their actions and stop the theft.

### The Interface

The game screen is divided into two main sections:

*   **The Map (Left):** This is a top-down view of the five locations you can visit:
    *   Lobby
    *   Vault
    *   Cafe
    *   Roof
    *   Garage
    Click on a location's blue circle to move there. Your current location will determine what events you can observe.

*   **The Notebook (Right):** This is your primary tool for tracking information. It has several key components:
    *   **Clock:** Displays the current time, starting at 08:00 and ending at 20:00. Time advances automatically.
    *   **Rewind Day Button:** This button will manually end the current loop and start the day over. The day will also automatically rewind at 20:00.
    *   **Clues:** This section records the actions of NPCs you have observed in your current location.
    *   **Interventions:** This lists the changes you have made to the timeline in previous loops.
    *   **NPC Schedules:** This shows the full, color-coded schedules of the Guard, Thief, and Manager. This information is crucial for planning your interventions.

### Gameplay Loop

1.  **Observe:** At the start of each loop (day), you begin at 08:00. Click on a location on the map to move there. As time passes, if an NPC performs a scheduled action in your current location, a "Clue" will be added to your notebook. To uncover the entire heist plan, you'll need to visit different locations across multiple loops to see all the scheduled events.

2.  **Learn:** Pay close attention to the "NPC Schedules" in your notebook. This reveals the minute-by-minute plan for each character, including their location and action. Understanding these timelines is essential to identifying the critical moments of the heist.

3.  **Intervene:** Once you understand the sequence of events, you can start making interventions. An intervention is a change you introduce to an NPC's schedule at a specific time. For example, you might change the Guard's action from "patrol" to "lock vault."
    *   **How to Intervene:** The initial way to intervene is by pressing the 'L' key. This specific intervention will make the Guard lock the vault at 10:00 (which corresponds to `time:600` in the game's code). You can only make an intervention for a future event within the current loop.

4.  **Rewind and Repeat:** At the end of the day (20:00), or by clicking the "Rewind Day" button, the time loop will restart. Any interventions you made in the previous loop will now be active and will alter the events of the new day. Your goal is to create a change that prevents the Thief from successfully cracking the safe.

### Winning the Game

To win the game, you must successfully prevent the heist. The key is to ensure the vault is locked when the Thief attempts to crack the safe. By observing the schedules, you'll notice the Thief's safecracking attempt. By using the 'L' key intervention at the right time, you can change the Guard's actions to lock the vault before the Thief arrives, thus foiling the plan. You win the game after successfully preventing the heist, and the game will tell you how many loops it took to solve the case.