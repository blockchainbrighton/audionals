Here is a detailed summary of the NarcotiX Systems (V6.7 - Casino Games) project, analyzing
  its gameplay features, technical architecture, and future development paths.

  🎮 Project Overview: NarcotiX Systems
  Version: V6.7 - Casino Games
  Tech Stack: Vanilla JavaScript (ES6 Modules), HTML5 Canvas, CSS3.
  Genre: Cyberpunk 2D Top-Down RPG / Adventure / Casino Simulation.
  Setting: The "2088 Metaverse" — a dystopian digital reality where players collect illicit
  "NarcotiX" pills (NFTs) to gain powers, subvert the system, and engage in a thriving
  underground economy.

  ---

  🕹️ Gameplay Mechanics

  1. Core Loop
   * Exploration: Players navigate a tile-based overworld and various distinct zones
     (Safehouse, Exchange Nodes, Xemist Dens). The world features a Day/Night cycle ("Phases")
     that influences shop stocks and NPC behaviors.
   * Survival: Players must manage HP (Vitality) and Energy. "Creds" are the currency used for
     trading.
   * Loot & Inventory: Items include Weapons (Pistols, Machine Guns), Consumables (Medkits,
     Ammo), and special NarcotiX Pills (NFT-based power-ups).

  2. Combat System
   * Real-Time Action: Combat is active (not turn-based). Players aim with the mouse and use
     WASD for movement.
   * Arsenal: Includes Ranged Weapons (require ammo/reloading) and Melee Weapons (Knives,
     Crowbars).
   * Abilities: Players have 3 distinct abilities (mapped to 1-3 keys) and "Subroutines" for
     tactical advantages.
   * Enemies: AI agents with different states (Patrol, Investigate, Chase, Hunt).

  3. The Casino (New in V6.7)
  A major addition allowing players to wager Creds in minigames:
   * Slots ("Narc-O-Slots 2088"): A 3-reel slot machine where winning combinations are based on
     NFT Traits (Expression, Shape, Base Color).
       * Jackpots: Awarded for syncing multiple traits (e.g., "Apex Jackpot" for 6 matching
         traits).
   * Roulette & High/Low: Additional gambling minigames available in the Casino zone.

  4. NFT Integration ("Pills")
  The game generates items dynamically from narcotix-collection-metadata.csv.
   * Taxonomy: Pills have effects defined in pill_effects_taxonomy.csv.
   * Traits: Visuals and stats are derived from metadata traits like Expression, Shape, and Hex
     Colors.
   * Expression Gangs: Players can "join" a gang based on their pill's facial expression (e.g.,
     "XO", "X)"), gaining permanent stat modifiers (Speed, Damage, Defense).

  ---

  🏗️ Technical Architecture

  1. Code Structure
  The project uses a modular architecture without a build step. It relies on native ES6
  modules.

   * Entry Point: index.html loads js/main.js, which bootstraps the game object.
   * The "God Object" (`game.js`):
       * Acts as the central mediator.
       * Initializes all "Managers" (Map, Item, Enemy, Sound, etc.).
       * Runs the main update() loop and delegates render() calls.
       * Manages global state (gameState, camera, time).
   * Manager Pattern: Functionality is encapsulated in specialized managers:
       * mapManager.js: Tilemap data and collision logic.
       * itemManager.js: Item generation, parsing NFT CSVs.
       * enemyManager.js: AI logic and spawning.
       * questManager.js: Quest states and NPC dialogue.
       * shopManager.js: Buying/Selling logic at "Exchange Nodes".

  2. Player Module (js/player/)
  The player logic is split into sub-modules and aggregated in player.js:
   * playerCore.js: Movement, physics, and base stats.
   * playerCombat.js: Attack logic, damage calculations, reloading.
   * playerInventory.js: Stash management.
   * playerStatusEffects.js: Buffs/Debuffs (e.g., "Speed Boost", "Confused").
   * playerCharacterDesign.js: Visual customization and animations.

  3. Rendering System
   * `systems/RenderSystem.js`: Handles drawing to the HTML5 Canvas.
   * Pipeline:
       1. Clear Screen.
       2. Apply Camera Transform (Zoom/Pan).
       3. Render Map Layer.
       4. Render Entities (Sorted by Y-position for depth).
       5. Render Particles & FX.
       6. Render UI Overlay (HUD, Minimap) on top.

  4. Data Flow
   * Static Data: Game content (NFTs, Effects, Expressions) is loaded from CSV files at runtime
     via fetch().
   * State: Runtime state is held in-memory within the game object and its managers.
   * Events: An EventBus (eventBus.js) decouples some systems, handling events like
     ACTION_TRIGGERED.

  ---

  🚀 Future Development Aids

  Key Areas for Improvement (based on TODO.md & Analysis)
   1. Rendering Optimization:
       * Implement Spatial Hashing or Quadtrees to optimize collision detection (currently
         checks all entities).
       * Use an Asset Loader to pre-cache images instead of loading on-the-fly, reducing
         "pop-in" for NFT images.
   2. Architecture Refactor:
       * TypeScript Migration: The project is growing complex; types would prevent many runtime
         errors.
       * State Management: Moving state out of the global game object into a dedicated Store
         (like Redux or a simple State pattern) would improve testability.
   3. Blockchain Connection:
       * The TODO mentions integrating Stacks.js to verify actual wallet ownership of the NFTs,
         allowing players to use their real assets in-game.
   4. Gameplay Polish:
       * Building Interiors: Transitioning from "Modal" popups (current Shop/Casino UI) to
         physical interior maps would increase immersion.
       * Sound: A more robust sound engine with spatial audio for specific locations is
         planned.
  Important Files for Developers
   * game/js/config.js: Global constants (Tile size, colors, game balance).
   * game/narcotix-collection-metadata.csv: The source of truth for all generated items.
   * game/js/casino/SlotsGame.js: Reference implementation for complex UI minigames.