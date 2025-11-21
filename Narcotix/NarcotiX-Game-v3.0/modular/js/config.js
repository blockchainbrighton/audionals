export const GAME_CONFIG = Object.freeze({
    TILE_SIZE: 40,
    MAP_WIDTH: 60,
    MAP_HEIGHT: 60,
    TERRAIN_TYPES: Object.freeze({
        0: Object.freeze({ name: 'street', color: '#333', speed: 1.02, passable: true }),
        1: Object.freeze({ name: 'grass', color: '#0a4a0a', speed: 0.98, passable: true }),
        2: Object.freeze({ name: 'building', color: '#666', speed: 0, passable: false }),
        3: Object.freeze({ name: 'water', color: '#0066cc', speed: 0.9, passable: true }),
        4: Object.freeze({ name: 'drug-lab', color: '#ff00ff', speed: 1.0, passable: true, special: 'lab' }),
        5: Object.freeze({ name: 'stash-house', color: '#00ffff', speed: 1.0, passable: true, special: 'shop' }),
        6: Object.freeze({ name: 'enterable-building', color: '#654321', speed: 1.0, passable: true, special: 'building' })
    }),
    ENEMY_TYPES: Object.freeze({
        thug: Object.freeze({ hp: 50, damage: 8, speed: 0.04, color: '#8B4513', detectionRange: 0, patrol: true, label: 'Thug' }),
        rogue: Object.freeze({ hp: 35, damage: 12, speed: 0.06, color: '#ff4500', detectionRange: 20, patrol: false, label: 'Rogue' }),
        police: Object.freeze({ hp: 90, damage: 18, speed: 0.05, color: '#0000ff', detectionRange: 25, patrol: true, label: 'Police' }),
        boss: Object.freeze({ hp: 250, damage: 30, speed: 0.03, color: '#ff0000', detectionRange: 35, patrol: false, label: 'BOSS' })
    }),
    PLAYER_BASE_SPEED: 0.06,
    SPEED_EFFECT_MULTIPLIER: 1.15,
    PLAYER_VISION_RANGE: 100,
    TERRITORY_CLAIM_DELAY: 3000,
    ENEMY_SPAWN_RATE: 0.00008,
    MIN_SPAWN_DISTANCE: 30,
    DETECTION_TIME_REQUIRED: 4.0,
    BUILDING_SHELTER_TIME: 8000,
    WEAPON_TYPES: Object.freeze({
        fists: Object.freeze({ damage: 10, range: 1.5, cooldown: 800, ammo: -1, color: '#fff', name: 'FISTS' }),
        pistol: Object.freeze({ damage: 25, range: 8, cooldown: 1200, ammo: 12, color: '#ff0', name: 'PISTOL' }),
        shotgun: Object.freeze({ damage: 60, range: 5, cooldown: 2000, ammo: 6, color: '#f00', name: 'SHOTGUN' }),
        rifle: Object.freeze({ damage: 40, range: 15, cooldown: 300, ammo: 30, color: '#0f0', name: 'RIFLE' })
    })
});

export const TIPS = [
    "Welcome to NarcotiX V3! Use WASD to move and MOUSE to aim.",
    "Buildings with brown squares are enterable - use [E] to enter for shelter!",
    "Enemies cannot follow you into buildings. Use this tactical advantage wisely.",
    "Different enemy types have unique behaviors: Thugs patrol, Rogues hunt, Police investigate.",
    "BOSS enemies are rare but extremely dangerous - avoid direct confrontation unless well-equipped.",
    "Click [LMB] to fire your current weapon. Each weapon has different stats.",
    "Press [R] to reload your weapon. Reloading takes 2 seconds and leaves you vulnerable.",
    "Switch weapons with [1], [2], [3] for Fists/Pistol/Shotgun/Rifle.",
    "Pills provide various effects: SPEED, STRENGTH, STEALTH, VISION, LUCK, ARMOR, HEALTH.",
    "STEALTH makes you harder to detect. LUCK increases loot quality and cash gains.",
    "Claim territory by moving through areas - more territory means more passive income.",
    "Visit stash houses (cyan squares) to buy/sell pills and upgrade equipment.",
    "Drug labs (magenta tiles) contain rare pills but are heavily guarded.",
    "Terrain affects speed: Streets (+2%), Grass (-2%), Water (-10%).",
    "Your vision range is limited - be cautious when exploring unknown areas.",
    "Enemies need 4 seconds to detect you. Stay out of their range!",
    "Dropped pills appear as green dots - collect them to expand your inventory.",
    "Complete quests to unlock story elements and earn substantial rewards.",
    "Pill prices fluctuate based on rarity and demand in the underground market.",
    "Legendary pills provide the most powerful effects but are extremely rare.",
    "Side effects can be beneficial or harmful - experiment to find optimal combos.",
    "Armor reduces incoming damage by up to 50% but degrades over time.",
    "Environmental hazards like water slow movement but may provide tactical cover.",
    "Time your pill consumption carefully - effects have durations and cooldowns.",
    "The most successful players balance aggression with stealth and resource management.",
    "Use mouse wheel or [1-3] to quickly switch weapons in combat.",
    "Buildings provide 8 seconds of guaranteed safety - plan your escape routes!",
    "Explosions deal damage in an area - use them to hit multiple enemies.",
    "Your crosshair turns red when aiming at an enemy within range.",
    "The underground rewards patience and strategic thinking over reckless action."
];

export const worldToScreenX = (worldX) => worldX * GAME_CONFIG.TILE_SIZE;
export const worldToScreenY = (worldY) => worldY * GAME_CONFIG.TILE_SIZE;
