```markdown
# Quantum Sokoban

## Game Objective

Quantum Sokoban is a puzzle game that puts a mind-bending twist on the classic Sokoban. The objective remains the same: push all the crates onto the designated goal locations. [2, 3, 5] However, this version introduces the concept of quantum superposition, where a crate can exist in multiple places at once!

## How to Play

### Basic Movement
You control the player character, represented by a red circle. The goal is to push the crates (squares) onto the yellow goal locations. You can move the player up, down, left, or right. You cannot move through walls or other crates.

### The Quantum Mechanic: Superposition
This is where Quantum Sokoban differs from the original. When you push a crate, it doesn't just move to the next square. Instead, it enters a state of **superposition**. This means it will now occupy all possible reachable locations in the direction you pushed it.

For example, if you push a crate into an open row, it will exist as a "ghost" in every empty square in that row until it hits a wall or another crate. These superposed crates are represented as semi-transparent cyan squares.

### Observation and Collapse
To make a crate solid again, you must **observe** it. By pressing the observe key, you will force every crate on the board to collapse from its state of superposition into a single, randomly chosen position from its possible locations.

Be warned! If two crates happen to collapse into the same location, a paradox occurs, and the level will restart. The key to winning is to manage the uncertainty and use the observation mechanic to your advantage.

## Controls

*   **Arrow Keys (Up, Down, Left, Right):** Move the player.
*   **Spacebar:** Observe the crates, causing them to collapse out of superposition.
*   **Z:** Undo your last move.
*   **R:** Restart the current level.

## Winning the Game

You win the level when all the crates are successfully moved onto the goal locations in a definite (non-superposed) state. Once you solve a level, a new, procedurally generated level will load for you to tackle.

```