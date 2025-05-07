// --- START OF FILE js/itemManager.js ---
import { TILE_TYPES } from './mapManager.js'; // Import TILE_TYPES

export const itemManager = {
    game: null,
    itemDefinitions: {}, // was 'items'
    onMapItems: [],    // was 'itemsOnMap'

    init: function(gameInstance) {
        this.game = gameInstance;
        this.defineItems();
        this.onMapItems = [];
    },

    defineItems: function() {
        this.itemDefinitions = {
            'narcotix_pill': { id: 'narcotix_pill', name: "NarcotiX Pill (Generic)", description: "A pill-enabled passport to the bettaverse. Consume for unpredictable effects.", type: 'consumable', buyPrice: 20, sellPrice: 15, stackable: true, effect: (player) => { const r = Math.random(); this.game.utils.addMessage("Pill deployed..."); if (r < 0.3) { player.applyStatusEffect("System Glitch", 10000); this.game.utils.addMessage("...experiencing input desync!"); } else if (r < 0.6) {player.heal(10); this.game.utils.addMessage("...positive feedback loop: +10 Vitality.");} else {player.takeDamage(5); this.game.utils.addMessage("...negative resonance cascade: -5 Vitality!");} }},
            'nanite_repair': { id: 'nanite_repair', name: "Nanite Repair Kit", description: "Restores 50 Vitality. Self-administered.", type: 'consumable', buyPrice: 100, sellPrice: 40, stackable: true, effect: (player) => player.heal(50) },
            'adrena_rush_injector': { id: 'adrena_rush_injector', name: "Adrena-Rush Injector", description: "Temporary +50% clock speed. Short burst.", type: 'consumable', buyPrice: 75, sellPrice: 30, stackable: true, effect: (player) => player.applyStatusEffect("C-Burst", 10000, { speedMultiplier: 1.5 }) },
            'kaos_elixir': { id: 'kaos_elixir', name: "Kaos Elixir", description: "Pure, distilled chaos. +30% Speed. ATTRACTS ATTENTION.", type: 'consumable', buyPrice: 150, sellPrice: 60, stackable: false, effect: (player) => { player.applyStatusEffect("Kaos Frenzy", 15000, { speedMultiplier: 1.3 }); }},
            'xdata_fragment': { id: 'xdata_fragment', name: "Corrupted XData Fragment", description: "Highly sensitive, likely illicit. Needed by a Xemist.", type: 'quest_item', buyPrice: 0, sellPrice: 0, stackable: false }
        };
    },

    createItemById: function(id, quantity=1) {
        const def = this.itemDefinitions[id];
        if(!def) return null;
        return {...def, quantity: def.stackable ? quantity : 1};
    },

    spawnInitialItems: function() {
        this.onMapItems = [];
        for(let i=0; i<20; i++) {
            let rX = Math.floor(Math.random()*this.game.config.MAP_WIDTH_TILES);
            let rY = Math.floor(Math.random()*this.game.config.MAP_HEIGHT_TILES);
            let attempts = 0;
            let tileDataForSpawn = this.game.mapManager.getTileData(rX, rY);

            while((
                   this.game.mapManager.isColliding(rX*this.game.config.TILE_SIZE, rY*this.game.config.TILE_SIZE) ||
                   (tileDataForSpawn && tileDataForSpawn.type === TILE_TYPES.COOLANT_RESERVOIR) // Corrected access and added null check
                  ) && attempts < 10) {
                rX = Math.floor(Math.random()*this.game.config.MAP_WIDTH_TILES);
                rY = Math.floor(Math.random()*this.game.config.MAP_HEIGHT_TILES);
                tileDataForSpawn = this.game.mapManager.getTileData(rX, rY); // Update for next iteration
                attempts++;
            }

            if(attempts < 10) {
                 const sItems = Object.keys(this.itemDefinitions).filter(id => this.itemDefinitions[id].type !== 'quest_item');
                const rId = sItems[Math.floor(Math.random()*sItems.length)];
                const iDef = this.itemDefinitions[rId];
                if (iDef) {
                    this.onMapItems.push({
                        id: rId,
                        x: rX*this.game.config.TILE_SIZE + this.game.config.TILE_SIZE*0.1,
                        y: rY*this.game.config.TILE_SIZE + this.game.config.TILE_SIZE*0.1,
                        width: this.game.config.TILE_SIZE*0.8,
                        height: this.game.config.TILE_SIZE*0.8,
                        name: iDef.name,
                        quantity: iDef.stackable?(Math.floor(Math.random()*3)+1):1
                    });
                }
            }
        }
    },

    updateItemsOnMap: function(dt) { /* Currently no update logic for items on map itself */ },

    renderItemsOnMap: function() {
        this.onMapItems.forEach(item => {
            if (item.x + this.game.config.TILE_SIZE > this.game.camera.x &&
                item.x < this.game.camera.x + this.game.camera.width &&
                item.y + this.game.config.TILE_SIZE > this.game.camera.y &&
                item.y < this.game.camera.y + this.game.camera.height) {

                let char = 'c';
                if(item.id === 'nanite_repair') char='+';
                else if(item.id.includes('pill')) char='⦾';
                else if(item.id.includes('adrena_rush') || item.id.includes('injector')) char='>';
                else if(item.id.includes('kaos')) char='!';
                else if(item.id.includes('xdata')) char='Җ';
                if (item.isEventItem && item.char) char = item.char;

                this.game.ctx.fillStyle = item.color || '#0FF';
                this.game.ctx.font = `${this.game.config.TILE_SIZE*0.7}px Arial`;
                this.game.ctx.textAlign = 'center';
                this.game.ctx.textBaseline = 'middle';
                this.game.ctx.fillText(char, item.x + item.width/2, item.y + item.height/2 + this.game.config.TILE_SIZE*0.1);
            }
        });
    }
};
// --- END OF FILE js/itemManager.js ---