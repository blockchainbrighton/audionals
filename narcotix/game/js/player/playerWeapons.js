// js/player/playerWeapons.js

export const weaponTypes = {
    MELEE: 'melee',
    RANGED: 'ranged',
    UNARMED: 'unarmed',
};

export const UNARMED_STATS = {
    id: 'unarmed',
    name: "Unarmed",
    type: weaponTypes.UNARMED,
    damage: 2,
    range: null, 
    attackSpeed: 400, 
    char: '', 
    description: "Fists and fury.",
    projectileType: null, 
    ammoCapacity: 0,
    currentAmmo: 0,
    color: '#FFF' // Unused for unarmed char, but consistent
};


export const weaponsData = {
    // Melee Weapons
    'stick': {
        id: 'stick', name: "Old Stick", type: weaponTypes.MELEE, damage: 5, rangeMultiplier: 1.2, attackSpeed: 600,
        char: '|', description: "A surprisingly sturdy stick.", color: '#A84'
    },
    'log': {
        id: 'log', name: "Heavy Log", type: weaponTypes.MELEE, damage: 10, rangeMultiplier: 1.3, attackSpeed: 900,
        char: '▋', description: "Clunky, but packs a punch.", color: '#654'
    },
    'crowbar': {
        id: 'crowbar', name: "Crowbar", type: weaponTypes.MELEE, damage: 12, rangeMultiplier: 1.5, attackSpeed: 700,
        char: 'T', description: "Good for prying and... other things.", color: '#D33'
    },
    'knife': {
        id: 'knife', name: "Combat Knife", type: weaponTypes.MELEE, damage: 8, rangeMultiplier: 1.0, attackSpeed: 350,
        char: '!', description: "Quick and silent.", color: '#CCC'
    },
    'sword': {
        id: 'sword', name: "Katana Shard", type: weaponTypes.MELEE, damage: 18, rangeMultiplier: 1.8, attackSpeed: 650,
        char: '†', description: "A relic from a bygone data-feud.", color: '#AEF'
    },

    // Ranged Weapons
    'pistol': {
        id: 'pistol', name: "9mm Sidearm", type: weaponTypes.RANGED, damage: 10, rangeMultiplier: 10.0, attackSpeed: 450, // Slightly increased range, speed
        projectileType: 'bullet_light', ammoCapacity: 12, currentAmmo: 12,
        char: '¬', description: "Standard issue, reliable.", color: '#BBB', projectileColor: '#FF0', accuracyCone: 0.20 // radians, smaller is more accurate
    },
    'machine_gun': {
        id: 'machine_gun', name: "Pulse Rifle", type: weaponTypes.RANGED, damage: 7, rangeMultiplier: 15.0, attackSpeed: 100,
        projectileType: 'bullet_light', ammoCapacity: 30, currentAmmo: 30,
        char: '=', description: "High fire rate, chews through targets and ammo.", color: '#8F8', projectileColor: '#0F0', accuracyCone: 0.35
    }
};

export function getWeaponData(weaponId, gameConfig) {
    let data = null;
    if (weaponsData[weaponId]) {
        data = { ...weaponsData[weaponId] };
    } else if (weaponId === UNARMED_STATS.id) {
        data = { ...UNARMED_STATS };
    }

    if (data) {
        data.baseRange = (gameConfig && gameConfig.TILE_SIZE) ? gameConfig.TILE_SIZE : 32;
        if (data.type === weaponTypes.UNARMED) {
            data.effectiveRange = data.baseRange * 0.8; // Unarmed always short
        } else {
            data.effectiveRange = data.baseRange * (data.rangeMultiplier || 1.0);
        }
        
        if (data.type === weaponTypes.RANGED && data.currentAmmo === undefined) {
            data.currentAmmo = data.ammoCapacity;
        }
        return data;
    }
    return null;
}

export const ammoItemIds = {
    'bullet_light': 'ammo_light_rounds',
    'bullet_heavy': 'ammo_heavy_rounds', // Example if you add heavy weapons
};

export function reloadWeapon(weapon, player) {
    if (weapon && weapon.type === weaponTypes.RANGED && weapon.currentAmmo < weapon.ammoCapacity) {
        const ammoItemId = ammoItemIds[weapon.projectileType];
        if (!ammoItemId) {
            player.game.utils.addMessage(`No ammo definition for ${weapon.projectileType}.`);
            return false;
        }
        if (player.hasItem(ammoItemId)) {
            const neededAmmo = weapon.ammoCapacity - weapon.currentAmmo;
            const ammoItem = player.inventory.items.find(i => i.id === ammoItemId);
            const ammoToReload = Math.min(neededAmmo, ammoItem.quantity);

            weapon.currentAmmo += ammoToReload;
            player.removeItem(ammoItemId, ammoToReload);
            player.game.utils.addMessage(`Reloaded ${weapon.name}. ${weapon.currentAmmo}/${weapon.ammoCapacity} rounds.`);
            return true;
        } else {
            player.game.utils.addMessage(`No ${ammoItemId} found for ${weapon.name}.`);
            return false;
        }
    }
    if (weapon && weapon.currentAmmo >= weapon.ammoCapacity) {
         player.game.utils.addMessage(`${weapon.name} is already full.`);
    } else if(weapon) {
         player.game.utils.addMessage(`${weapon.name} cannot be reloaded.`);
    }
    return false;
}