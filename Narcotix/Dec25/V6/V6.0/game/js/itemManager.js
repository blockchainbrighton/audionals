// js/itemManager.js
import { TILE_TYPES } from './mapManager.js';
import { WorldItem } from './WorldItem.js'; // Import WorldItem
import * as PWeapons from './player/playerWeapons.js'; // Import playerWeapons module
import { imageLoader } from './imageLoader.js';

export const itemManager = {
    game: null,
    itemDefinitions: {},
    onMapItems: [],
    itemImages: {}, // Cache for local item images

    init: function(gameInstance) {
        this.game = gameInstance;
        this.defineItems();
        this.onMapItems = []; // Clear on init, spawnInitialItems will populate
        this.itemImages = {};
    },

    defineItems: function() {
        this.itemDefinitions = {
            // Consumables & Quest Items (existing)
            'narcotix_pill': { 
                id: 'narcotix_pill', 
                name: "NarcotiX Pill (Generic)", 
                description: "A pill-enabled passport to the bettaverse. Consume for unpredictable effects.", 
                type: 'consumable', 
                buyPrice: 20, 
                sellPrice: 15, 
                stackable: true, 
                nftTraits: { hex1: "#E0E0E0", hex2: "#2196F3" }, // White/Blue for map consistency
                effect: (player) => { 
                    const r = Math.random(); 
                    this.game.utils.addMessage("Pill deployed..."); 
                    
                    // Gang Initiation for Generic Pills (Random)
                    if (!player.gang && this.game.expressionData && this.game.expressionData.length > 0) {
                        const randomGang = this.game.expressionData[Math.floor(Math.random() * this.game.expressionData.length)];
                        // Use generic pill color for initialization visual
                        player.joinExpressionGang(randomGang.ExpressionSymbol, "#2196F3");
                    }

                    if (r < 0.3) { player.applyStatusEffect("System Glitch", 10000); this.game.utils.addMessage("...experiencing input desync!"); } 
                    else if (r < 0.6) {player.heal(10); this.game.utils.addMessage("...positive feedback loop: +10 Vitality.");} 
                    else {player.takeDamage(5); this.game.utils.addMessage("...negative resonance cascade: -5 Vitality!");} 
                }
            },
            'nanite_repair': { id: 'nanite_repair', name: "Nanite Repair Kit", description: "Restores 50 Vitality. Self-administered.", type: 'consumable', buyPrice: 100, sellPrice: 40, stackable: true, effect: (player) => player.heal(50) },
            'adrena_rush_injector': { id: 'adrena_rush_injector', name: "Adrena-Rush Injector", description: "Temporary +50% clock speed. Short burst.", type: 'consumable', buyPrice: 75, sellPrice: 30, stackable: true, effect: (player) => player.applyStatusEffect("C-Burst", 10000, { speedMultiplier: 1.5 }) },
            'kaos_elixir': { id: 'kaos_elixir', name: "Kaos Elixir", description: "Pure, distilled chaos. +30% Speed. ATTRACTS ATTENTION.", type: 'consumable', buyPrice: 150, sellPrice: 60, stackable: false, effect: (player) => { player.applyStatusEffect("Kaos Frenzy", 15000, { speedMultiplier: 1.3 }); }},
            'xdata_fragment': { id: 'xdata_fragment', name: "Corrupted XData Fragment", description: "Highly sensitive, likely illicit. Needed by a Xemist.", type: 'quest_item', buyPrice: 0, sellPrice: 0, stackable: false },
            'walkman': { 
                id: 'walkman', 
                name: "Cyber-Walkman", 
                description: "Personal audio isolation unit. Filters out the world's noise.", 
                type: 'gadget', 
                buyPrice: 500, 
                sellPrice: 200, 
                stackable: false, 
                char: '♫',
                effect: (player) => {
                    player.hasWalkmanActive = !player.hasWalkmanActive;
                    const state = player.hasWalkmanActive ? "ENGAGED" : "DISENGAGED";
                    this.game.utils.addMessage(`Personal Audio Protocol: ${state}`);
                    
                    const controls = document.getElementById('walkmanControls');
                    if (player.hasWalkmanActive) {
                        this.game.showItemDetails(this.itemDefinitions['walkman']);
                        this.game.utils.addMessage("Walkman plays a dynamic soundtrack based on your surroundings.");
                        if(controls) controls.style.display = 'block';
                    } else {
                        if(controls) controls.style.display = 'none';
                    }
                    if (this.game.soundManager) this.game.soundManager.updateMusicState();
                },
                imageUrl: "artwork/walkman.svg",
                nftTraits: {
                    hex1: "#00FFFF", // Cyan
                    hex2: "#FF00FF", // Magenta
                    effect: "Dynamic Audio Environment",
                    sideEffect: "Zone-Based Mood Modulation"
                }
            },

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

                    // --- Integrate NFT Collection ---
                if (this.game.collectionData && this.game.collectionData.length > 0) {
                    const CONTRACT = 'SP8HMQP4Q63V3E6SXXPXZ4WJXA263HBD95QY2AM3.narcotix';
                    this.game.collectionData.forEach(row => {
                        const itemId = `nft_pill_${row.id}`;
                        
                        // Analyze effect description to find taxonomy matches
                        const taxonomyMatches = this.getTaxonomyMatches(row.effect, row.id);

                        // Validate hex colors from CSV
                        const primaryHex = this.game.utils.isValidHexColor(row.hex1) ? row.hex1 : '#FFD700'; // Default to Gold
                        const secondaryHex = this.game.utils.isValidHexColor(row.hex2) ? row.hex2 : '#FFD700'; // Default to Gold

                        this.itemDefinitions[itemId] = {
                            id: itemId,
                            name: row.name || `NarcotiX #${row.id}`,
                            description: row.effect || "A rare substance from the NarcotiX collection.",
                            type: 'consumable', // or 'nft_collectible'
                            buyPrice: 500,
                            sellPrice: 250,
                            stackable: true,
                            nftTraits: { ...row, hex1: primaryHex, hex2: secondaryHex }, // Store validated metadata here
                            imageUrl: `https://assets.hiro.so/api/mainnet/token-metadata-api/${CONTRACT}/${row.id}.png`,
                            char: '⦾',
                            color: primaryHex, // Use validated primary hex for character color
                            effect: (player) => {
                                // Apply the specific effect based on taxonomy
                                this.applyTaxonomyEffect(player, taxonomyMatches, row);
                                
                                // Join Expression Gang (First Pill Only)
                                if (!player.gang && row.expression) {
                                    player.joinExpressionGang(row.expression, row.hex1);
                                }
                                
                                // Always log the flavor text
                                this.game.utils.addMessage(`Consumed ${row.name}.`);
                                if (taxonomyMatches.length > 0) {
                                    // Log the primary effect group for clarity
                                     this.game.utils.addMessage(`Effect: ${taxonomyMatches[0].EffectGroup}`);
                                }
                                
                                if (row.sideEffect) {
                                     // Flavor text for side effect
                                     setTimeout(() => this.game.utils.addMessage(`Side Effect: ${row.sideEffect}`), 1000);
                                }
                            }
                        };
                    });
                    console.log(`[SYS] Integrated ${this.game.collectionData.length} NFT items into ItemManager.`);
                }    },

    /**
     * Finds all matching taxonomy entries for a given effect description.
     * If no matches are found, deterministically selects one based on the item ID.
     */
    getTaxonomyMatches: function(description, itemId) {
        if (!this.game.pillTaxonomy || this.game.pillTaxonomy.length === 0) return [];
        
        const matches = [];
        const descLower = description ? description.toLowerCase() : "";
        
        // 1. Keyword Matching
        if (descLower) {
            for (const entry of this.game.pillTaxonomy) {
                if (!entry.Keywords) continue;
                const keywords = entry.Keywords.split(',').map(k => k.trim().toLowerCase());
                for (const keyword of keywords) {
                    if (keyword) {
                        // Use regex for word boundaries
                        const regex = new RegExp(`\\b${this.game.utils.escapeRegExp(keyword)}\\b`, 'i');
                        if (regex.test(descLower)) {
                            matches.push(entry);
                            break; 
                        }
                    }
                }
            }
        }

        // 2. Deterministic Fallback (if no matches)
        if (matches.length === 0 && itemId) {
            // Extract numeric part of ID if it's a string like "nft_pill_123"
            const numericId = parseInt(itemId.toString().replace(/\D/g, '')) || 0;
            const index = numericId % this.game.pillTaxonomy.length;
            matches.push(this.game.pillTaxonomy[index]);
            // Optional: Mark as fallback?
        }

        return matches;
    },

        /**
         * Applies the game mechanics for a specific taxonomy group.
         */
        applyTaxonomyEffect: function(player, taxonomyEntries, originalRow) {
            if (!taxonomyEntries || taxonomyEntries.length === 0) {
                // Should not happen with fallback, but safe default
                player.heal(15);
                this.game.utils.addMessage("System stability restored (+15 Vitality).");
                return;
            }
    
            // Apply all matched effects
            taxonomyEntries.forEach(entry => {
                const group = entry.EffectGroup;
                
                // Map EffectGroup to actual code
                switch (group) {
                    case 'BERSERK_RAGE':
                        player.applyStatusEffect("Berserk", 15000, { damageMultiplier: 2.0 });
                        this.game.utils.addMessage("RAGE LEVELS CRITICAL!");
                        break;
                    case 'SPEED_FREAK':
                        player.applyStatusEffect("Speed Boost", 15000, { speedMultiplier: 1.5 });
                        break;
                    case 'TANK_MODE':
                        player.applyStatusEffect("Iron Skin", 20000, { defenseMultiplier: 0.5, speedMultiplier: 0.8 });
                        this.game.utils.addMessage("Defense Systems Maximized.");
                        break;
                                     case 'GHOST_SIGHT':
                                         // Phasing Mode
                                         player.applyStatusEffect("Ghost Mode", 15000, { collisionMode: 'GHOST', visionMod: true }); 
                                         this.game.utils.addMessage("Phase-shift enabled. Walls are suggestions.");
                                         break;
                                     case 'NATURE_WALK':
                                         player.heal(30);
                                         this.game.utils.addMessage("Bio-systems regenerating rapidly.");
                                         break;
                                     case 'TECH_WIZ':
                                         // Reset ability cooldowns
                                         if (player.abilities) {
                                             player.abilities.forEach(ab => ab.lastUsedTime = Date.now() - ab.cooldown);
                                             player.updateAbilityStatusDisplay();
                                         }
                                         this.game.utils.addMessage("Subroutines Re-initialized.");
                                         break;
                                     case 'FLIGHT_RISK':
                                          // Flight Mode
                                          player.applyStatusEffect("Anti-Grav", 15000, { collisionMode: 'FLIGHT', speedMultiplier: 1.2 });
                                          this.game.utils.addMessage("Gravity tethers loosened.");
                                          break;
                                     case 'TOXIC_TOUCH':
                                         player.takeDamage(5);
                                         player.applyStatusEffect("Toxic Aura", 20000, { damageAura: 5 }); 
                                         this.game.utils.addMessage("Emitting toxic radiation...");
                                         break;
                                     case 'TIME_WARP':
                                         // Time Dilation
                                         player.applyStatusEffect("Time Dilation", 10000, { timeScale: 0.2, speedMultiplier: 2.0 }); 
                                         this.game.utils.addMessage("Time perception dilated.");
                                         break;
                                     case 'GLUTTONY':
                                         player.heal(50);
                                         player.applyStatusEffect("Sluggish", 10000, { speedMultiplier: 0.7 });
                                         break;
                                     case 'LUCKY_DIP':
                                         // Give money or take money
                                         if (Math.random() > 0.5) {
                                             player.money += 100;
                                             this.game.utils.addMessage("Windfall detected! +100 Creds.");
                                         } else {
                                             player.money = Math.max(0, player.money - 50);
                                             this.game.utils.addMessage("Wallet integrity compromised! -50 Creds.");
                                         }
                                         break;
                                     case 'PYRO':
                                         player.applyStatusEffect("Inferno", 20000, { damageMultiplier: 1.5, damageAura: 8 }); // Fire aura
                                         this.game.utils.addMessage("Weapon systems superheated.");
                                         break;
                                     case 'FROST_BITE':
                                          player.applyStatusEffect("Coolant Leak", 15000, { speedMultiplier: 1.2 }); // Paradoxical boost?
                                          this.game.utils.addMessage("System temperatures dropping.");
                                          break;
                                     case 'MIDAS_TOUCH':
                                         player.money += 200;
                                         this.game.utils.addMessage("Matter transmutation complete. +200 Creds.");
                                         break;
                                     case 'PSYCHIC_WAVE':
                                         // Reveal map?
                                         this.game.utils.addMessage("Map data decrypted.");
                                         // Implement map reveal logic if possible, or just a buff
                                         player.applyStatusEffect("Psychic", 20000, { visionMod: true }); 
                                         break;
                                      case 'SHAPE_SHIFTER':
                                         // Random stats shuffle
                                         const r = Math.random();
                                         if (r < 0.33) {
                                              player.applyStatusEffect("Small Form", 20000, { speedMultiplier: 1.4, defenseMultiplier: 1.5, renderScale: 0.6 });
                                         } else if (r < 0.66) {
                                             player.applyStatusEffect("Giant Form", 20000, { damageMultiplier: 1.5, speedMultiplier: 0.6, renderScale: 1.8 });
                                         } else {
                                              player.heal(100); // Full restore
                                         }
                                         this.game.utils.addMessage("Morphology reconfigured.");
                                         break;
                                     case 'TRIVIA_GOD':
                                         player.earnMoney(50); // Hypothetical XP function replaced by Money
                                         this.game.utils.addMessage("Knowledge database expanded. +50 Creds");
                                         break;
                                     case 'SUMMONER':
                                         this.game.utils.addMessage("Minion protocol not found... spawning decoy.");
                                         // Spawn a visual effect or just heal for now
                                         player.heal(10);
                                         break;
                                      case 'AQUATIC':
                                         player.applyStatusEffect("Hydro-Dynamic", 30000, { speedMultiplier: 1.3 });
                                         this.game.utils.addMessage("Optimized for fluid dynamics.");
                                         break;
                                     case 'UNSTOPPABLE':
                                         player.heal(25);
                                         player.applyStatusEffect("Juggernaut", 15000, { defenseMultiplier: 0.2 }); // 80% reduction
                                         break;
                                     case 'MAGNETISM': // Added case for Magnetism
                                         player.applyStatusEffect("Loot Magnet", 30000, { magneticRange: 200 });
                                         this.game.utils.addMessage("Magnetic Field Generator active.");
                                         break;                    
                    default:
                        // Fallback for known groups that aren't fully implemented yet
                        player.heal(20);
                        this.game.utils.addMessage(`System stabilized.`);
                        break;
                }
            });
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
        if (def.nftTraits && def.nftTraits.id) imageLoader.preload(def.nftTraits.id);
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

        const totalItemsToSpawn = 200; // Scaled for 250x250 map

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
                            ...iDef,
                            x: itemSpawnX, y: itemSpawnY, width: itemWidth, height: itemHeight,
                            quantity: iDef.stackable ? (Math.floor(Math.random() * (iDef.type === 'ammo' ? 20 : 3)) + 1) : 1
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
                            color: this.game.config.COLORS.ITEM_WEAPON,
                            // For ranged weapons on map, they could have partial ammo
                            ...(weaponData.type === PWeapons.weaponTypes.RANGED && {
                                currentAmmo: Math.floor(Math.random() * (weaponData.ammoCapacity + 1))
                            })
                        };
                    }
                }
                if (mapItemEntry) {
                    const newItem = new WorldItem(this.game, mapItemEntry.x, mapItemEntry.y, mapItemEntry.width, mapItemEntry.height, mapItemEntry);
                    this.onMapItems.push(newItem);
                    if (this.game.entities) this.game.entities.push(newItem);
                }
            }
        }

        // --- Spawn NFT Collectibles ---
        if (this.game.collectionData && this.game.collectionData.length > 0) {
            const nftCount = 100; // Scaled for 250x250 map
            for (let i = 0; i < nftCount; i++) {
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

                     // Pick a random NFT
                     const randomNft = this.game.collectionData[Math.floor(Math.random() * this.game.collectionData.length)];
                     imageLoader.preload(randomNft.id); // Preload image
                     const itemId = `nft_pill_${randomNft.id}`;
                     const iDef = this.itemDefinitions[itemId];

                     if (iDef) {
                         const nftEntry = {
                             ...iDef,
                             x: itemSpawnX, y: itemSpawnY, width: itemWidth, height: itemHeight,
                             quantity: 1
                         };
                         const newNftItem = new WorldItem(this.game, itemSpawnX, itemSpawnY, itemWidth, itemHeight, nftEntry);
                         this.onMapItems.push(newNftItem);
                         if (this.game.entities) this.game.entities.push(newNftItem);
                     }
                 }
            }
        }
    },

    updateItemsOnMap: function(dt) { 
        // Sync check: remove items from onMapItems if they are marked for deletion (handled by game loop)
        this.onMapItems = this.onMapItems.filter(i => !i.markedForDeletion);
    },

    renderItemsOnMap: function() {
        // Deprecated: Handled by Unified Render Loop in game.js
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
            if (itemToRemove.markedForDeletion !== undefined) {
                itemToRemove.markedForDeletion = true;
            }
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
            ...itemObject,
            x: x, y: y,
            width: TILE_SIZE * 0.8, height: TILE_SIZE * 0.8
        };

        if (itemObject.type === 'weapon' && itemObject.weaponId) {
            const weaponData = PWeapons.getWeaponData(itemObject.weaponId, this.game.config);
            mapItemEntry.char = weaponData?.char || 'W';
            mapItemEntry.color = this.game.config.COLORS.ITEM_WEAPON;
        }

        const newItem = new WorldItem(this.game, mapItemEntry.x, mapItemEntry.y, mapItemEntry.width, mapItemEntry.height, mapItemEntry);
        this.onMapItems.push(newItem);
        if (this.game.entities) this.game.entities.push(newItem);

        this.game.utils.addMessage(`${itemObject.name} dropped.`);
    }
};