// js/itemManager.js
import { TILE_TYPES } from './mapManager.js';
import * as PWeapons from './player/playerWeapons.js'; // Import playerWeapons module

export const itemManager = {
    game: null,
    itemDefinitions: {},
    onMapItems: [],

    init: function(gameInstance) {
        this.game = gameInstance;
        this.defineItems();
        this.onMapItems = []; // Clear on init, spawnInitialItems will populate
    },

    defineItems: function() {
        this.itemDefinitions = {
            // Consumables & Quest Items (existing)
            'narcotix_pill': { id: 'narcotix_pill', name: "NarcotiX Pill (Generic)", description: "A pill-enabled passport to the bettaverse. Consume for unpredictable effects.", type: 'consumable', buyPrice: 20, sellPrice: 15, stackable: true, effect: (player) => { const r = Math.random(); this.game.utils.addMessage("Pill deployed..."); if (r < 0.3) { player.applyStatusEffect("System Glitch", 10000); this.game.utils.addMessage("...experiencing input desync!"); } else if (r < 0.6) {player.heal(10); this.game.utils.addMessage("...positive feedback loop: +10 Vitality.");} else {player.takeDamage(5); this.game.utils.addMessage("...negative resonance cascade: -5 Vitality!");} }},
            'nanite_repair': { id: 'nanite_repair', name: "Nanite Repair Kit", description: "Restores 50 Vitality. Self-administered.", type: 'consumable', buyPrice: 100, sellPrice: 40, stackable: true, effect: (player) => player.heal(50) },
            'adrena_rush_injector': { id: 'adrena_rush_injector', name: "Adrena-Rush Injector", description: "Temporary +50% clock speed. Short burst.", type: 'consumable', buyPrice: 75, sellPrice: 30, stackable: true, effect: (player) => player.applyStatusEffect("C-Burst", 10000, { speedMultiplier: 1.5 }) },
            'kaos_elixir': { id: 'kaos_elixir', name: "Kaos Elixir", description: "Pure, distilled chaos. +30% Speed. ATTRACTS ATTENTION.", type: 'consumable', buyPrice: 150, sellPrice: 60, stackable: false, effect: (player) => { player.applyStatusEffect("Kaos Frenzy", 15000, { speedMultiplier: 1.3 }); }},
            'xdata_fragment': { id: 'xdata_fragment', name: "Corrupted XData Fragment", description: "Highly sensitive, likely illicit. Needed by a Xemist.", type: 'quest_item', buyPrice: 0, sellPrice: 0, stackable: false },

            // Ammo Definitions
            [PWeapons.ammoItemIds.bullet_light]: { // e.g., 'ammo_light_rounds'
                id: PWeapons.ammoItemIds.bullet_light,
                name: "Light Firearm Rounds",
                description: "Standard kinetic slugs for light firearms.",
                type: 'ammo',
                stackable: true,
                buyPrice: 50, // For a stack, or per bullet? Let's say for a clip/pack.
                sellPrice: 20,
                char: '∙', // Character for ammo on map
            },
            // Add more ammo types here if needed, e.g., for 'bullet_heavy'
            // [PWeapons.ammoItemIds.bullet_heavy]: { ... }
        };
    },

    /**
     * Creates a standard item instance from itemDefinitions.
     * @param {string} id - The ID of the item in itemDefinitions.
     * @param {number} [quantity=1] - The quantity for stackable items.
     * @returns {object|null} The item object or null if definition not found.
     */
    createItemById: function(id, quantity = 1) {
        const def = this.itemDefinitions[id];
        if (!def) {
            console.warn(`Item definition not found for ID: ${id}`);
            return null;
        }
        return { ...def, quantity: def.stackable ? quantity : 1 };
    },

    /**
     * Creates a weapon item instance.
     * Weapon stats are sourced from playerWeapons.js.
     * @param {string} weaponId - The ID of the weapon from playerWeapons.weaponsData.
     * @returns {object|null} The weapon item object or null if weapon data not found.
     */
    createWeaponItem: function(weaponId) {
        const weaponStats = PWeapons.getWeaponData(weaponId, this.game.config);
        if (!weaponStats) {
            console.warn(`Weapon data not found for weaponId: ${weaponId}`);
            return null;
        }
        return {
            id: `${weaponId}_item`, // Unique item ID for inventory system (e.g., 'pistol_item')
            name: weaponStats.name,
            type: 'weapon', // Crucial for inventory logic
            weaponId: weaponId, // Link to the actual weapon stats in playerWeapons.js
            description: weaponStats.description,
            stackable: false,
            // Item-specific properties like buy/sell price could be added here or in a separate mapping
            buyPrice: weaponStats.buyPrice || 100, // Example default
            sellPrice: weaponStats.sellPrice || 40, // Example default
            char: weaponStats.char, // For map rendering if needed, though often weapons use their specific char

            // For ranged weapons, initialize ammo state on the item instance
            ...(weaponStats.type === PWeapons.weaponTypes.RANGED && {
                currentAmmo: weaponStats.ammoCapacity, // Full ammo when first created as an item
                ammoCapacity: weaponStats.ammoCapacity,
                projectileType: weaponStats.projectileType,
            }),
        };
    },

    /**
     * Creates an ammo item instance.
     * This is essentially a specialized wrapper around createItemById for ammo.
     * @param {string} ammoTypeId - The ID of the ammo type from itemDefinitions (e.g., PWeapons.ammoItemIds.bullet_light).
     * @param {number} quantity - The number of rounds.
     * @returns {object|null} The ammo item object or null.
     */
    createAmmoItem: function(ammoTypeId, quantity) {
        const ammoDef = this.itemDefinitions[ammoTypeId];
        if (!ammoDef || ammoDef.type !== 'ammo') {
            console.warn(`Ammo definition not found or not of type 'ammo' for: ${ammoTypeId}`);
            return null;
        }
        return { ...ammoDef, quantity: quantity };
    },

    spawnInitialItems: function() {
        this.onMapItems = [];
        const TILE_SIZE = this.game.config.TILE_SIZE;
        const MAP_WIDTH_TILES = this.game.config.MAP_WIDTH_TILES;
        const MAP_HEIGHT_TILES = this.game.config.MAP_HEIGHT_TILES;

        const spawnableGenericItems = Object.keys(this.itemDefinitions)
            .filter(id => this.itemDefinitions[id].type === 'consumable' || this.itemDefinitions[id].type === 'ammo'); // Include ammo

        const spawnableWeaponIds = Object.keys(PWeapons.weaponsData);

        const totalItemsToSpawn = 30; // Increased for more variety

        for (let i = 0; i < totalItemsToSpawn; i++) {
            let rX, rY, tileDataForSpawn, attempts = 0;
            do {
                rX = Math.floor(Math.random() * MAP_WIDTH_TILES);
                rY = Math.floor(Math.random() * MAP_HEIGHT_TILES);
                tileDataForSpawn = this.game.mapManager.getTileData(rX, rY);
                attempts++;
            } while ((this.game.mapManager.isColliding(rX * TILE_SIZE, rY * TILE_SIZE) ||
                     (tileDataForSpawn && tileDataForSpawn.type === TILE_TYPES.COOLANT_RESERVOIR)) && attempts < 20);

            if (attempts < 20) {
                const itemSpawnX = rX * TILE_SIZE + TILE_SIZE * 0.1;
                const itemSpawnY = rY * TILE_SIZE + TILE_SIZE * 0.1;
                const itemWidth = TILE_SIZE * 0.8;
                const itemHeight = TILE_SIZE * 0.8;

                let mapItemEntry = null;
                const spawnTypeRoll = Math.random();

                if (spawnTypeRoll < 0.6 && spawnableGenericItems.length > 0) { // 60% chance for generic/ammo
                    const rId = spawnableGenericItems[Math.floor(Math.random() * spawnableGenericItems.length)];
                    const iDef = this.itemDefinitions[rId];
                    if (iDef) {
                        mapItemEntry = {
                            type: iDef.type, // 'consumable' or 'ammo'
                            id: rId, // Item definition ID
                            x: itemSpawnX, y: itemSpawnY, width: itemWidth, height: itemHeight,
                            name: iDef.name,
                            quantity: iDef.stackable ? (Math.floor(Math.random() * (iDef.type === 'ammo' ? 20 : 3)) + 1) : 1,
                            char: iDef.char || '?', // Use defined char or fallback
                        };
                    }
                } else if (spawnableWeaponIds.length > 0) { // 40% chance for weapon
                    const rWeaponId = spawnableWeaponIds[Math.floor(Math.random() * spawnableWeaponIds.length)];
                    const weaponData = PWeapons.getWeaponData(rWeaponId, this.game.config);
                    if (weaponData) {
                        mapItemEntry = {
                            type: 'weapon',
                            weaponId: rWeaponId, // ID from playerWeapons.js
                            x: itemSpawnX, y: itemSpawnY, width: itemWidth, height: itemHeight,
                            name: weaponData.name,
                            char: weaponData.char, // Character for the weapon
                            // For ranged weapons on map, they could have partial ammo
                            ...(weaponData.type === PWeapons.weaponTypes.RANGED && {
                                currentAmmo: Math.floor(Math.random() * (weaponData.ammoCapacity + 1))
                            })
                        };
                    }
                }
                if (mapItemEntry) {
                    this.onMapItems.push(mapItemEntry);
                }
            }
        }
    },

    updateItemsOnMap: function(dt) { /* Currently no update logic */ },

    renderItemsOnMap: function() {
        this.onMapItems.forEach(item => {
            if (item.x + this.game.config.TILE_SIZE > this.game.camera.x &&
                item.x < this.game.camera.x + this.game.camera.width &&
                item.y + this.game.config.TILE_SIZE > this.game.camera.y &&
                item.y < this.game.camera.y + this.game.camera.height) {

                let charToRender = '?'; // Default character

                // Determine character based on item type and ID
                if (item.type === 'weapon') {
                    charToRender = item.char || PWeapons.getWeaponData(item.weaponId, this.game.config)?.char || 'W';
                } else if (item.type === 'ammo') {
                    charToRender = this.itemDefinitions[item.id]?.char || 'a';
                } else if (item.type === 'consumable') {
                    // Your existing logic for consumables:
                    if(item.id === 'nanite_repair') charToRender='+';
                    else if(item.id.includes('pill')) charToRender='⦾';
                    else if(item.id.includes('adrena_rush') || item.id.includes('injector')) charToRender='>';
                    else if(item.id.includes('kaos')) charToRender='!';
                    else charToRender = this.itemDefinitions[item.id]?.char || 'c';
                } else if (item.type === 'quest_item') {
                    if(item.id.includes('xdata')) charToRender='Җ';
                    else charToRender = this.itemDefinitions[item.id]?.char || 'q';
                }
                // Allow override for event items if you re-introduce that concept
                // if (item.isEventItem && item.char) charToRender = item.char;


                this.game.ctx.fillStyle = item.color || (item.type === 'weapon' ? '#CCC' : (item.type === 'ammo' ? '#FAD02C' : '#0FF'));
                this.game.ctx.font = `${this.game.config.TILE_SIZE*0.7}px Arial`;
                this.game.ctx.textAlign = 'center';
                this.game.ctx.textBaseline = 'middle';
                this.game.ctx.fillText(charToRender, item.x + item.width/2, item.y + item.height/2 + this.game.config.TILE_SIZE*0.1);
            }
        });
    },

    /**
     * Removes an item from the onMapItems array.
     * Typically called by playerInventory after picking up an item.
     * @param {object} itemToRemove - The reference to the item object in onMapItems.
     */
    removeItemFromMap: function(itemToRemove) {
        const index = this.onMapItems.indexOf(itemToRemove);
        if (index > -1) {
            this.onMapItems.splice(index, 1);
        }
    },

    /**
     * Drops an item from player inventory onto the map.
     * @param {object} itemObject - The full item object from player's inventory.
     * @param {number} x - The x-coordinate to drop the item.
     * @param {number} y - The y-coordinate to drop the item.
     */
    dropItem: function(itemObject, x, y) {
        if (!itemObject) return;

        const TILE_SIZE = this.game.config.TILE_SIZE;
        let mapItemEntry = {
            type: itemObject.type,
            x: x, y: y,
            width: TILE_SIZE * 0.8, height: TILE_SIZE * 0.8,
            name: itemObject.name,
            char: itemObject.char || '?', // Get char from itemObject if available
        };

        if (itemObject.type === 'weapon' && itemObject.weaponId) {
            mapItemEntry.weaponId = itemObject.weaponId;
            const weaponData = PWeapons.getWeaponData(itemObject.weaponId, this.game.config);
            mapItemEntry.char = weaponData?.char || 'W';
            if (weaponData?.type === PWeapons.weaponTypes.RANGED) {
                mapItemEntry.currentAmmo = itemObject.currentAmmo; // Preserve current ammo
            }
        } else if (itemObject.type === 'ammo' || itemObject.stackable) {
            mapItemEntry.id = itemObject.id;
            mapItemEntry.quantity = itemObject.quantity;
            mapItemEntry.char = this.itemDefinitions[itemObject.id]?.char || 'i';
        } else { // Non-stackable generic items
            mapItemEntry.id = itemObject.id;
            mapItemEntry.quantity = 1;
            mapItemEntry.char = this.itemDefinitions[itemObject.id]?.char || 'i';
        }

        this.onMapItems.push(mapItemEntry);
        this.game.utils.addMessage(`${itemObject.name} dropped.`);
    }
};