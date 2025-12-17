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
    data: [], // was mapData
    game: null,

    init: function(gameInstance) {
        this.game = gameInstance;
        this.data = [];
    },

    generateMap: function() {
        this.data = [];
        for (let r = 0; r < this.game.config.MAP_HEIGHT_TILES; r++) {
            this.data[r] = [];
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
               
                if(c > 0 && c < this.game.config.MAP_WIDTH_TILES -1 && r > 0 && r < this.game.config.MAP_HEIGHT_TILES -1){
                    if (c >= 9 && c <= 11 && r >= 9 && r <= 11) {cellData.type = TILE_TYPES.SECURE_DATA_SILO_WALL;}
                    if (c === 10 && r === 11) { cellData.type = TILE_TYPES.EXCHANGE_NODE_ENTRANCE; cellData.interactionTargetId = 'central_exchange'; cellData.interactionType = 'exchange_node'; }

                    if (c >= 39 && c <= 41 && r >= 4 && r <= 6) { cellData.type = TILE_TYPES.SECURE_DATA_SILO_WALL; }
                    if (c === 40 && r === 6) { cellData.type = TILE_TYPES.EXCHANGE_NODE_ENTRANCE; cellData.interactionTargetId = 'xemist_den'; cellData.interactionType = 'exchange_node'; }

                    // Safehouse Stash Room (Start Area)
                    if (c >= 3 && c <= 7 && r >= 3 && r <= 7) { 
                        if (c === 3 || c === 7 || r === 3 || r === 7) cellData.type = TILE_TYPES.SECURE_DATA_SILO_WALL;
                        else cellData.type = TILE_TYPES.XLOUNGE_INTERIOR; 
                    }
                    if (c === 5 && r === 7) cellData.type = TILE_TYPES.XLOUNGE_INTERIOR; // Doorway
                    if (c === 5 && r === 4) { 
                        cellData.type = TILE_TYPES.XLOUNGE_STASH_ENTRANCE; 
                        cellData.interactionTargetId = 'safehouse_stash'; 
                        cellData.interactionType = 'xlounge_stash';
                    } 

                    if (c === 15 && r === 15) { cellData.type = TILE_TYPES.XEMIST_CONTACT_POINT; cellData.interactionTargetId = 'glitch_codex'; cellData.interactionType = 'xemist_contact';}

                    // Bar (20, 20) Area: 19-21, 19-21 (3x3)
                    if (c >= 19 && c <= 21 && r >= 19 && r <= 21) { 
                        if (c===19||c===21 || r===19) cellData.type = TILE_TYPES.SECURE_DATA_SILO_WALL;
                        else cellData.type = TILE_TYPES.BAR_INTERIOR; 
                    }
                    if (c === 20 && r === 21) { cellData.type = TILE_TYPES.BAR_ENTRANCE; } // Door
                    if (c === 20 && r === 19) { // Counter at back
                        cellData.type = TILE_TYPES.BAR_COUNTER; 
                        cellData.interactionTargetId = 'the_glitch_bar'; 
                        cellData.interactionType = 'bar'; 
                    }

                    // Armoury (30, 10) Area: 29-31, 9-11 (3x3)
                    if (c >= 29 && c <= 31 && r >= 9 && r <= 11) { 
                        if (c===29||c===31 || r===9) cellData.type = TILE_TYPES.SECURE_DATA_SILO_WALL;
                        else cellData.type = TILE_TYPES.ARMOURY_INTERIOR; 
                    }
                    if (c === 30 && r === 11) { cellData.type = TILE_TYPES.ARMOURY_ENTRANCE; } // Door
                    if (c === 30 && r === 9) { // Counter at back
                        cellData.type = TILE_TYPES.ARMOURY_COUNTER; 
                        cellData.interactionTargetId = 'sector_7_armoury'; 
                        cellData.interactionType = 'armoury'; 
                    }

                    // Casino (25, 30) Area: 24-26, 29-31 (3x3)
                    if (c >= 24 && c <= 26 && r >= 29 && r <= 31) { 
                        if (c===24||c===26 || r===29) cellData.type = TILE_TYPES.SECURE_DATA_SILO_WALL;
                        else cellData.type = TILE_TYPES.CASINO_INTERIOR; 
                    }
                    if (c === 25 && r === 31) { cellData.type = TILE_TYPES.CASINO_ENTRANCE; } // Door
                    if (c === 25 && r === 29) { // Counter at back
                        cellData.type = TILE_TYPES.CASINO_COUNTER; 
                        cellData.interactionTargetId = 'lucky_hash'; 
                        cellData.interactionType = 'casino'; 
                    }
                }
                this.data[r][c] = cellData;
            }
        }
    },

    render: function() {
        const { startCol, endCol, startRow, endRow } = this.game.getVisibleTiles();
        const tileSize = this.game.config.TILE_SIZE;
        
        for (let r = startRow; r < endRow; r++) {
            for (let c = startCol; c < endCol; c++) {
                if (r < 0 || r >= this.game.config.MAP_HEIGHT_TILES || c < 0 || c >= this.game.config.MAP_WIDTH_TILES) continue;
                const tile = this.data[r][c];
                const tileDef = TILE_PROPERTIES[tile.type] || TILE_PROPERTIES[TILE_TYPES.EMPTY];
                this.game.ctx.fillStyle = tileDef.color;
                this.game.ctx.fillRect(c * tileSize, r * tileSize, tileSize, tileSize);

                // Render Location Labels
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
                    this.game.ctx.shadowBlur = 0; // Reset
                }
            }
        }
    },

    getTilePropertiesAt: function(worldX, worldY) {
        const tileX = Math.floor(worldX / this.game.config.TILE_SIZE);
        const tileY = Math.floor(worldY / this.game.config.TILE_SIZE);
        if (tileX >= 0 && tileX < this.game.config.MAP_WIDTH_TILES && tileY >= 0 && tileY < this.game.config.MAP_HEIGHT_TILES) {
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
        return tileX >= 0 && tileX < this.game.config.MAP_WIDTH_TILES && tileY >= 0 && tileY < this.game.config.MAP_HEIGHT_TILES;
    },

    getTileData: function(tileX, tileY) {
        if (this.isValidTile(tileX, tileY)) {
            return this.data[tileY][tileX];
        }
        return null;
    }
};