// --- START OF FILE js/game.js ---
import * as config from './config.js';
import * as utils from './utils.js';
import { EventBus } from './eventBus.js'; // Import EventBus
import { Projectile } from './Projectile.js'; // Import Projectile
import { mapManager, TILE_PROPERTIES } from './mapManager.js'; // Import TILE_PROPERTIES
import { player } from './player/player.js'; // This import remains the same
import { itemManager } from './itemManager.js';
import { enemyManager } from './enemyManager.js';
import { hud } from './hud.js';
import { shopManager } from './shopManager.js';
import { questManager } from './questManager.js';
import { zoneManager } from './zoneManager.js';
import { eventManager } from './eventManager.js';
import { floatingTextManager } from './floatingTextManager.js'; // Import Floating Text Manager
import { soundManager } from './soundManager.js'; // Import Sound Manager
import { minimap } from './minimap.js'; // Import Minimap
import { particleManager } from './particleManager.js'; // Import Particle Manager
import { stashManager } from './stashManager.js'; // Import Stash Manager
import { imageLoader } from './imageLoader.js';
import { casinoGame } from './casinoGame.js'; // Import Casino Game
import { discoveryManager } from './discoveryManager.js';


// --- Projectile Manager (Simplified Wrapper) ---
const projectileManager = {
    game: null,
    init: function(gameInstance) { this.game = gameInstance; },
    addProjectile: function(options) {
        if (this.game.entities) {
            this.game.entities.push(new Projectile(this.game, options));
        }
    }
};
// --- End Projectile Manager ---

