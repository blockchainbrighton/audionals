// TILE_TYPES and TILE_PROPERTIES are defined here as they are specific to mapManager
export const TILE_TYPES = { EMPTY: 0, DATA_STREAM: 1, LOW_REZ_PLAIN: 2, FIREWALL: 3, SECURE_DATA_SILO_WALL: 4, EXCHANGE_NODE_ENTRANCE: 5, EXCHANGE_INTERIOR: 6, XLOUNGE_STASH_ENTRANCE: 7, XLOUNGE_INTERIOR: 8, HOSTILE_SPAWN_VECTOR: 9, DATA_FRAGMENT_SPAWN: 10, XEMIST_CONTACT_POINT: 11, COOLANT_RESERVOIR: 12 };

export const TILE_PROPERTIES = {
    [TILE_TYPES.EMPTY]: { color: '#050505', collision: true, speedModifier: 0 },
    [TILE_TYPES.DATA_STREAM]: { color: '#666', collision: false, speedModifier: 1.2 },
    [TILE_TYPES.LOW_REZ_PLAIN]: { color: '#353', collision: false, speedModifier: 0.8 },
    [TILE_TYPES.FIREWALL]: { color: '#444', collision: true, speedModifier: 0 },
    [TILE_TYPES.SECURE_DATA_SILO_WALL]: { color: '#503020', collision: true, speedModifier: 0 },
    [TILE_TYPES.EXCHANGE_NODE_ENTRANCE]: { color: '#0FF', collision: false, speedModifier: 1, interactive: true, type: 'exchange_node' },
    [TILE_TYPES.EXCHANGE_INTERIOR]: { color: '#223', collision: false, speedModifier: 1 },
    [TILE_TYPES.XLOUNGE_STASH_ENTRANCE]: { color: '#F0F', collision: false, speedModifier: 1, interactive: true, type: 'xlounge_stash' },
    [TILE_TYPES.XLOUNGE_INTERIOR]: { color: '#303', collision: false, speedModifier: 1 },
    [TILE_TYPES.HOSTILE_SPAWN_VECTOR]: { color: '#300', collision: false, speedModifier: 1 },
    [TILE_TYPES.DATA_FRAGMENT_SPAWN]: { color: '#003', collision: false, speedModifier: 1 },
    [TILE_TYPES.XEMIST_CONTACT_POINT]: { color: '#DD0', collision: false, speedModifier: 1, interactive: true, type: 'xemist_contact' },
    [TILE_TYPES.COOLANT_RESERVOIR]: { color: '#118', collision: true, speedModifier: 0 },
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

                    if (c >= 29 && c <= 31 && r >= 29 && r <= 31) {cellData.type = TILE_TYPES.SECURE_DATA_SILO_WALL; }
                    if (c === 30 && r === 31) { cellData.type = TILE_TYPES.XLOUNGE_STASH_ENTRANCE; cellData.interactionTargetId = 'xlounge_personal'; cellData.interactionType = 'xlounge_stash';} 

                    if (c === 5 && r === 15) { cellData.type = TILE_TYPES.XEMIST_CONTACT_POINT; cellData.interactionTargetId = 'glitch_codex'; cellData.interactionType = 'xemist_contact';}
                }
                this.data[r][c] = cellData;
            }
        }
    },

    render: function() {
        const { startCol, endCol, startRow, endRow } = this.game.getVisibleTiles();
        for (let r = startRow; r < endRow; r++) {
            for (let c = startCol; c < endCol; c++) {
                if (r < 0 || r >= this.game.config.MAP_HEIGHT_TILES || c < 0 || c >= this.game.config.MAP_WIDTH_TILES) continue;
                const tile = this.data[r][c];
                const tileDef = TILE_PROPERTIES[tile.type] || TILE_PROPERTIES[TILE_TYPES.EMPTY];
                this.game.ctx.fillStyle = tileDef.color;
                this.game.ctx.fillRect(c * this.game.config.TILE_SIZE, r * this.game.config.TILE_SIZE, this.game.config.TILE_SIZE, this.game.config.TILE_SIZE);
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