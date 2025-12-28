// --- START OF FILE js/enemyManager.js ---
import { TILE_TYPES } from './mapManager.js'; // Import TILE_TYPES
import { Enemy } from '../entities/Enemy.js'; // Import Enemy Class
import { WorldItem } from '../entities/WorldItem.js'; // Import WorldItem
import { enemyDefinitions } from '../data/enemies.js'; // Import centralized enemies

export const enemyManager = {
    game: null,
    enemyTypes: {},
    list: [], // was 'enemies'

    init: function(gameInstance) {
        this.game = gameInstance;
        this.initEnemyTypes();
        this.list = [];
        this.setupEventListeners();
    },

    setupEventListeners: function() {
        this.game.events.on('MISSION_STARTED', (mission) => {
            if (mission.id === 'mission_03_first_blood') {
                this.spawnDroneForTutorial();
            }
        });
    },

    spawnDroneForTutorial: function() {
        // Safehouse is at center of overworld
        const safeX = Math.floor(this.game.config.MAP_WIDTH_TILES / 2);
        const safeY = Math.floor(this.game.config.MAP_HEIGHT_TILES / 2);
        
        // Spawn inside the barricade area (radius 6)
        // Exit is at safeX, safeY+1
        this.spawnEnemy('drone_scout', safeX + 2, safeY + 2, [], 'overworld');
        this.game.utils.addMessage("[ SECURITY ALERT ] - Rogue Drone detected within perimeter.", '#F00');
    },

    initEnemyTypes: function() {
        this.enemyTypes = { ...enemyDefinitions };
    },

    // createEnemy removed - replaced by Enemy class


    spawnEnemy: function(typeId, tileX, tileY, patrolPath=[], targetMapId = null) {
        const def = this.enemyTypes[typeId];
        if (!def) return;

        const x = tileX * this.game.config.TILE_SIZE;
        const y = tileY * this.game.config.TILE_SIZE;
        
        // Convert patrol path from tiles to world coords
        const worldPath = patrolPath.map(p => ({ x: p.x * this.game.config.TILE_SIZE, y: p.y * this.game.config.TILE_SIZE }));

        const newE = new Enemy(this.game, typeId, x, y, def, worldPath);
        
        const mapId = targetMapId || this.game.mapManager.currentMapId;

        if (mapId === this.game.mapManager.currentMapId) {
            this.list.push(newE);
            if (this.game.entities) {
                this.game.entities.push(newE);
            }
        } else {
            // Add to stored state of the target map
            if (!this.game.mapManager.storedMapEntities[mapId]) {
                this.game.mapManager.storedMapEntities[mapId] = { items: [], enemies: [] };
            }
            this.game.mapManager.storedMapEntities[mapId].enemies.push(newE);
            console.log(`[EnemyManager] Spawned ${typeId} for stored map: ${mapId}`);
        }
    },

    spawnInitialEnemies: function() {
        this.list=[];
        // this.spawnEnemy('enforcer',15,15,[{x:14,y:14},{x:16,y:14},{x:16,y:16},{x:14,y:16}]); // Removed hardcoded
        // this.spawnEnemy('enforcer',20,25);
        // this.spawnEnemy('drone',25,10);

        const bossX=this.game.config.MAP_WIDTH_TILES-10, bossY=this.game.config.MAP_HEIGHT_TILES-10;
        this.spawnEnemy('warden', bossX, bossY);
        const doc = this.game.itemManager.createItemById('xdata_fragment');
        if(doc) {
            const worldItem = new WorldItem(
                this.game, 
                bossX*this.game.config.TILE_SIZE, 
                (bossY-1)*this.game.config.TILE_SIZE, 
                this.game.config.TILE_SIZE*0.8, 
                this.game.config.TILE_SIZE*0.8, 
                doc
            );
            this.game.itemManager.onMapItems.push(worldItem);
            if (this.game.entities) this.game.entities.push(worldItem);
        }

        // 1. Hostile Spawn Vectors (Placed by map generation)
        for(let r=0;r<this.game.config.MAP_HEIGHT_TILES;r++){
            for(let c=0;c<this.game.config.MAP_WIDTH_TILES;c++){
                const tileData = this.game.mapManager.getTileData(c,r);
                if(tileData && tileData.type === TILE_TYPES.HOSTILE_SPAWN_VECTOR && Math.random()<0.5) { // Increased spawn rate on vectors
                    this.spawnEnemy(Math.random()<0.7?'enforcer':'drone',c,r);
                }
            }
        }

        // 2. Random Wilderness Spawns
        const randomEnemies = 50;
        for(let i=0; i<randomEnemies; i++) {
            let rx = Math.floor(Math.random() * this.game.config.MAP_WIDTH_TILES);
            let ry = Math.floor(Math.random() * this.game.config.MAP_HEIGHT_TILES);
            // Avoid safehouse area (center)
            if (Math.abs(rx - this.game.config.MAP_WIDTH_TILES/2) > 20 || Math.abs(ry - this.game.config.MAP_HEIGHT_TILES/2) > 20) {
                 if (!this.game.mapManager.isColliding(rx * this.game.config.TILE_SIZE, ry * this.game.config.TILE_SIZE)) {
                     this.spawnEnemy('enforcer', rx, ry);
                 }
            }
        }
    },

    updateEnemies: function(dt) {
        // AI Update is now handled by the main game loop calling entity.update()
        // But we might need to sync the list or remove dead enemies from this.list
        this.list = this.list.filter(e => !e.markedForDeletion);
    },

    renderEnemies: function() {
        // Deprecated: Handled by Unified Render Loop in game.js
    }
};
// --- END OF FILE js/enemyManager.js ---