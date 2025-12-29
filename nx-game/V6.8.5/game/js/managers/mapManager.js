// TILE_TYPES and TILE_PROPERTIES are defined here as they are specific to mapManager
export const TILE_TYPES = { EMPTY: 0, DATA_STREAM: 1, LOW_REZ_PLAIN: 2, FIREWALL: 3, SECURE_DATA_SILO_WALL: 4, EXCHANGE_NODE_ENTRANCE: 5, EXCHANGE_INTERIOR: 6, XLOUNGE_STASH_ENTRANCE: 7, XLOUNGE_INTERIOR: 8, HOSTILE_SPAWN_VECTOR: 9, DATA_FRAGMENT_SPAWN: 10, XEMIST_CONTACT_POINT: 11, COOLANT_RESERVOIR: 12, BAR_ENTRANCE: 13, ARMOURY_ENTRANCE: 14, CASINO_ENTRANCE: 15, BAR_INTERIOR: 16, ARMOURY_INTERIOR: 17, CASINO_INTERIOR: 18, BAR_COUNTER: 19, ARMOURY_COUNTER: 20, CASINO_COUNTER: 21, SLOTS_MACHINE: 22, ROULETTE_TABLE: 23, HIGHLOW_TABLE: 24, BARRICADE: 25 };

export const TILE_PROPERTIES = {
    [TILE_TYPES.EMPTY]: { color: '#050505', collision: true, speedModifier: 0 },
    [TILE_TYPES.DATA_STREAM]: { color: '#666', collision: false, speedModifier: 1.2 },
    [TILE_TYPES.LOW_REZ_PLAIN]: { color: '#353', collision: false, speedModifier: 0.8 },
    [TILE_TYPES.FIREWALL]: { color: '#444', collision: true, speedModifier: 0 },
    [TILE_TYPES.SECURE_DATA_SILO_WALL]: { color: '#503020', collision: true, speedModifier: 0 },
    [TILE_TYPES.EXCHANGE_NODE_ENTRANCE]: { color: '#0FF', collision: false, speedModifier: 1, interactive: true, type: 'exchange_node' },
    [TILE_TYPES.EXCHANGE_INTERIOR]: { color: '#223', collision: false, speedModifier: 1 },
    [TILE_TYPES.XLOUNGE_STASH_ENTRANCE]: { color: '#F0F', collision: false, speedModifier: 1, interactive: true, type: 'xlounge_stash' },
    [TILE_TYPES.XLOUNGE_INTERIOR]: { color: '#303', collision: false, speedModifier: 1, restricted: true },
    [TILE_TYPES.HOSTILE_SPAWN_VECTOR]: { color: '#300', collision: false, speedModifier: 1 },
    [TILE_TYPES.DATA_FRAGMENT_SPAWN]: { color: '#003', collision: false, speedModifier: 1 },
    [TILE_TYPES.XEMIST_CONTACT_POINT]: { color: '#DD0', collision: false, speedModifier: 1, interactive: true, type: 'xemist_contact' },
    [TILE_TYPES.COOLANT_RESERVOIR]: { color: '#118', collision: true, speedModifier: 0 },
    
    // Entrances (Walkable, Non-Interactive triggers)
    [TILE_TYPES.BAR_ENTRANCE]: { color: '#D60', collision: false, speedModifier: 1 },
    [TILE_TYPES.ARMOURY_ENTRANCE]: { color: '#D00', collision: false, speedModifier: 1 },
    [TILE_TYPES.CASINO_ENTRANCE]: { color: '#0D0', collision: false, speedModifier: 1 },
    
    // Interiors (Walkable, Restricted)
    [TILE_TYPES.BAR_INTERIOR]: { color: '#210', collision: false, speedModifier: 1, restricted: true },
    [TILE_TYPES.ARMOURY_INTERIOR]: { color: '#200', collision: false, speedModifier: 1, restricted: true },
    [TILE_TYPES.CASINO_INTERIOR]: { color: '#020', collision: false, speedModifier: 1, restricted: true },
    
    // Counters (No Collision for Overlap Interaction, Interactive)
    [TILE_TYPES.BAR_COUNTER]: { color: '#F80', collision: false, interactive: true, type: 'bar' },
    [TILE_TYPES.ARMOURY_COUNTER]: { color: '#F00', collision: false, interactive: true, type: 'armoury' },
    [TILE_TYPES.CASINO_COUNTER]: { color: '#0F0', collision: false, interactive: true, type: 'casino' },
    
    // Casino Games
    [TILE_TYPES.SLOTS_MACHINE]: { color: '#D4AF37', collision: false, interactive: true, type: 'casino_slots' },
    [TILE_TYPES.ROULETTE_TABLE]: { color: '#C41E3A', collision: false, interactive: true, type: 'casino_roulette' },
    [TILE_TYPES.HIGHLOW_TABLE]: { color: '#0047AB', collision: false, interactive: true, type: 'casino_highlow' },

    // Barricade: collision is false because solid state is handled by requiredFlag in isColliding
    [TILE_TYPES.BARRICADE]: { color: '#F00', collision: false, speedModifier: 1.0, requiredFlag: 'shop_central_exchange' }
};

