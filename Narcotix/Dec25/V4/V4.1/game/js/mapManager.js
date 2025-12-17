// TILE_TYPES and TILE_PROPERTIES are defined here as they are specific to mapManager
export const TILE_TYPES = { EMPTY: 0, DATA_STREAM: 1, LOW_REZ_PLAIN: 2, FIREWALL: 3, SECURE_DATA_SILO_WALL: 4, EXCHANGE_NODE_ENTRANCE: 5, EXCHANGE_INTERIOR: 6, XLOUNGE_STASH_ENTRANCE: 7, XLOUNGE_INTERIOR: 8, HOSTILE_SPAWN_VECTOR: 9, DATA_FRAGMENT_SPAWN: 10, XEMIST_CONTACT_POINT: 11, COOLANT_RESERVOIR: 12, BAR_ENTRANCE: 13, ARMOURY_ENTRANCE: 14, CASINO_ENTRANCE: 15, BAR_INTERIOR: 16, ARMOURY_INTERIOR: 17, CASINO_INTERIOR: 18, BAR_COUNTER: 19, ARMOURY_COUNTER: 20, CASINO_COUNTER: 21 };

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
    
    // Counters (Collision, Interactive)
    [TILE_TYPES.BAR_COUNTER]: { color: '#F80', collision: true, interactive: true, type: 'bar' },
    [TILE_TYPES.ARMOURY_COUNTER]: { color: '#F00', collision: true, interactive: true, type: 'armoury' },
    [TILE_TYPES.CASINO_COUNTER]: { color: '#0F0', collision: true, interactive: true, type: 'casino' },
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
        // 1. Generate Overworld
        const overworld = [];
        for (let r = 0; r < this.game.config.MAP_HEIGHT_TILES; r++) {
            overworld[r] = [];
            for (let c = 0; c < this.game.config.MAP_WIDTH_TILES; c++) {
                let tileType = TILE_TYPES.LOW_REZ_PLAIN;
                if (c > 0 && c < this.game.config.MAP_WIDTH_TILES - 1 && r > 0 && r < this.game.config.MAP_HEIGHT_TILES - 1) {
                    if ((c % 12 <= 1 || r % 12 <= 1) && (c > 2 && c < this.game.config.MAP_WIDTH_TILES - 3 && r > 2 && r < this.game.config.MAP_HEIGHT_TILES - 3)) tileType = TILE_TYPES.DATA_STREAM;
                    if (Math.random() < 0.04 && tileType === TILE_TYPES.LOW_REZ_PLAIN) tileType = TILE_TYPES.SECURE_DATA_SILO_WALL;
                    if (Math.random() < 0.005 && tileType === TILE_TYPES.LOW_REZ_PLAIN) tileType = TILE_TYPES.COOLANT_RESERVOIR;
                    if (Math.random() < 0.002 && tileType !== TILE_TYPES.DATA_STREAM && tileType !== TILE_TYPES.COOLANT_RESERVOIR && tileType !== TILE_TYPES.SECURE_DATA_SILO_WALL) tileType = TILE_TYPES.HOSTILE_SPAWN_VECTOR;
                }
                if (c === 0 || r === 0 || c === this.game.config.MAP_WIDTH_TILES - 1 || r === this.game.config.MAP_HEIGHT_TILES - 1) tileType = TILE_TYPES.FIREWALL;

                let cellData = { type: tileType };
               
                // Points of Interest (Hardcoded locations)
                if(c > 0 && c < this.game.config.MAP_WIDTH_TILES -1 && r > 0 && r < this.game.config.MAP_HEIGHT_TILES -1){
                    // Central Exchange
                    if (c >= 9 && c <= 11 && r >= 9 && r <= 11) cellData.type = TILE_TYPES.SECURE_DATA_SILO_WALL;
                    if (c === 10 && r === 11) { 
                        cellData.type = TILE_TYPES.EXCHANGE_NODE_ENTRANCE; 
                        cellData.isDoor = true; cellData.targetMap = 'central_exchange_interior'; cellData.targetX = 5; cellData.targetY = 8;
                    }

                    // Xemist Den
                    if (c >= 39 && c <= 41 && r >= 4 && r <= 6) cellData.type = TILE_TYPES.SECURE_DATA_SILO_WALL;
                    if (c === 40 && r === 6) { 
                        cellData.type = TILE_TYPES.EXCHANGE_NODE_ENTRANCE; 
                        cellData.isDoor = true; cellData.targetMap = 'xemist_den_interior'; cellData.targetX = 5; cellData.targetY = 8;
                    }

                    // Safehouse (Start)
                    if (c >= 3 && c <= 7 && r >= 3 && r <= 7) { 
                        if (c === 3 || c === 7 || r === 3 || r === 7) cellData.type = TILE_TYPES.SECURE_DATA_SILO_WALL;
                        else cellData.type = TILE_TYPES.XLOUNGE_INTERIOR; // Roof/Floor logic later?
                    }
                    if (c === 5 && r === 7) {
                        cellData.type = TILE_TYPES.XLOUNGE_STASH_ENTRANCE; // The Door
                        cellData.isDoor = true; cellData.targetMap = 'safehouse_interior'; cellData.targetX = 5; cellData.targetY = 8;
                    }

                    // Codex
                    if (c === 15 && r === 15) { cellData.type = TILE_TYPES.XEMIST_CONTACT_POINT; cellData.interactionTargetId = 'glitch_codex'; cellData.interactionType = 'xemist_contact';}

                    // Bar
                    if (c >= 19 && c <= 21 && r >= 19 && r <= 21) { 
                        if (c===19||c===21 || r===19) cellData.type = TILE_TYPES.SECURE_DATA_SILO_WALL;
                        else cellData.type = TILE_TYPES.BAR_INTERIOR; 
                    }
                    if (c === 20 && r === 21) { 
                        cellData.type = TILE_TYPES.BAR_ENTRANCE; 
                        cellData.isDoor = true; cellData.targetMap = 'bar_interior'; cellData.targetX = 5; cellData.targetY = 8;
                    }

                    // Armoury
                    if (c >= 29 && c <= 31 && r >= 9 && r <= 11) { 
                        if (c===29||c===31 || r===9) cellData.type = TILE_TYPES.SECURE_DATA_SILO_WALL;
                        else cellData.type = TILE_TYPES.ARMOURY_INTERIOR; 
                    }
                    if (c === 30 && r === 11) { 
                        cellData.type = TILE_TYPES.ARMOURY_ENTRANCE; 
                        cellData.isDoor = true; cellData.targetMap = 'armoury_interior'; cellData.targetX = 5; cellData.targetY = 8;
                    }

                    // Casino
                    if (c >= 24 && c <= 26 && r >= 29 && r <= 31) { 
                        if (c===24||c===26 || r===29) cellData.type = TILE_TYPES.SECURE_DATA_SILO_WALL;
                        else cellData.type = TILE_TYPES.CASINO_INTERIOR; 
                    }
                    if (c === 25 && r === 31) { 
                        cellData.type = TILE_TYPES.CASINO_ENTRANCE; 
                        cellData.isDoor = true; cellData.targetMap = 'casino_interior'; cellData.targetX = 5; cellData.targetY = 8;
                    }
                }
                overworld[r][c] = cellData;
            }
        }
        this.maps['overworld'] = overworld;

        // 2. Generate Interiors
        this.generateInterior('safehouse_interior', 10, 10, TILE_TYPES.XLOUNGE_INTERIOR, 'safehouse_stash', 'xlounge_stash', 5, 7);
        this.generateInterior('central_exchange_interior', 10, 10, TILE_TYPES.EXCHANGE_INTERIOR, 'central_exchange', 'exchange_node', 10, 11);
        this.generateInterior('xemist_den_interior', 10, 10, TILE_TYPES.EXCHANGE_INTERIOR, 'xemist_den', 'exchange_node', 40, 6);
        this.generateInterior('bar_interior', 10, 10, TILE_TYPES.BAR_INTERIOR, 'the_glitch_bar', 'bar', 20, 21);
        this.generateInterior('armoury_interior', 10, 10, TILE_TYPES.ARMOURY_INTERIOR, 'sector_7_armoury', 'armoury', 30, 11);
        this.generateInterior('casino_interior', 10, 10, TILE_TYPES.CASINO_INTERIOR, 'lucky_hash', 'casino', 25, 31);

        // Set Initial Map
        this.data = this.maps['safehouse_interior'];
        this.currentMapId = 'safehouse_interior';
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
                    cell.targetX = exitX; // Return to outside door
                    cell.targetY = exitY + 1; // Step out
                }

                // Interactive Object (Counter/Stash) at top center
                if (r === 2 && c === Math.floor(w / 2)) {
                    // Use generic "Counter" types or specific ones?
                    // Reusing types from TILE_TYPES if available or Generic Interactive
                    // For visualization, we might want specific tiles.
                    if (interactType === 'xlounge_stash') cell.type = TILE_TYPES.XLOUNGE_STASH_ENTRANCE; // Visual style
                    else if (interactType === 'exchange_node') cell.type = TILE_TYPES.EXCHANGE_NODE_ENTRANCE;
                    else if (interactType === 'bar') cell.type = TILE_TYPES.BAR_COUNTER;
                    else if (interactType === 'armoury') cell.type = TILE_TYPES.ARMOURY_COUNTER;
                    else if (interactType === 'casino') cell.type = TILE_TYPES.CASINO_COUNTER;
                    
                    cell.interactionTargetId = interactId;
                    cell.interactionType = interactType;
                    // Make it solid so you interact from adjacent? Or walkable?
                    // Counters usually solid.
                    // TILE_PROPERTIES handles collision.
                }

                map[r][c] = cell;
            }
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
        
        this.game.utils.addMessage(`Entered: ${mapId.replace(/_/g, ' ').toUpperCase()}`);
        
        // Play Door Sound?
        if (this.game.soundManager) this.game.soundManager.playUI(); // Generic click/blip
    },

    render: function() {
        const { startCol, endCol, startRow, endRow } = this.game.getVisibleTiles();
        const tileSize = this.game.config.TILE_SIZE;
        
        // For interior maps, width/height is smaller than Overworld config
        // But getVisibleTiles uses game.config which is fixed?
        // Actually, startCol/endCol logic clamps to config.MAP_WIDTH_TILES.
        // Interior maps are 10x10.
        // We need to use the CURRENT map dimensions for clamping loop.
        const mapH = this.data.length;
        const mapW = this.data[0].length;

        // Custom bounds for loop
        const sR = Math.max(0, startRow);
        const eR = Math.min(mapH, endRow);
        const sC = Math.max(0, startCol);
        const eC = Math.min(mapW, endCol);
        
        for (let r = sR; r < eR; r++) {
            for (let c = sC; c < eC; c++) {
                // Bounds check redundant due to loop clamp
                const tile = this.data[r][c];
                const tileDef = TILE_PROPERTIES[tile.type] || TILE_PROPERTIES[TILE_TYPES.EMPTY];
                this.game.ctx.fillStyle = tileDef.color;
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
        const tileProps = this.getTilePropertiesAt(worldX, worldY);
        return tileProps ? tileProps.collision : true;
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
    }
};