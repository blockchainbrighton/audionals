# Neon Crawl

## Game Description

Neon Crawl is a futuristic, cyberpunk-style roguelike game where you navigate a digital dungeon. As the player, you control a character represented by the '@' symbol, exploring procedurally generated levels. The goal is to descend as deep as possible into the dungeon, fighting off randomly generated creatures and collecting gold. With each new level, the difficulty increases. A unique feature of the game is the mutation system. Upon dying, you can choose a mutation that provides a permanent bonus for your next playthrough, making you progressively stronger. The game features a minimalistic ASCII art style with a neon color palette, creating a retro-futuristic atmosphere.

## How to Play

### Interface

The game displays the following information at the bottom of the screen:

*   **HP:** Your current health points.
*   **Gold:** The amount of gold you have collected.
*   **Depth:** Your current level in the dungeon.
*   **Mutations:** A list of the mutations you have acquired.

### Controls

*   **Arrow Keys:** Use the arrow keys to move your character up, down, left, and right.
*   **R Key:** Press 'R' to restart the game with the current seed.

### Gameplay

*   **Movement:** Navigate the dungeon by moving your character with the arrow keys. You can only move into empty spaces (`.`). You cannot move through walls (`#`).
*   **Combat:** To attack an enemy (represented by letters), move your character into the space occupied by the enemy. Each attack reduces the enemy's health. When an enemy's health reaches zero, it is defeated, and you will receive gold.
*   **Health:** Your character starts with 10 HP. If an enemy attacks you, your HP will decrease. If your HP reaches zero, you die.
*   **Gold:** Collect gold (`$`) by moving onto its tile. Gold is used to track your score and certain mutations can increase the amount of gold you find.
*   **Stairs:** To descend to the next level of the dungeon, find the stairs (`>`) and move onto them. Each new level will be more challenging.
*   **Line of Sight:** You can only see a limited area around your character. Anything outside of this "fog of war" will not be visible.
*   **Restarting:** You can restart the game at any time by pressing the 'R' key.

### Mutations

When your character dies, you are presented with a choice of three mutations. These mutations provide permanent passive bonuses to your character for all future playthroughs. The available mutations include:

*   **Regen:** Gain 1 HP per level.
*   **Strength:** Deal an extra point of damage with melee attacks.
*   **Vision:** Increase your line of sight by 2 tiles.
*   **Wealth:** Start with an additional 10 gold.