// --- START OF FILE js/enemyManager.js ---
import { TILE_TYPES } from './mapManager.js'; // Import TILE_TYPES
import { Enemy } from './Enemy.js'; // Import Enemy Class
import { WorldItem } from './WorldItem.js'; // Import WorldItem

export const enemyManager = {
    game: null,
    enemyTypes: {},
    list: [], // was 'enemies'

    init: function(gameInstance) {
        this.game = gameInstance;
        this.initEnemyTypes();
        this.list = [];
    },

    initEnemyTypes: function() {
        this.enemyTypes = {
            'enforcer': { name: "System Enforcer", char: 'E', color: '#F66', hp: 30, speed: 80, damage: 5, damageType: 'kinetic', detectionRange: this.game.config.TILE_SIZE * 5, attackRange: this.game.config.TILE_SIZE * 0.9, ai: 'basic_melee', loot: () => { const r=Math.random(); if (r < 0.5) return { money: Math.floor(r*20)+5 }; if (r < 0.7) return { item: this.game.itemManager.createItemById('narcotix_pill') }; return null;}},
            'warden': { name: "Zone Warden", char: 'W', color: '#C00', hp: 100, speed: 60, damage: 15, damageType: 'kinetic', detectionRange: this.game.config.TILE_SIZE * 7, attackRange: this.game.config.TILE_SIZE * 1, ai: 'guard_area', loot: () => ({ money: Math.floor(Math.random()*50)+25, item: (Math.random() < 0.5 ? this.game.itemManager.createItemById('nanite_repair') : this.game.itemManager.createItemById('adrena_rush_injector')) }), isBoss: true},
            'drone': { name: "Meta-Patrol Unit", char: 'd', color: '#88F', hp: 20, speed: 120, damage: 0, damageType: 'bio', detectionRange: this.game.config.TILE_SIZE * 8, attackRange: this.game.config.TILE_SIZE * 1.5, ai: 'tagger', attackEffect: (player)=>{ player.applyStatusEffect("Sys-Marked", 30000); this.game.utils.addMessage("Meta-Patrol Unit tagged your signature!"); }, loot: () => (Math.random() < 0.2 ? {money: Math.floor(Math.random()*5)+1} : null)}
        };
    },

    // createEnemy removed - replaced by Enemy class


    spawnEnemy: function(typeId, tileX, tileY, patrolPath=[]) {
        const def = this.enemyTypes[typeId];
        if (!def) return;

        const x = tileX * this.game.config.TILE_SIZE;
        const y = tileY * this.game.config.TILE_SIZE;
        
        // Convert patrol path from tiles to world coords
        const worldPath = patrolPath.map(p => ({ x: p.x * this.game.config.TILE_SIZE, y: p.y * this.game.config.TILE_SIZE }));

        const newE = new Enemy(this.game, typeId, x, y, def, worldPath);
        
        this.list.push(newE);
        if (this.game.entities) {
            this.game.entities.push(newE);
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