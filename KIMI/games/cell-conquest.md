# Cellular Conquest - Game Guide

## Overview

Cellular Conquest is a strategy game based on the principles of cellular automata, similar to Conway's Game of Life. The game involves two competing factions: the Player (green cells) and the AI (red cells). The objective is to manipulate the fundamental rules of the simulation to ensure your cells dominate the board.

## Objective

The primary goal is to control **more than 50%** of the living cells on the grid at the end of a simulation round. Achieving this will earn you **Currency**, which can then be used to change the game's rules, hopefully in your favor.

## The Gameplay Loop

Each game round consists of three phases:

### 1. Preparation Phase (Pre-Simulation)

At the start of the round, the grid is populated with a random, symmetrical pattern of AI and Player cells. Before starting the simulation, you have the ability to modify the board:

*   **Left-Click:** Place one of your green cells on any empty square.
*   **Right-Click:** Erase any cell (both yours and the AI's) from the grid.

This is your chance to strategically position your cells to take advantage of the current rules.

### 2. Simulation Phase

*   Press the **SPACEBAR** or click the **"START ROUND"** button to begin the simulation.
*   The simulation runs for **60 ticks** (at a speed of 30 ticks per second).
*   During this phase, you cannot interact with the grid. You can only watch as the cells live, die, and reproduce according to the established rules for birth and survival.

### 3. Resolution Phase

*   After 60 ticks, the simulation stops, and the results are calculated.
*   The game counts the number of Player tiles versus the total number of tiles. This is displayed as `TILES: [Your Tiles]/[Total Tiles]`.
*   **If your tiles make up more than 50% of the total**, you win the round and earn Currency. The amount earned is based on how much you dominated (`floor(your_ratio * 10)`).
*   The board is then reset with a new pattern, and the next round begins.

## Understanding the Rules (B/S Notation)

The entire simulation is governed by two 8-bit rules: **Birth (B)** and **Survival (S)**. The fate of every cell is determined by the number of its 8 immediate neighbors.

The rules are displayed in the format `B: 00000000 S: 00000000`. Each '0' or '1' in the binary string corresponds to a number of neighbors, from 7 down to 0 reading left-to-right (or 0 to 7 reading right-to-left). A `1` means the rule is active for that number of neighbors.

### Birth Rule (B)

This rule determines when a new cell is born on an empty square.

*   **Example:** `B: 00001000`
*   In this example, only the bit for **3 neighbors** is active (counting from the right, starting at 0). This means an empty square with exactly 3 neighbors will give birth to a new cell.
*   The color of the new cell is determined by a battle: if there are more green neighbors, the new cell is green. If there are more red neighbors, it's red. If there's a tie, the color is chosen randomly.

### Survival Rule (S)

This rule determines when an existing cell (red or green) survives to the next tick. If the condition isn't met, the cell dies and becomes an empty square.

*   **Example:** `S: 00110000`
*   In this example, the bits for **4 and 5 neighbors** are active. This means an existing cell will only survive if it has exactly 4 or 5 neighbors. Any other number of neighbors (0, 1, 2, 3, 6, 7) will cause it to die.

## Currency and Mutation

The key to long-term success is evolving the rules to your advantage.

*   **Earning Currency:** Win rounds by controlling more than 50% of the cells.
*   **MUTATE Button:** For a cost of **1 Currency**, you can press this button. The game will randomly select either the Birth or Survival rule and flip one of its bits (a `0` becomes a `1` or a `1` becomes a `0`).

Through careful observation and strategic mutation, you can discover rule sets that favor your green cells and lead to consistent victory.

## Controls

*   **Mouse Left-Click:** Place a Player (green) cell (only in the Preparation Phase).
*   **Mouse Right-Click:** Erase any cell (only in the Preparation Phase).
*   **SPACE Key:** Start the simulation.
*   **START ROUND Button:** Starts the simulation.
*   **MUTATE Button:** Costs 1 Currency. Randomly alters the Birth or Survival rule.