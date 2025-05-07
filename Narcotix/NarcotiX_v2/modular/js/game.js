// --- START OF FILE js/game.js ---
import * as config from './config.js';
import * as utils from './utils.js';
import { mapManager, TILE_PROPERTIES } from './mapManager.js'; // Import TILE_PROPERTIES
import { player } from './player/player.js'; // This import remains the same
import { itemManager } from './itemManager.js';
import { enemyManager } from './enemyManager.js';
import { hud } from './hud.js';
import { shopManager } from './shopManager.js';
import { questManager } from './questManager.js';
import { zoneManager } from './zoneManager.js';
import { eventManager } from './eventManager.js';

export const game = {
    // Properties
    config: config,
    utils: utils,
    canvas: null,
    ctx: null,
    gameState: 'PLAYING', 
    gameTime: 0,
    currentDay: 1, 
    isDayTime: true, 
    
    camera: {
        x: 0, y: 0, 
        width: 0, height: 0, 
        update: function(targetEntity) { 
            let targetX = targetEntity.x - this.width / 2;
            let targetY = targetEntity.y - this.height / 2;
            targetX = Math.max(0, Math.min(targetX, game.config.MAP_WIDTH_TILES * game.config.TILE_SIZE - this.width));
            targetY = Math.max(0, Math.min(targetY, game.config.MAP_HEIGHT_TILES * game.config.TILE_SIZE - this.height));
            this.x = targetX;
            this.y = targetY;
        }
    },
    keysPressed: {},

    // Managers
    mapManager: mapManager,
    player: player,
    itemManager: itemManager,
    enemyManager: enemyManager,
    hud: hud,
    shopManager: shopManager,
    questManager: questManager,
    zoneManager: zoneManager,
    randomEventManager: eventManager, 

    init: function(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        
        this.gameState = 'PLAYING';
        this.gameTime = 0;
        this.currentDay = 1;
        this.isDayTime = true;
        this.keysPressed = {};

        this.camera.width = this.config.VIEWPORT_WIDTH_TILES * this.config.TILE_SIZE;
        this.camera.height = this.config.VIEWPORT_HEIGHT_TILES * this.config.TILE_SIZE;
        
        this.utils.resetTutorials();
        this.utils.clearMessages();

        this.mapManager.init(this);
        this.itemManager.init(this); 
        this.player.init(this); // Player init is called here
        this.enemyManager.init(this); 
        this.questManager.init(this);
        this.zoneManager.init(this);
        this.shopManager.init(this);
        this.randomEventManager.init(this);
        this.hud.init(this);

        this.mapManager.generateMap(); 
        this.itemManager.spawnInitialItems();
        this.enemyManager.spawnInitialEnemies();


        this.hud.update(); 
        this.utils.addMessage("NarcotiX Systems Online. Welcome, Xperient.");
        
        this.utils.queueTutorial("Initiate Movement Matrix: WASD or Arrow Keys.", () => true);
        this.utils.queueTutorial("Access Personal Data-Stash: Press 'I'.", (g) => g.player.inventory.items.length > 0 || g.player.money > 10);
        this.utils.queueTutorial("Execute Subroutines (1-3) for tactical advantage.", (g) => g.player.abilities.length > 0 && g.player.money > 0);
        this.utils.queueTutorial("Interface with Highlighted Grid Nodes (E): Exchange Nodes (Aqua/Magenta), Xemist Contacts (Yellow).", () => true);
        this.utils.queueTutorial("Engage Hostiles: Press 'Space' for Melee Disruptor.", (g) => g.enemyManager.list.some(e => g.utils.distance(g.player.x, g.player.y, e.x, e.y) < g.player.attackRange * 2));
    },

    update: function(deltaTime) {
        if (this.gameState === 'GAME_OVER') return;
       
        this.player.updateAbilityCooldowns(); 
        this.player.updateStatusEffects(deltaTime);
        this.player.updatePlayerStatusDisplay(); // This specific display update from playerStatusEffects module

        if (this.gameState === 'PLAYING' || this.gameState === 'INVENTORY_OPEN' || this.gameState === 'QUESTLOG_OPEN') {
            this.gameTime += deltaTime * 1000; 
            const gameMinsTotal = Math.floor(this.gameTime / (this.config.TICKS_PER_GAME_MINUTE * 1000));
            const newPhase = Math.floor(gameMinsTotal / this.config.GAME_MINUTES_PER_DAY) + 1;
            const minsInCurrentPhase = gameMinsTotal % this.config.GAME_MINUTES_PER_DAY;
            const hrs = Math.floor(minsInCurrentPhase / 60); 
            const mins = minsInCurrentPhase % 60;
            
            if (newPhase > this.currentDay) { 
                this.currentDay = newPhase; 
                this.utils.addMessage(`Phase ${this.currentDay} initiated.`); 
                this.zoneManager.updateDailyZoneResets();
                
                const centralNanite = this.shopManager.shops['central_exchange']?.inventory.find(i=>i.itemId==='nanite_repair');
                if(centralNanite) centralNanite.stock=10;
                const xemistKaos = this.shopManager.shops['xemist_den']?.inventory.find(i=>i.itemId==='kaos_elixir');
                if(xemistKaos) xemistKaos.stock=3;

            }
            this.isDayTime = hrs >= 6 && hrs < 18;
            const gameTimeDisplayEl = document.getElementById('gameTimeDisplay');
            if (gameTimeDisplayEl) gameTimeDisplayEl.textContent = `Phase ${this.currentDay} - ${String(hrs).padStart(2,'0')}:${String(mins).padStart(2,'0')} (${this.isDayTime?'High Traffic':'Low Traffic'})`;
           
            this.player.handleInput(deltaTime);

            if (this.gameState === 'PLAYING') {
                this.camera.update(this.player);
                this.enemyManager.updateEnemies(deltaTime);
                this.itemManager.updateItemsOnMap(deltaTime);
                this.zoneManager.update(deltaTime);
                this.randomEventManager.update(deltaTime);
            }
        }
        this.hud.update();
        this.utils.processTutorialQueue(this); 
    },

    render: function() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.save(); 
        this.ctx.translate(-this.camera.x, -this.camera.y);
        
        this.mapManager.render();
        this.zoneManager.render(); 
        this.itemManager.renderItemsOnMap();
        this.enemyManager.renderEnemies();
        this.player.render();
        this.questManager.renderQuestMarkers();
        
        this.ctx.restore();
        
        if (this.gameState === 'GAME_OVER') {
            this.ctx.fillStyle = 'rgba(0,0,0,0.85)'; 
            this.ctx.fillRect(0,0,this.canvas.width,this.canvas.height);
            this.ctx.fillStyle = 'red'; 
            this.ctx.font = '48px Courier New'; 
            this.ctx.textAlign = 'center';
            this.ctx.fillText('S Y S T E M _ F A I L U R E', this.canvas.width/2, this.canvas.height/2 - 20);
            this.ctx.font = '24px Courier New'; 
            this.ctx.fillStyle = '#0FF';
            this.ctx.fillText('Press R to Re-initialize Sequence', this.canvas.width/2, this.canvas.height/2 + 30);
        }
    },

    gameOver: function() { 
        this.gameState = 'GAME_OVER'; 
        this.utils.addMessage("Critical System Failure. Xperient signature lost."); 
    },

    restartGame: function() {
        this.itemManager.onMapItems = [];
        this.enemyManager.list = [];
        
        this.gameTime = 0; 
        this.currentDay = 1;
        
        this.utils.resetTutorials();
        this.utils.clearMessages();
        
        const inventoryItemsEl = document.getElementById('inventoryItems');
        if (inventoryItemsEl) inventoryItemsEl.innerHTML='';
        const shopItemsForSaleEl = document.getElementById('shopItemsForSale');
        if (shopItemsForSaleEl) shopItemsForSaleEl.innerHTML='';
        const playerItemsToSellEl = document.getElementById('playerItemsToSell');
        if (playerItemsToSellEl) playerItemsToSellEl.innerHTML='';
        const activeQuestsDisplayEl = document.getElementById('activeQuestsDisplay');
        if (activeQuestsDisplayEl) activeQuestsDisplayEl.innerHTML='';

        this.gameState = 'PLAYING'; 
        this.init(this.canvas, this.ctx); // Player is re-initialized through player.init()
        this.utils.addMessage("Re-initializing NarcotiX Game Client...");
    },

    openShop: function(shopId) {
        let questActionTaken = false;
        if (this.questManager.activeQuests.some(q => q.targetNPCId === shopId && q.type === 'DELIVER_ITEM_TO_NPC' && !q.isCompleted)) {
             questActionTaken = this.questManager.checkDeliverQuestAtShop(shopId);
        }
        
        const deliveryQuest = this.questManager.activeQuests.find(q=>q.targetNPCId===shopId && q.type === 'DELIVER_ITEM_TO_NPC');
        const canOpenShopAfterQuest = !deliveryQuest || (deliveryQuest && this.player.hasItem(deliveryQuest.itemToDeliverId, deliveryQuest.quantity));


        if(!questActionTaken || (questActionTaken && canOpenShopAfterQuest)) {
            const shopData = this.shopManager.shops[shopId]; 
            if (!shopData) { 
                this.utils.addMessage("Node connection failed or unauthorized access."); 
                return; 
            }
            this.gameState = 'SHOP_MENU';
            this.shopManager.populateShopUI(shopId);
            
            const shopInterfaceEl = document.getElementById('shopInterface');
            if (shopInterfaceEl) shopInterfaceEl.style.display = 'block';
            const inventoryDisplayEl = document.getElementById('inventoryDisplay');
            if (inventoryDisplayEl) inventoryDisplayEl.style.display='none';
            const questLogEl = document.getElementById('questLog');
            if (questLogEl) questLogEl.style.display='none';
        }
    },

    closeShop: function() { 
        this.gameState = 'PLAYING'; 
        const shopInterfaceEl = document.getElementById('shopInterface');
        if (shopInterfaceEl) shopInterfaceEl.style.display = 'none';
        this.utils.addMessage("Disconnected from interface node."); 
    },

    toggleInventory: function() {
        const d = document.getElementById('inventoryDisplay');
        if (!d) return;
        if (this.gameState === 'SHOP_MENU') return; 
        
        if (d.style.display === 'block') { 
            d.style.display = 'none'; 
            if(this.gameState === 'INVENTORY_OPEN') this.gameState = 'PLAYING'; 
        } else { 
            this.player.renderInventory(); 
            d.style.display = 'block'; 
            if(this.gameState === 'PLAYING') this.gameState = 'INVENTORY_OPEN'; 
            const questLogEl = document.getElementById('questLog');
            if (questLogEl) questLogEl.style.display='none';
        }
    },

    toggleQuestLog: function() {
        const d = document.getElementById('questLog');
        if (!d) return;
        if (this.gameState === 'SHOP_MENU') return; 
        
        if (d.style.display === 'block') { 
            d.style.display = 'none'; 
            if(this.gameState === 'QUESTLOG_OPEN') this.gameState = 'PLAYING'; 
        } else { 
            this.questManager.renderQuestLog(); 
            d.style.display = 'block'; 
            if(this.gameState === 'PLAYING') this.gameState = 'QUESTLOG_OPEN'; 
            const inventoryDisplayEl = document.getElementById('inventoryDisplay');
            if (inventoryDisplayEl) inventoryDisplayEl.style.display='none';
        }
    },

    interact: function() {
        if (this.gameState !== 'PLAYING') return;

        const pCenterTileX = Math.floor((this.player.x + this.player.width/2)/this.config.TILE_SIZE);
        const pCenterTileY = Math.floor((this.player.y + this.player.height/2)/this.config.TILE_SIZE);
        const dirs = [[0,0],[0,-1],[0,1],[-1,0],[1,0], [-1,-1],[-1,1],[1,-1],[1,1]]; 
        
        for (const [dx,dy] of dirs) {
            const cX = pCenterTileX + dx;
            const cY = pCenterTileY + dy;
            if(this.mapManager.isValidTile(cX,cY)){
                const tileData = this.mapManager.getTileData(cX, cY); 
                if (tileData) { // Ensure tileData is not null
                    const tileProps = TILE_PROPERTIES[tileData.type]; // Corrected access
                    
                    if(tileProps && tileProps.interactive){
                        const tileWorldX = cX * this.config.TILE_SIZE + this.config.TILE_SIZE/2;
                        const tileWorldY = cY * this.config.TILE_SIZE + this.config.TILE_SIZE/2;
                        
                        if (this.utils.distance(this.player.x + this.player.width/2, this.player.y + this.player.height/2, tileWorldX, tileWorldY) <= this.config.TILE_SIZE * 1.2) {
                            if(tileData.interactionType && tileData.interactionTargetId){
                                if (tileData.interactionType === 'exchange_node' || tileData.interactionType === 'xlounge_stash') {
                                    this.openShop(tileData.interactionTargetId); return;
                                } else if (tileData.interactionType === 'xemist_contact') {
                                    this.questManager.interactWithQuestGiver(tileData.interactionTargetId); return;
                                }
                            }
                        }
                    }
                }
            }
        }
        this.utils.addMessage("No interactive elements detected in proximity.");
    },

    getVisibleTiles: function() { 
        const sC=Math.max(0,Math.floor(this.camera.x/this.config.TILE_SIZE));
        const eC=Math.min(this.config.MAP_WIDTH_TILES, sC+Math.ceil(this.camera.width/this.config.TILE_SIZE)+1);
        const sR=Math.max(0,Math.floor(this.camera.y/this.config.TILE_SIZE));
        const eR=Math.min(this.config.MAP_HEIGHT_TILES, sR+Math.ceil(this.camera.height/this.config.TILE_SIZE)+1); 
        return{startCol:sC,endCol:eC,startRow:sR,endRow:eR};
    }
};
// --- END OF FILE js/game.js ---