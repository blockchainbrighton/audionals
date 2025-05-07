// js/player/playerWeapons.js

export const weaponTypes = {
    MELEE: 'melee',
    RANGED: 'ranged',
    UNARMED: 'unarmed',
};

// Base stats for unarmed combat
export const UNARMED_STATS = {
    id: 'unarmed',
    name: "Unarmed",
    type: weaponTypes.UNARMED,
    damage: 2,
    range: null, // Will be set dynamically based on player size or a small default
    attackSpeed: 400, // milliseconds
    char: '', // No specific character for unarmed, player's hands
    description: "Fists and fury.",
    projectileType: null, // For ranged
    ammoCapacity: 0,
    currentAmmo: 0,
};


export const weaponsData = {
    // Melee Weapons
    'stick': {
        id: 'stick', name: "Old Stick", type: weaponTypes.MELEE, damage: 5, rangeMultiplier: 1.2, attackSpeed: 600,
        char: '|', description: "A surprisingly sturdy stick."
    },
    'log': {
        id: 'log', name: "Heavy Log", type: weaponTypes.MELEE, damage: 10, rangeMultiplier: 1.3, attackSpeed: 900,
        char: '▋', description: "Clunky, but packs a punch."
    },
    'crowbar': {
        id: 'crowbar', name: "Crowbar", type: weaponTypes.MELEE, damage: 12, rangeMultiplier: 1.5, attackSpeed: 700,
        char: 'T', description: "Good for prying and... other things."
    },
    'knife': {
        id: 'knife', name: "Combat Knife", type: weaponTypes.MELEE, damage: 8, rangeMultiplier: 1.0, attackSpeed: 350,
        char: '!', description: "Quick and silent."
    },
    'sword': {
        id: 'sword', name: "Katana Shard", type: weaponTypes.MELEE, damage: 18, rangeMultiplier: 1.8, attackSpeed: 650,
        char: '†', description: "A relic from a bygone data-feud."
    },

    // Ranged Weapons
    'pistol': {
        id: 'pistol', name: "9mm Sidearm", type: weaponTypes.RANGED, damage: 10, rangeMultiplier: 8.0, attackSpeed: 500,
        projectileType: 'bullet_light', ammoCapacity: 12, currentAmmo: 12,
        char: '¬', description: "Standard issue, reliable."
    },
    'machine_gun': {
        id: 'machine_gun', name: "Pulse Rifle", type: weaponTypes.RANGED, damage: 7, rangeMultiplier: 12.0, attackSpeed: 100,
        projectileType: 'bullet_light', ammoCapacity: 30, currentAmmo: 30,
        char: '=', description: "High fire rate, chews through targets and ammo."
    }
};

/**
 * Retrieves a copy of weapon data by its ID.
 * Ensures the base TILE_SIZE is incorporated for range.
 * @param {string} weaponId - The ID of the weapon.
 * @param {object} gameConfig - The game's configuration object (for TILE_SIZE).
 * @returns {object|null} Weapon data object or null if not found.
 */
export function getWeaponData(weaponId, gameConfig) {
    if (weaponsData[weaponId]) {
        const data = { ...weaponsData[weaponId] };
        // All weapons need a base range. For melee, it's relative to player size.
        // For ranged, it's a larger multiplier.
        data.baseRange = (gameConfig && gameConfig.TILE_SIZE) ? gameConfig.TILE_SIZE : 32; // Default TILE_SIZE if not provided
        data.effectiveRange = data.baseRange * (data.rangeMultiplier || 1.0);
        
        // Ranged weapons need currentAmmo if not defined (e.g. when first created as an item)
        if (data.type === weaponTypes.RANGED && data.currentAmmo === undefined) {
            data.currentAmmo = data.ammoCapacity;
        }
        return data;
    }
    // For unarmed
    if (weaponId === UNARMED_STATS.id) {
        const unarmedData = { ...UNARMED_STATS };
        unarmedData.range = (gameConfig && gameConfig.TILE_SIZE) ? gameConfig.TILE_SIZE * 0.8 : 25; // Short range for unarmed
        return unarmedData;
    }
    return null;
}

// Example ammo item IDs (these would be defined in your itemManager)
export const ammoItemIds = {
    'bullet_light': 'ammo_light_rounds',
    // 'bullet_heavy': 'ammo_heavy_rounds',
};

/**
 * Placeholder for reloading logic. In a full system, this would consume an ammo item.
 * @param {object} weapon - The weapon object (from player.equippedWeapon).
 * @param {object} player - The player instance (to access inventory).
 * @returns {boolean} True if reload was successful/attempted.
 */
export function reloadWeapon(weapon, player) {
    if (weapon && weapon.type === weaponTypes.RANGED && weapon.currentAmmo < weapon.ammoCapacity) {
        const ammoItemId = ammoItemIds[weapon.projectileType];
        if (ammoItemId && player.hasItem(ammoItemId)) {
            const neededAmmo = weapon.ammoCapacity - weapon.currentAmmo;
            const ammoItem = player.inventory.items.find(i => i.id === ammoItemId);
            const ammoToReload = Math.min(neededAmmo, ammoItem.quantity);

            weapon.currentAmmo += ammoToReload;
            player.removeItem(ammoItemId, ammoToReload);
            player.game.utils.addMessage(`Reloaded ${weapon.name}. ${weapon.currentAmmo}/${weapon.ammoCapacity} rounds.`);
            // Potentially update HUD or weapon display here
            return true;
        } else {
            player.game.utils.addMessage(`No ${ammoItemIds[weapon.projectileType] || 'compatible ammo'} found for ${weapon.name}.`);
            return false;
        }
    }
    player.game.utils.addMessage(`${weapon.name} cannot be reloaded or is full.`);
    return false;
}

// Items that would be created by your itemManager:
// Your itemManager would need to be updated to create items with 'type: "weapon"'
// and 'weaponId: "id_from_weaponsData"'.
// e.g., itemManager.createItem('stick_weapon') -> { id: 'stick_weapon', name: "Old Stick", type: "weapon", weaponId: "stick", ... }
// e.g., itemManager.createItem('ammo_light') -> { id: 'ammo_light_rounds', name: "Light Rounds", type: "ammo", stackable: true, quantity: 20, ...}