export const game = {
    // Properties
    config: config,
    utils: utils,
    events: new EventBus(), 
    canvas: null,
    ctx: null,
    gameState: 'PLAYING',
    gameTime: 0,
    deltaTime: 0, 
    timeScale: 1.0, 
    currentDay: 1,
    isDayTime: true,

    camera: {
        x: 0, y: 0,
        width: 0, height: 0,
        zoom: config.CAMERA_ZOOM_DEFAULT,
        minZoom: config.CAMERA_ZOOM_MIN,
        maxZoom: config.CAMERA_ZOOM_MAX,
        
        setZoom: function(newZoom) {
            this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, newZoom));
            if (game.canvas) {
                this.width = game.canvas.width / this.zoom;
                this.height = game.canvas.height / this.zoom;
            }
        },

        update: function(targetEntity) {
            if (this.width === 0 && game.canvas) {
                 this.width = game.canvas.width / this.zoom;
                 this.height = game.canvas.height / this.zoom;
            }

            let targetX = targetEntity.x - this.width / 2;
            let targetY = targetEntity.y - this.height / 2;
            targetX = Math.max(0, Math.min(targetX, game.config.MAP_WIDTH_TILES * game.config.TILE_SIZE - this.width));
            targetY = Math.max(0, Math.min(targetY, game.config.MAP_HEIGHT_TILES * game.config.TILE_SIZE - this.height));
            this.x = targetX;
            this.y = targetY;
        }
    },
    keysPressed: {},
    interactionCooldown: 0,
    entities: [], // Unified entities list

    // Managers
    mapManager: mapManager,
    player: player,
    itemManager: itemManager,
    enemyManager: enemyManager,
    projectileManager: projectileManager, // Add projectile manager here
    floatingTextManager: floatingTextManager, // Add Floating Text Manager
    soundManager: soundManager, // Add Sound Manager
    minimap: minimap, // Add Minimap
    particleManager: particleManager, // Add Particle Manager
    stashManager: stashManager, // Add Stash Manager
    casinoGame: casinoGame, // Add Casino Game
    imageLoader: imageLoader,
    discovery: discoveryManager,
    hud: hud,
    shopManager: shopManager,
    questManager: questManager,
    zoneManager: zoneManager,
    randomEventManager: eventManager,

    init: function(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.discovery.init(this);
        this.hud.init(this); // HUD init called AFTER canvas assignment
        this.entities = []; // Initialize entities list
        
        // Input State
        this.mouse = { x: 0, y: 0, screenX: 0, screenY: 0 };

        // Mouse Tracking
        const updateMousePos = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;

            // Store screen relative pos (Internal Pixels)
            this.mouse.screenX = (e.clientX - rect.left) * scaleX;
            this.mouse.screenY = (e.clientY - rect.top) * scaleY;
            
            // Calculate world pos (taking zoom and camera into account)
            // Screen / Zoom + Camera = World
            this.mouse.x = (this.mouse.screenX / this.camera.zoom) + this.camera.x;
            this.mouse.y = (this.mouse.screenY / this.camera.zoom) + this.camera.y;
        };

        window.addEventListener('mousemove', updateMousePos);
        // Also update on scroll since zoom changes world pos relative to screen
        window.addEventListener('wheel', (e) => {
             // Re-calc using last known screen pos if available
             if (this.mouse.screenX !== undefined) {
                 this.mouse.x = (this.mouse.screenX / this.camera.zoom) + this.camera.x;
                 this.mouse.y = (this.mouse.screenY / this.camera.zoom) + this.camera.y;
             }
        });

        this.soundManager.init(this); // Init Sound with game ref
        // Resume audio on first interaction
        window.addEventListener('click', () => { this.soundManager.resume(); }, { once: true });
        window.addEventListener('keydown', () => { this.soundManager.resume(); }, { once: true });

        this.gameState = 'PLAYING';
        this.gameTime = 0;
        this.currentDay = 1;
        this.isDayTime = true;
        this.keysPressed = {};

        // Initial Camera Setup
        this.camera.zoom = 1;
        this.camera.width = this.canvas.width / this.camera.zoom;
        this.camera.height = this.canvas.height / this.camera.zoom;

        this.utils.resetTutorials();
        this.utils.clearMessages();

        this.mapManager.init(this);
        this.itemManager.init(this);
        this.particleManager.init(this); // Init Particle Manager
        this.player.init(this);
        this.enemyManager.init(this);
        this.projectileManager.init(this); // Initialize projectile manager
        this.floatingTextManager.init(this); // Initialize floating text manager
        this.questManager.init(this);
        this.zoneManager.init(this);
        this.shopManager.init(this);
        this.randomEventManager.init(this);
        this.hud.init(this);

        this.mapManager.generateMap();
        this.minimap.init(this); // Initialize minimap AFTER generating map
        this.stashManager.init(this); // Init Stash Manager
        this.casinoGame.init(this); // Init Casino Game
        
        // --- Populate Overworld Context First ---
        this.mapManager.currentMapId = 'overworld';
        this.mapManager.data = this.mapManager.maps['overworld'];
        this.itemManager.spawnInitialItems();
        this.enemyManager.spawnInitialEnemies();
        
        // --- Switch to Safehouse (Saves Overworld State) ---
        this.mapManager.switchMap('safehouse_interior', 5, 5);
        
        // Spawn Walkman inside Safehouse (5, 7)
        const walkman = this.itemManager.createItemById('walkman');
        if (walkman) {
            this.itemManager.onMapItems.push({
                ...walkman,
                x: 5 * this.config.TILE_SIZE,
                y: 7 * this.config.TILE_SIZE,
                width: this.config.TILE_SIZE * 0.8,
                height: this.config.TILE_SIZE * 0.8
            });
        }


        this.hud.update();
        this.utils.addMessage("NarcotiX Systems Online. Welcome, Xperient.");
        this.discovery.startIntro();

        this.utils.queueTutorial("Initiate Movement Matrix: WASD or Arrow Keys.", () => true);
        this.utils.queueTutorial("Access Personal Data-Stash: Press 'I'.", (g) => g.player.inventory.items.length > 0 || g.player.money > 10);
        this.utils.queueTutorial("Execute Subroutines (1-3) for tactical advantage.", (g) => g.player.abilities.length > 0 && g.player.money > 0);
        this.utils.queueTutorial("Interface with Highlighted Grid Nodes: Move onto Exchange Nodes (Aqua/Magenta), Xemist Contacts (Yellow).", () => true);
        this.utils.queueTutorial("Engage Hostiles: Press 'Space' for Active Disruptor or Ranged System.", (g) => g.enemyManager.list.some(e => g.utils.distance(g.player.x, g.player.y, e.x, e.y) < (g.player.equippedWeapon?.effectiveRange || g.config.TILE_SIZE) * 2));
        this.utils.queueTutorial("Reload Ranged Systems: Press 'R' when ammo is depleted.", (g) => g.player.equippedWeapon?.type === 'ranged');
        this.utils.queueTutorial("Visual Enhancement: Scroll Mouse Wheel to Zoom In/Out.", () => true);
    },

    update: function(deltaTime) {
        if (this.gameState === 'GAME_OVER') return;
        this.deltaTime = deltaTime; // Store deltaTime

        this.player.updateAbilityCooldowns();
        this.player.updateStatusEffects(deltaTime);
        this.player.updateReload(deltaTime); // Update Active Reload
        this.player.updatePlayerStatusDisplay();

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

            this.player.handleInput(deltaTime); // Player always runs on real time (unless we want to slow them too)

            if (this.gameState === 'PLAYING') {
                const scaledDt = deltaTime * this.timeScale; // World time

                this.camera.update(this.player);
                
                // Update Entities (Enemies, Items, Projectiles) using SCALED time
                if (this.entities) {
                    this.entities.forEach(e => e.update(scaledDt));
                    this.entities = this.entities.filter(e => !e.markedForDeletion);
                }

                this.enemyManager.updateEnemies(scaledDt); // Legacy list (if any remain)
                
                // Check Combat State for Music
                // const isCombat = this.enemyManager.list.some(e => e.aiState === 'CHASE' || e.aiState === 'ATTACK'); // Now handled internally
                this.soundManager.updateMusicState();

                // this.itemManager.updateItemsOnMap(scaledDt); 
                // this.projectileManager.update(scaledDt); 
                this.particleManager.update(scaledDt); 
                this.floatingTextManager.update(deltaTime); // Text usually stays real-time for readability
                this.zoneManager.update(scaledDt);
                this.randomEventManager.update(scaledDt);
            }
        }
        this.hud.update();
        this.utils.processTutorialQueue(this);
    },

    handleZoom: function(delta) {
        const zoomSpeed = this.config.CAMERA_ZOOM_SPEED;
        const newZoom = this.camera.zoom - (delta * zoomSpeed);
        this.camera.setZoom(newZoom);
    },

    render: function() {
        // Update mouse world position every frame to sync with camera movement
        if (this.mouse.screenX !== undefined) {
             this.mouse.x = (this.mouse.screenX / this.camera.zoom) + this.camera.x;
             this.mouse.y = (this.mouse.screenY / this.camera.zoom) + this.camera.y;
        }

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.save();
        
        // Apply Zoom Scaling
        this.ctx.scale(this.camera.zoom, this.camera.zoom);
        
        // Apply Camera Translation
        this.ctx.translate(-this.camera.x, -this.camera.y);

        this.mapManager.render();
        this.zoneManager.render();
        
        // Unified Entity Render Loop
        // Sort by Y for simple depth sorting
        if (this.entities) {
            this.entities.sort((a, b) => (a.y + a.height) - (b.y + b.height));
            this.entities.forEach(e => e.render(this.ctx));
        }

        this.particleManager.render(this.ctx); // Render particles
        this.player.render();
        this.questManager.renderQuestMarkers();
        this.floatingTextManager.render(this.ctx); // Render floating text

        this.ctx.restore();
        
        this.hud.renderOverlay(this.ctx); // Render UI Overlay (Compass) on top of everything

        this.minimap.render(); // Render Minimap (External Canvas)
        
        if (this.gameState === 'GAME_OVER') {
            this.ctx.fillStyle = this.config.COLORS.UI_OVERLAY;
            this.ctx.fillRect(0,0,this.canvas.width,this.canvas.height);
            this.ctx.fillStyle = this.config.COLORS.UI_TEXT_ERROR;
            this.ctx.font = '48px Courier New';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('S Y S T E M _ F A I L U R E', this.canvas.width/2, this.canvas.height/2 - 20);
            this.ctx.font = '24px Courier New';
            this.ctx.fillStyle = this.config.COLORS.UI_TEXT_PROMPT;
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
        this.entities = []; // Clear entities
        this.projectileManager.projectiles = []; // Clear legacy projectiles if any

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
        this.init(this.canvas, this.ctx);
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
            this.currentShopId = shopId; // Track current shop
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
        this.currentShopId = null;
        const shopInterfaceEl = document.getElementById('shopInterface');
        if (shopInterfaceEl) shopInterfaceEl.style.display = 'none';
        this.utils.addMessage("Disconnected from interface node.");
    },

    // Replaces closeNftPopup
    hideItemDetails: function() {
        if (this.gameState === 'NFT_VIEW') this.gameState = 'PLAYING';
        
        const detailView = document.getElementById('itemDetailView');
        const keyLegend = document.getElementById('keyLegend');
        
        if (detailView) detailView.style.display = 'none';
        if (keyLegend) keyLegend.style.display = 'block';
    },

    // Legacy support if called elsewhere, redirects to hideItemDetails
    closeNftPopup: function() {
        this.hideItemDetails();
    },

    showItemDetails: function(item) {
        if (!item) return;
        // Logic to render item details is in HUD, this manages state/visibility
        this.hud.renderItemDetails(item);
        
        const detailView = document.getElementById('itemDetailView');
        const keyLegend = document.getElementById('keyLegend');
        
        if (keyLegend) keyLegend.style.display = 'none';
        if (detailView) detailView.style.display = 'block';
        
        // If it's an NFT pickup event, we might want to pause or change state
        // But for simple inspection from inventory, we might not want to pause.
        // Assuming this is general purpose now.
    },

    consumeNftPill: function(itemId) {
        // Find the item in the inventory (it was just added)
        // We look for the last instance or findIndex
        const idx = this.player.inventory.items.findIndex(i => i.id === itemId);
        if (idx > -1) {
            this.player.useItem(idx); // This applies effect and removes 1 qty
            this.hideItemDetails();
        } else {
            this.utils.addMessage("Error: Pill not found in stash.");
            this.hideItemDetails();
        }
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

    interact: function(isAuto = false) {
        if (this.gameState !== 'PLAYING') return;
        if (isAuto && Date.now() < this.interactionCooldown) return;

        const pCenterTileX = Math.floor((this.player.x + this.player.width/2)/this.config.TILE_SIZE);
        const pCenterTileY = Math.floor((this.player.y + this.player.height/2)/this.config.TILE_SIZE);
        
        const dirs = isAuto ? [[0,0]] : [[0,0],[0,-1],[0,1],[-1,0],[1,0], [-1,-1],[-1,1],[1,-1],[1,1]];

        for (const [dx,dy] of dirs) {
            const cX = pCenterTileX + dx;
            const cY = pCenterTileY + dy;
            if(this.mapManager.isValidTile(cX,cY)){
                const tileData = this.mapManager.getTileData(cX, cY);
                if (tileData) {
                    const tileProps = TILE_PROPERTIES[tileData.type];
                    // Check for Door OR Interactive Property
                    if((tileProps && tileProps.interactive) || tileData.isDoor){
                        const tileWorldX = cX * this.config.TILE_SIZE + this.config.TILE_SIZE/2;
                        const tileWorldY = cY * this.config.TILE_SIZE + this.config.TILE_SIZE/2;

                        if (this.utils.distance(this.player.x + this.player.width/2, this.player.y + this.player.height/2, tileWorldX, tileWorldY) <= this.config.TILE_SIZE * 1.2) {
                            
                            // 1. Door Transition
                            if (tileData.isDoor) {
                                this.mapManager.switchMap(tileData.targetMap, tileData.targetX, tileData.targetY);
                                return;
                            }

                            // 2. Interactive Objects
                            if(tileData.interactionType && tileData.interactionTargetId){
                                if (this.discovery) this.discovery.markDiscovered(tileData.interactionType);
                                if (tileData.interactionType === 'xlounge_stash') {
                                    this.enterLocation('STASH', tileData.interactionTargetId); return;
                                } else if (tileData.interactionType === 'exchange_node') {
                                    this.enterLocation('SHOP', tileData.interactionTargetId); return;
                                } else if (tileData.interactionType === 'xemist_contact') {
                                    this.enterLocation('QUEST', tileData.interactionTargetId); return;
                                } else if (tileData.interactionType === 'bar') {
                                    this.enterLocation('BAR', tileData.interactionTargetId); return;
                                } else if (tileData.interactionType === 'armoury') {
                                    this.enterLocation('ARMOURY', tileData.interactionTargetId); return;
                                } else if (tileData.interactionType === 'casino') {
                                    this.enterLocation('CASINO', tileData.interactionTargetId); return;
                                }
                            }
                        }
                    }
                }
            }
        }
        if (!isAuto) this.utils.addMessage("No interactive elements detected in proximity.");
    },

    enterLocation: function(type, targetId) {
        this.gameState = 'LOCATION_TRANSITION';
        this.soundManager.playTheme(type); // Play Location Theme

        const modal = document.getElementById('locationModal');
        const titleEl = document.getElementById('locTitle');
        const descEl = document.getElementById('locDesc');
        const contentEl = document.getElementById('locContent');
        const actionsEl = document.getElementById('locActions');
        const imageEl = document.getElementById('locImage'); // Placeholder for now

        if (!modal) return;

        // Reset Content
        contentEl.innerHTML = '';
        actionsEl.innerHTML = '';
        imageEl.innerHTML = '[ Establishing Secure Connection... ]';
        imageEl.style.color = '#333';

        // 1. Setup Entry Screen (Splash)
        modal.style.display = 'block';
        
        let titleText = "Unknown Location";
        let descText = "Scanning...";
        let color = "#0FF";

        switch(type) {
            case 'SHOP': 
                titleText = "EXCHANGE NODE"; 
                descText = "Trading Protocol Initiated..."; 
                color = "#0FF";
                break;
            case 'STASH': 
                titleText = "SECURE STASH"; 
                descText = "Biometric Scan Required..."; 
                color = "#F0F";
                break;
            case 'QUEST': 
                titleText = "XEMIST CONTACT"; 
                descText = "Encrypted Channel Opening..."; 
                color = "#FF0";
                break;
            case 'BAR': 
                titleText = "THE GLITCH & TONIC"; 
                descText = "Restoring Vitality... or reducing it."; 
                color = "#F80";
                break;
            case 'ARMOURY': 
                titleText = "MUNITIONS DEPOT"; 
                descText = "Authorized Personnel Only."; 
                color = "#F00";
                break;
            case 'CASINO': 
                titleText = "LUCKY HASH CASINO"; 
                descText = "Probability Engines Spooling Up..."; 
                color = "#0F0";
                break;
        }

        titleEl.textContent = titleText;
        titleEl.style.color = color;
        titleEl.style.borderColor = color;
        descEl.textContent = descText;
        modal.style.borderColor = color;
        modal.style.boxShadow = `0 0 20px ${color}33`; // Transparent hex

        // 2. Transition Delay
        setTimeout(() => {
            imageEl.innerHTML = `[ Connected: ${titleText} ]`;
            imageEl.style.color = color;

            // 3. Load Actual Content
            switch(type) {
                case 'SHOP':
                    this.exitLocation(); // Close this splash
                    this.openShop(targetId); // Open old shop UI (or migrate later)
                    break;
                case 'STASH':
                    this.exitLocation();
                    this.stashManager.openStash();
                    break;
                case 'QUEST':
                    this.exitLocation();
                    this.questManager.interactWithQuestGiver(targetId);
                    break;
                case 'BAR':
                    this.renderBarUI(contentEl, actionsEl);
                    this.gameState = 'INTERACTION_MODE';
                    break;
                case 'ARMOURY':
                    // Re-use shop manager but filter? Or simpler bespoke UI?
                    // Let's use shopManager logic but inside this modal if possible, or just redirect to shop UI with filter.
                    // For now, redirect to specialized shop.
                    this.exitLocation();
                    this.openShop(targetId); 
                    // Note: You need to define an 'armoury' shop in shopManager.
                    break;
                case 'CASINO':
                    this.renderCasinoUI(contentEl, actionsEl);
                    this.gameState = 'MINIGAME';
                    break;
            }
        }, this.config.LOCATION_TRANSITION_DELAY_MS); 
    },

    exitLocation: function() {
        const modal = document.getElementById('locationModal');
        if(modal) modal.style.display = 'none';
        
        // Set cooldown to prevent immediate re-entry loop
        this.interactionCooldown = Date.now() + this.config.INTERACTION_COOLDOWN_MS; 
        
        this.soundManager.playTheme('WORLD'); // Restore World Theme
        this.gameState = 'PLAYING';
    },

    renderBarUI: function(container, actions) {
        container.innerHTML = `
            <p>The air smells of ozone and synthetic gin. A drone bartender polishes a glass.</p>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                <button class="button" onclick="game.buyBarDrink('synth_ale', 10)">Buy Synth-Ale (10c) - Heal 10</button>
                <button class="button" onclick="game.buyBarDrink('neon_shot', 25)">Buy Neon Shot (25c) - Speed Boost</button>
                <button class="button" onclick="game.buyBarDrink('data_tonic', 50)">Buy Data Tonic (50c) - Restore Energy</button>
            </div>
        `;
        actions.innerHTML = `<button class="button" onclick="game.exitLocation()">Leave Bar</button>`;
    },

    buyBarDrink: function(type, cost) {
        if(this.player.payMoney(cost)) {
            if(type === 'synth_ale') { this.player.heal(10); this.utils.addMessage("Refreshing."); }
            if(type === 'neon_shot') { this.player.applyStatusEffect("Speed Boost", 10000, {speedMultiplier:1.2}); this.utils.addMessage("Systems accelerating!"); }
            if(type === 'data_tonic') { this.player.energy = Math.min(this.player.maxEnergy, this.player.energy + 20); this.utils.addMessage("Energy restored."); }
        } else {
            this.utils.addMessage("Insufficient Creds.");
        }
    },

    renderCasinoUI: function(container, actions) {
        console.log("[Casino] Rendering Casino UI.");
        this.casinoGame.renderUI(container, actions);
    },

    playCasinoHighLow: function(bet) {
        // Deprecated by Slot Machine
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