export const mapManager = {
    data: [], // Active map data
    maps: {}, // All maps storage
    currentMapId: 'overworld',
    game: null,

    init: function(gameInstance) {
        this.game = gameInstance;
        this.data = [];
        this.maps = {};
        this.storedMapEntities = {};
        this.currentMapId = 'overworld';
    },

    generateMap: function() {
        const W = this.game.config.MAP_WIDTH_TILES;
        const H = this.game.config.MAP_HEIGHT_TILES;
        const overworld = [];

        // 1. Initialize Base Terrain (Plain)
        for (let r = 0; r < H; r++) {
            overworld[r] = [];
            for (let c = 0; c < W; c++) {
                overworld[r][c] = { type: TILE_TYPES.LOW_REZ_PLAIN };
            }
        }

        // 2. Generate Data Streams (Noise-like)
        // Simple Cellular Automata or just wandering paths
        const numStreams = 40;
        for(let i=0; i<numStreams; i++) {
            let sx = Math.floor(Math.random() * W);
            let sy = Math.floor(Math.random() * H);
            let length = 50 + Math.random() * 100;
            let dirX = (Math.random() - 0.5) * 2;
            let dirY = (Math.random() - 0.5) * 2;
            
            for(let j=0; j<length; j++) {
                const cx = Math.floor(sx);
                const cy = Math.floor(sy);
                if (cx > 1 && cx < W-2 && cy > 1 && cy < H-2) {
                    overworld[cy][cx].type = TILE_TYPES.DATA_STREAM;
                    // Make streams wider
                    if(Math.random() > 0.5) overworld[cy+1][cx].type = TILE_TYPES.DATA_STREAM;
                    if(Math.random() > 0.5) overworld[cy][cx+1].type = TILE_TYPES.DATA_STREAM;
                }
                sx += dirX + (Math.random()-0.5);
                sy += dirY + (Math.random()-0.5);
            }
        }

        // 3. Borders (Firewall)
        for (let r = 0; r < H; r++) {
            for (let c = 0; c < W; c++) {
                if (r === 0 || r === H-1 || c === 0 || c === W-1) {
                    overworld[r][c].type = TILE_TYPES.FIREWALL;
                }
            }
        }

        // 4. Place Structures
        const poiLocations = []; // Store {x, y, id, type} to check distances

        // Helper to find valid spot
        const findSpot = (minDist = 50) => {
            let attempts = 0;
            while(attempts < 1000) {
                const tx = 10 + Math.floor(Math.random() * (W - 20));
                const ty = 10 + Math.floor(Math.random() * (H - 20));
                
                // Check distance
                let tooClose = false;
                for(const poi of poiLocations) {
                    const dist = Math.sqrt(Math.pow(tx - poi.x, 2) + Math.pow(ty - poi.y, 2));
                    if (dist < minDist) { tooClose = true; break; }
                }
                if (!tooClose) return { x: tx, y: ty };
                attempts++;
            }
            return { x: W/2, y: H/2 }; // Fallback
        };

        // Place Safehouse (Center-ish)
        const safehouseX = Math.floor(W/2);
        const safehouseY = Math.floor(H/2);
        poiLocations.push({x: safehouseX, y: safehouseY, id: 'safehouse', type: 'xlounge_stash'});
        
        const safehouseSpawnX = Math.floor(12 / 2);
        const safehouseSpawnY = 10;
        this.placeBuilding(
            overworld,
            safehouseX,
            safehouseY,
            5,
            5,
            TILE_TYPES.XLOUNGE_STASH_ENTRANCE,
            'safehouse_interior',
            TILE_TYPES.XLOUNGE_INTERIOR,
            'xlounge_stash',
            safehouseSpawnX,
            safehouseSpawnY
        );
        this.generateInterior('safehouse_interior', 12, 12, TILE_TYPES.XLOUNGE_INTERIOR, 'safehouse_stash', 'xlounge_stash', safehouseX, safehouseY);

        // 5. Place Police Barricades around Safehouse (Mission 2 constraint)
        const radius = 6;
        for (let r = safehouseY - radius; r <= safehouseY + radius; r++) {
            for (let c = safehouseX - radius; c <= safehouseX + radius; c++) {
                // Circle-ish perimeter
                const dist = Math.sqrt(Math.pow(c - safehouseX, 2) + Math.pow(r - safehouseY, 2));
                if (dist > radius - 1 && dist <= radius) {
                    if (r > 0 && r < H && c > 0 && c < W) {
                        // Don't block the door itself if they are already outside (though they shouldn't be)
                        if (overworld[r][c].type === TILE_TYPES.LOW_REZ_PLAIN || overworld[r][c].type === TILE_TYPES.DATA_STREAM) {
                            overworld[r][c].type = TILE_TYPES.BARRICADE;
                        }
                    }
                }
            }
        }

        // Define other POIs
        const buildings = [
            { id: 'central_exchange', type: 'exchange_node', door: TILE_TYPES.EXCHANGE_NODE_ENTRANCE, floor: TILE_TYPES.EXCHANGE_INTERIOR },
            { id: 'xemist_den', type: 'exchange_node', door: TILE_TYPES.EXCHANGE_NODE_ENTRANCE, floor: TILE_TYPES.EXCHANGE_INTERIOR },
            { id: 'the_glitch_bar', type: 'bar', door: TILE_TYPES.BAR_ENTRANCE, floor: TILE_TYPES.BAR_INTERIOR, requiredFlag: 'zone_casino_district' },
            { id: 'sector_7_armoury', type: 'armoury', door: TILE_TYPES.ARMOURY_ENTRANCE, floor: TILE_TYPES.ARMOURY_INTERIOR, requiredFlag: 'zone_casino_district' },
            { id: 'lucky_hash', type: 'casino', door: TILE_TYPES.CASINO_ENTRANCE, floor: TILE_TYPES.CASINO_INTERIOR, requiredFlag: 'zone_casino_district' }
        ];

        buildings.forEach(b => {
            const loc = findSpot(60); // Minimum 60 tiles apart
            poiLocations.push({x: loc.x, y: loc.y, id: b.id, type: b.type});
            
            // Overworld Footprint
            this.placeBuilding(overworld, loc.x, loc.y, 5, 5, b.door, `${b.id}_interior`, TILE_TYPES.SECURE_DATA_SILO_WALL, b.type, 7, 12, b.requiredFlag);
            
            // Generate Interior Map
            this.generateInterior(`${b.id}_interior`, 14, 14, b.floor, b.id, b.type, loc.x, loc.y);

            // Special Zone initialization for Casino
            if (b.id === 'lucky_hash') {
                this.game.zoneManager.addZone({
                    id: 'zone_casino_district',
                    name: "The High-Roller Sector",
                    x: (loc.x - 10) * this.game.config.TILE_SIZE,
                    y: (loc.y - 10) * this.game.config.TILE_SIZE,
                    width: 20 * this.game.config.TILE_SIZE,
                    height: 20 * this.game.config.TILE_SIZE,
                    isControlledByPlayer: false,
                    enemiesInZone: 0,
                    initialEnemiesToClear: 5,
                    incomeValue: 200
                });
            }
        });

        // Place Codex (Single Tile Interaction)
        const codexLoc = findSpot(40);
        overworld[codexLoc.y][codexLoc.x].type = TILE_TYPES.XEMIST_CONTACT_POINT;
        overworld[codexLoc.y][codexLoc.x].interactionTargetId = 'glitch_codex';
        overworld[codexLoc.y][codexLoc.x].interactionType = 'xemist_contact';

        // 5. Scatter Hostile Spawns & Coolant
        for (let r = 1; r < H-1; r++) {
            for (let c = 1; c < W-1; c++) {
                if (overworld[r][c].type === TILE_TYPES.LOW_REZ_PLAIN) {
                    if (Math.random() < 0.001) overworld[r][c].type = TILE_TYPES.COOLANT_RESERVOIR;
                    if (Math.random() < 0.0005) overworld[r][c].type = TILE_TYPES.HOSTILE_SPAWN_VECTOR;
                }
            }
        }

        this.maps['overworld'] = overworld;
        this.poiLocations = poiLocations;
        
        // Initial State
        this.data = this.maps['safehouse_interior'];
        this.currentMapId = 'safehouse_interior';
    },

    placeBuilding: function(mapData, x, y, w, h, doorTileType, targetMapId, wallType, interactionType, spawnTileX = 7, spawnTileY = 12, requiredFlag = null) {
        // Center x,y is the DOOR
        // Determine top-left
        const tlx = x - Math.floor(w/2);
        const tly = y - (h-1); // Door is usually at bottom

        for(let r = tly; r < tly + h; r++) {
            for(let c = tlx; c < tlx + w; c++) {
                if (r >= 0 && r < mapData.length && c >= 0 && c < mapData[0].length) {
                    mapData[r][c] = { type: wallType }; // Walls/Roof
                }
            }
        }
        // Place Door
        if (y >= 0 && y < mapData.length && x >= 0 && x < mapData[0].length) {
            mapData[y][x] = { 
                type: doorTileType,
                isDoor: true,
                targetMap: targetMapId,
                targetX: spawnTileX, // Interior spawn
                targetY: spawnTileY, // Interior spawn
                interactionType: interactionType, // Set metadata for Minimap/Compass
                requiredFlag: requiredFlag // Store the lock flag
            };
        }
    },

    generateInterior: function(id, w, h, floorType, interactId, interactType, exitX, exitY) {
        const map = [];
        for (let r = 0; r < h; r++) {
            map[r] = [];
            for (let c = 0; c < w; c++) {
                let cell = { type: floorType };
                // Walls
                if (r === 0 || r === h - 1 || c === 0 || c === w - 1) {
                    cell.type = TILE_TYPES.SECURE_DATA_SILO_WALL;
                }
                
                // Door (Exit) at bottom center
                if (r === h - 1 && c === Math.floor(w / 2)) {
                    cell.type = floorType; // Walkable
                    cell.isDoor = true;
                    cell.targetMap = 'overworld';
                    cell.targetX = exitX; // Return to Overworld Door
                    cell.targetY = exitY + 1; // Step out (Down)
                }

                map[r][c] = cell;
            }
        }

        // Place Interactive Objects
        if (interactType === 'casino') {
            // Place 3 Games
            const slotsX = Math.floor(w / 4);
            const rouletteX = Math.floor(w / 2);
            const highLowX = Math.floor(3 * w / 4);
            const row = 3;

            map[row][slotsX] = { type: TILE_TYPES.SLOTS_MACHINE, interactionTargetId: interactId, interactionType: 'casino_slots' };
            map[row][rouletteX] = { type: TILE_TYPES.ROULETTE_TABLE, interactionTargetId: interactId, interactionType: 'casino_roulette' };
            map[row][highLowX] = { type: TILE_TYPES.HIGHLOW_TABLE, interactionTargetId: interactId, interactionType: 'casino_highlow' };

        } else {
            // Standard Single Counter
            const cx = Math.floor(w / 2);
            const cy = 2;
            let type = TILE_TYPES.EXCHANGE_NODE_ENTRANCE; // Default fallback?

            if (interactType === 'xlounge_stash') type = TILE_TYPES.XLOUNGE_STASH_ENTRANCE; 
            else if (interactType === 'exchange_node') type = TILE_TYPES.EXCHANGE_NODE_ENTRANCE;
            else if (interactType === 'bar') type = TILE_TYPES.BAR_COUNTER;
            else if (interactType === 'armoury') type = TILE_TYPES.ARMOURY_COUNTER;
            
            map[cy][cx] = { 
                type: type, 
                interactionTargetId: interactId, 
                interactionType: interactType 
            };
        }

        this.maps[id] = map;
    },

    switchMap: function(mapId, spawnTileX, spawnTileY) {
        if (!this.maps[mapId]) {
            console.error(`Map ${mapId} not found!`);
            return;
        }
        
        this.utils = this.game.utils; // Ensure utils access
        
        // SAVE Current Map Entities
        if (this.currentMapId) {
             this.storedMapEntities[this.currentMapId] = {
                 items: [...this.game.itemManager.onMapItems],
                 enemies: [...this.game.enemyManager.list]
             };
        }

        // Transition Effect (fade?) - handled by game state or simple cut
        this.currentMapId = mapId;
        this.data = this.maps[mapId];

        // Prevent immediate re-entry loop
        this.game.interactionCooldown = Date.now() + 2000;
        
        // Move Player
        this.game.player.x = spawnTileX * this.game.config.TILE_SIZE;
        this.game.player.y = spawnTileY * this.game.config.TILE_SIZE;
        
        // Reset Camera
        this.game.camera.update(this.game.player);
        
        // LOAD New Map Entities
        if (this.storedMapEntities[mapId]) {
            this.game.itemManager.onMapItems = [...this.storedMapEntities[mapId].items];
            this.game.enemyManager.list = [...this.storedMapEntities[mapId].enemies];
        } else {
            this.game.itemManager.onMapItems = [];
            this.game.enemyManager.list = [];
        }
        
        this.game.projectileManager.projectiles = []; // Clear flying bullets
        
        // REBUILD Master Entities List for Rendering
        // This ensures only entities for the CURRENT map are active/visible
        this.game.entities = [
            this.game.player,
            ...this.game.itemManager.onMapItems,
            ...this.game.enemyManager.list
        ].filter(e => e && typeof e.update === 'function');

        this.game.utils.addMessage(`Entered: ${mapId.replace(/_/g, ' ').toUpperCase()}`);
        
        // Play Door Sound?
        if (this.game.soundManager) this.game.soundManager.playUI(); // Generic click/blip

        // Refresh Minimap
        if (this.game.minimap) this.game.minimap.cacheStaticMap();
    },

    render: function() {
        const { startCol, endCol, startRow, endRow } = this.game.getVisibleTiles();
        const tileSize = this.game.config.TILE_SIZE;
        
        // For interior maps, width/height is smaller than Overworld config
        const mapH = this.data.length;
        const mapW = this.data[0].length;

        // Custom bounds for loop
        const sR = Math.max(0, startRow);
        const eR = Math.min(mapH, endRow);
        const sC = Math.max(0, startCol);
        const eC = Math.min(mapW, endCol);
        
        for (let r = sR; r < eR; r++) {
            for (let c = sC; c < eC; c++) {
                const tile = this.data[r][c];
                const tileDef = TILE_PROPERTIES[tile.type] || TILE_PROPERTIES[TILE_TYPES.EMPTY];
                
                // Hide barricade if unlocked
                const requiredFlag = tile.requiredFlag || tileDef.requiredFlag;
                const isUnlocked = requiredFlag && this.game.progression && this.game.progression.checkFlag(requiredFlag);
                
                if (tile.type === TILE_TYPES.BARRICADE && isUnlocked) {
                    // Render base terrain instead of red barricade
                    this.game.ctx.fillStyle = TILE_PROPERTIES[TILE_TYPES.LOW_REZ_PLAIN].color;
                } else {
                    this.game.ctx.fillStyle = tileDef.color;
                }
                
                this.game.ctx.fillRect(c * tileSize, r * tileSize, tileSize, tileSize);

                // Render Location Labels / Doors
                if (tile.interactionType) {
                    this.game.ctx.font = '10px Arial';
                    this.game.ctx.fillStyle = '#FFF';
                    this.game.ctx.textAlign = 'center';
                    this.game.ctx.shadowColor = 'black';
                    this.game.ctx.shadowBlur = 2;
                    let label = "";
                    switch(tile.interactionType) {
                        case 'exchange_node': label = "SHOP"; break;
                        case 'xlounge_stash': label = "STASH"; break;
                        case 'xemist_contact': label = "QUEST"; break;
                        case 'bar': label = "BAR"; break;
                        case 'armoury': label = "GUNS"; break;
                        case 'casino': label = "SLOTS"; break;
                        default: label = "ENTRANCE";
                    }
                    this.game.ctx.fillText(label, c * tileSize + tileSize / 2, r * tileSize - 2);
                    this.game.ctx.shadowBlur = 0; 
                }
                
                // Render Door Labels
                if (tile.isDoor) {
                    this.game.ctx.font = '10px Arial';
                    this.game.ctx.fillStyle = '#FF0';
                    this.game.ctx.textAlign = 'center';
                    this.game.ctx.fillText(tile.targetMap === 'overworld' ? "EXIT" : "ENTER", c * tileSize + tileSize / 2, r * tileSize + tileSize/2);
                }

                // Render Visual Lock (Hologram)
                if (requiredFlag && !this.game.progression.checkFlag(requiredFlag)) {
                    this.game.ctx.strokeStyle = '#F00';
                    this.game.ctx.lineWidth = 2;
                    this.game.ctx.strokeRect(c * tileSize + 2, r * tileSize + 2, tileSize - 4, tileSize - 4);
                    
                    // Add a flickering scanline effect
                    if (Math.random() > 0.5) {
                        this.game.ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
                        this.game.ctx.fillRect(c * tileSize, r * tileSize, tileSize, tileSize);
                    }
                }
            }
        }
    },

    getTilePropertiesAt: function(worldX, worldY) {
        const tileX = Math.floor(worldX / this.game.config.TILE_SIZE);
        const tileY = Math.floor(worldY / this.game.config.TILE_SIZE);
        
        const mapH = this.data.length;
        const mapW = this.data[0].length;

        if (tileX >= 0 && tileX < mapW && tileY >= 0 && tileY < mapH) {
            const tile = this.data[tileY][tileX];
            return TILE_PROPERTIES[tile.type];
        }
        return TILE_PROPERTIES[TILE_TYPES.EMPTY];
    },

    isColliding: function(worldX, worldY) {
        if (!this.data || this.data.length === 0) return true; // Safety

        const tileX = Math.floor(worldX / this.game.config.TILE_SIZE);
        const tileY = Math.floor(worldY / this.game.config.TILE_SIZE);
        
        const mapH = this.data.length;
        const mapW = this.data[0].length;

        if (tileX >= 0 && tileX < mapW && tileY >= 0 && tileY < mapH) {
            const tile = this.data[tileY][tileX];
            const tileDef = TILE_PROPERTIES[tile.type] || TILE_PROPERTIES[TILE_TYPES.EMPTY];
            
            // 1. Check for Required Flags (Barricades, Buildings, Zones)
            const requiredFlag = tile.requiredFlag || tileDef.requiredFlag;
            if (requiredFlag && this.game.progression) {
                if (!this.game.progression.checkFlag(requiredFlag)) {
                    return true; // Flag LOCKED = Solid
                } else {
                    // Flag UNLOCKED = Ignore tileDef.collision for this tile (it's open!)
                    return false; 
                }
            }

            // 2. Safehouse Exit Special Case (for physical blocking)
            if (this.currentMapId === 'safehouse_interior' && tile.targetMap === 'overworld') {
                if (this.game.progression && !this.game.progression.checkFlag('zone_street')) {
                    return true; // Locked = Solid
                }
            }

            // 3. Check for Hard Collision from Tile Properties
            if (tileDef.collision) return true;
        }
        return false;
    },

    isValidTile: function(tileX, tileY) {
        if (!this.data || this.data.length === 0) return false;
        return tileX >= 0 && tileX < this.data[0].length && tileY >= 0 && tileY < this.data.length;
    },

    getTileData: function(tileX, tileY) {
        if (this.isValidTile(tileX, tileY)) {
            return this.data[tileY][tileX];
        }
        return null;
    },

    checkLock: function(tileData) {
        if (!tileData) return false;

        const pCenterX = this.game.player.x + this.game.player.width/2;
        const pCenterY = this.game.player.y + this.game.player.height/2;

        // 1. Check if the tile/zone is locked via progression
        if (tileData.requiredFlag && !this.game.progression.checkFlag(tileData.requiredFlag)) {
            this.game.utils.addMessage(`[ ACCESS DENIED ] - Required: ${tileData.requiredFlag.replace('zone_', '').toUpperCase()}`, '#F00');
            if (this.game.soundManager) this.game.soundManager.playError();
            if (this.game.floatingTextManager) {
                this.game.floatingTextManager.addText(pCenterX, pCenterY - 20, "🔒 LOCKED", "#F00");
            }
            return true; // Is locked
        }

        // 2. Specific logic for 'overworld' access from safehouse
        if (this.currentMapId === 'safehouse_interior' && tileData.targetMap === 'overworld') {
            if (!this.game.progression.checkFlag('zone_street')) {
                this.game.utils.addMessage("[ SECURE LOCKDOWN ] - Access your STASH to authorize exit.", '#F0F');
                if (this.game.soundManager) this.game.soundManager.playError();
                if (this.game.floatingTextManager) {
                    this.game.floatingTextManager.addText(pCenterX, pCenterY - 20, "🔒 LOCKDOWN", "#F0F");
                }
                return true;
            }
        }

        return false; // Not locked
    }
};
