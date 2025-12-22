import { getWeaponData, weaponTypes } from '../player/playerWeapons.js';
import { imageLoader } from '../core/imageLoader.js';

export const hud = {
    game: null,
    activeItemIndex: -1, // Track which item is being inspected
    showAllPois: false, // Admin flag to show all arrows
    
    // Admin Speed State
    adminSpeedToggleActive: false,
    adminSpeedTimeout: null,

// Helper for mapping POI types to display names
    poiNames: {
        'xlounge_stash': 'Safehouse Stash',
        'exchange_node': 'Exchange Node',
        'bar': 'The Glitch & Tonic',
        'armoury': 'Sector 7 Armoury',
        'casino': 'Lucky Hash Casino',
        'xemist_contact': 'Xemist Contact',
        'default': 'Location'
    },
    
    initialized: false, // Flag to prevent double init

    init: function(gameInstance) {
        if (this.initialized) return; // Prevent duplicate init
        console.log("[HUD] init called");
        this.game = gameInstance;
        this.setupInput();
        this.initialized = true;

        // Event Listeners
        this.game.events.on('PLAYER_STATS_UPDATED', () => this.update());
        this.game.events.on('PLAYER_GANG_UPDATED', () => this.updateGangDisplay());
        this.game.events.on('WEAPON_UPDATED', () => this.update());
        this.game.events.on('PLAYER_INVENTORY_UPDATED', () => this.update());
        
        // Mousemove for directional indicator hover
        this.game.canvas.addEventListener('mousemove', (e) => {
            if (this.game.mapManager.currentMapId !== 'overworld' || !this.game.minimap || !this.game.minimap.poiCache) {
                this.hoveredPoi = null;
                this.game.canvas.style.cursor = 'default';
                return;
            }

            const canvasRect = this.game.canvas.getBoundingClientRect();
            // Scaling logic: Mouse Event (CSS pixels) -> Internal Canvas Resolution
            const scaleX = this.game.canvas.width / canvasRect.width;
            const scaleY = this.game.canvas.height / canvasRect.height;

            const mouseX = (e.clientX - canvasRect.left) * scaleX;
            const mouseY = (e.clientY - canvasRect.top) * scaleY;

            const arrowSize = 20; // Hitbox size

            let newHovered = null;

            this.game.minimap.poiCache.forEach(poi => {
                // Respect discovery logic OR Admin override
                if (!this.showAllPois && this.game.discovery && !this.game.discovery.shouldShowPoi(poi.type)) return;
                
                const targetPos = this.calculateArrowPosition(poi);
                if (!targetPos) return; // POI is on screen

                // AABB check for hover
                if (mouseX > targetPos.x - arrowSize && mouseX < targetPos.x + arrowSize &&
                    mouseY > targetPos.y - arrowSize && mouseY < targetPos.y + arrowSize) {
                    newHovered = {
                        name: this.poiNames[poi.type] || this.poiNames.default,
                        x: targetPos.x,
                        y: targetPos.y,
                        color: poi.color,
                        type: poi.type
                    };
                }
            });

            if (newHovered) {
                this.hoveredPoi = newHovered;
                this.game.canvas.style.cursor = 'pointer';
            } else {
                this.hoveredPoi = null;
                this.game.canvas.style.cursor = 'default';
            }
        });
    },

    calculateArrowPosition: function(poi) {
        const player = this.game.player;
        const camera = this.game.camera;
        const screenW = this.game.canvas.width;
        const screenH = this.game.canvas.height;
        const margin = 30;
        const centerX = screenW / 2;
        const centerY = screenH / 2;

        const px = poi.x;
        const py = poi.y;

        // Check visibility
        if (this.game.utils.checkCameraVisibility({x: px, y: py, width: 32, height: 32}, camera)) {
            return null; // Visible
        }

        // Calculate angle from player center to POI center
        const pCenterX = player.x + player.width/2;
        const pCenterY = player.y + player.height/2;
        const dx = px - pCenterX;
        const dy = py - pCenterY;
        const angle = Math.atan2(dy, dx);

        // Project intersection with screen bounds
        let targetX, targetY;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        
        const halfWidth = screenW / 2 - margin;
        const halfHeight = screenH / 2 - margin;

        // Calculate parameter t for line-rectangle intersection
        // Ray: P = Center + t * Dir
        // Bounds: x = +/- halfWidth, y = +/- halfHeight
        
        // Check vertical walls (x = +/- halfWidth)
        const tX = halfWidth / Math.abs(cos);
        // Check horizontal walls (y = +/- halfHeight)
        const tY = halfHeight / Math.abs(sin);

        // Use the smaller t (first intersection)
        const t = Math.min(tX, tY);

        targetX = centerX + t * cos;
        targetY = centerY + t * sin;

        return { x: targetX, y: targetY, angle: angle };
    },

    setupInput: function() {
        console.log("[HUD] setupInput called - adding keydown listener");
        window.addEventListener('keydown', (e) => {
            if (e.repeat) return; // Prevent hold-down repeating
            const key = e.key.toLowerCase();
            
            // ADMIN HOTKEYS
            if (key === 'a') {
                console.log(`[HUD Input] 'A' pressed. Current state: ${this.showAllPois}`);
                this.showAllPois = !this.showAllPois;
                this.game.utils.addMessage(`[ADMIN] Show All POIs: ${this.showAllPois ? 'ON' : 'OFF'}`);
            }

            if (key === 's') {
                this.adminSpeedToggleActive = true;
                this.game.utils.addMessage(`[ADMIN] Speed Mode: Press 1-9...`);
                
                if (this.adminSpeedTimeout) clearTimeout(this.adminSpeedTimeout);
                this.adminSpeedTimeout = setTimeout(() => {
                    if (this.adminSpeedToggleActive) {
                        this.adminSpeedToggleActive = false;
                        this.game.utils.addMessage(`[ADMIN] Speed Mode: Timed Out.`);
                    }
                }, 2000);
            }

            if (this.adminSpeedToggleActive && key >= '1' && key <= '9') {
                const multiplier = parseInt(key);
                if (this.game.player) {
                    // Use defaultBaseSpeed as reference if available, else fallback to 150
                    const base = this.game.player.defaultBaseSpeed || 150;
                    this.game.player.baseSpeed = base * multiplier;
                    this.game.utils.addMessage(`[ADMIN] Speed set to ${multiplier}x (Base: ${this.game.player.baseSpeed})`);
                }
                this.adminSpeedToggleActive = false;
                if (this.adminSpeedTimeout) clearTimeout(this.adminSpeedTimeout);
            }

            const detailView = document.getElementById('itemDetailView');
            if (detailView && detailView.style.display === 'block') {
                const index = this.activeItemIndex;
                const inInventory = index > -1;

                if (inInventory) {
                    const item = this.game.player.inventory.items[index];
                    // Equip (E) - For weapons/gadgets
                    if (key === 'e' && (item.type === 'weapon' || item.type === 'gadget')) {
                        this.game.player.useItem(index);
                        this.game.hideItemDetails();
                    }
                    // Use (U) - For consumables
                    else if (key === 'u' && (item.type === 'consumable' || item.effect)) {
                        this.game.player.useItem(index);
                        this.game.hideItemDetails();
                    }
                    // Drop (D) - For all items
                    else if (key === 'd') {
                        this.game.player.dropItem(index);
                    }
                }
                
                // Close (C) - Always available
                if (key === 'c') {
                    this.game.hideItemDetails();
                }
            }
        });
    },

    update: function() {
        if (!this.game || !this.game.player) return; // Ensure game and player are initialized

        // ... (Existing HUD updates) ...
        const playerHealthEl = document.getElementById('playerHealth');
        if (playerHealthEl) playerHealthEl.textContent = Math.max(0, Math.ceil(this.game.player.hp));
        
        const playerMaxHealthEl = document.getElementById('playerMaxHealth');
        if (playerMaxHealthEl) playerMaxHealthEl.textContent = this.game.player.maxHp;

        const playerMoneyEl = document.getElementById('playerMoney');
        if (playerMoneyEl) playerMoneyEl.textContent = this.game.player.money;

        // Reload Bar
        const reloadContainer = document.getElementById('reloadContainer');
        const reloadBar = document.getElementById('reloadBar');
        if (this.game.player.isReloading) {
            if (reloadContainer) reloadContainer.style.display = 'block';
            if (reloadBar) {
                const elapsed = Date.now() - this.game.player.reloadStartTime;
                const pct = Math.min(100, (elapsed / this.game.player.reloadDuration) * 100);
                reloadBar.style.width = `${pct}%`;
                
                // Visual feedback for sweet spot (50-70%)
                if (pct >= 50 && pct <= 70) reloadBar.style.backgroundColor = '#FF0'; // Yellow
                else reloadBar.style.backgroundColor = '#0FF'; // Cyan
            }
        } else {
            if (reloadContainer) reloadContainer.style.display = 'none';
        }

        // Ensure Gang Display is updated
        if (this.game.player.gang) {
            this.updateGangDisplay();
        }

        this.renderDirectionalIndicators();
    },

    renderDirectionalIndicators: function() {
        // Only draw if we are in the Overworld and have a valid context
        if (this.game.mapManager.currentMapId !== 'overworld' || !this.game.minimap || !this.game.minimap.poiCache) return;

        const ctx = this.game.ctx;
        const player = this.game.player;
        const camera = this.game.camera;
        
        // Screen Dimensions
        const screenW = this.game.canvas.width;
        const screenH = this.game.canvas.height;
        const margin = 20; // Padding from edge

        // We need to draw on the MAIN canvas, but after the game world render?
        // Game.render() calls hud.update() at the end? 
        // No, game.update() calls hud.update(). 
        // hud.update() manipulates DOM. 
        // To draw on CANVAS, we should attach this to the game.render loop or do it here.
        // Doing it here is risky because game.render() clears the screen.
        // game.render() calls everything then restores context.
        // Let's check game.js: game.render() ends with ctx.restore().
        // DOM updates happen in game.update().
        // We need a hook in game.render() to draw UI overlays on the canvas.
        
        // For now, let's inject this into game.js render loop via a new method call if possible, 
        // OR simply realize we can't draw to canvas here effectively if it's cleared immediately after.
        // Actually, game.render is called AFTER game.update. 
        // So anything drawn here is cleared.
        
        // Strategy: We need to add a `game.hud.renderOverlay(ctx)` method and call it in `game.render`.
    },

    renderOverlay: function(ctx) {
        if (this.game.mapManager.currentMapId !== 'overworld' || !this.game.minimap || !this.game.minimap.poiCache) return;

        const screenW = this.game.canvas.width;
        const screenH = this.game.canvas.height;

        this.game.minimap.poiCache.forEach(poi => {
            // Respect discovery logic OR Admin override
            if (!this.showAllPois && this.game.discovery && !this.game.discovery.shouldShowPoi(poi.type)) return;
            
            const targetPos = this.calculateArrowPosition(poi);
            if (!targetPos) return; // POI is on screen

            const targetX = targetPos.x;
            const targetY = targetPos.y;
            const angle = targetPos.angle;

            // Draw Indicator (Arrow)
            ctx.save();
            ctx.translate(targetX, targetY);
            ctx.rotate(angle);
            
            ctx.fillStyle = poi.color;
            ctx.beginPath();
            ctx.moveTo(10, 0);
            ctx.lineTo(-10, 5);
            ctx.lineTo(-10, -5);
            ctx.closePath();
            ctx.fill();
            ctx.restore();

            // Draw label if hovered
            if (this.hoveredPoi && this.hoveredPoi.type === poi.type) { // Compare by type for simplicity
                ctx.save();
                ctx.font = '16px "Press Start 2P", monospace'; // Pixel font fallback
                ctx.fillStyle = this.hoveredPoi.color;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.shadowColor = 'black';
                ctx.shadowBlur = 4;
                
                // Adjust position to be next to the arrow, not on top
                // Push text inward towards center slightly to ensure it's on screen
                let textX = targetX - Math.cos(angle) * 40; 
                let textY = targetY - Math.sin(angle) * 40;

                // Simple clamp for text box
                if (textX < 80) textX = 80;
                if (textX > screenW - 80) textX = screenW - 80;
                if (textY < 20) textY = 20;
                if (textY > screenH - 20) textY = screenH - 20;

                ctx.fillText(this.hoveredPoi.name, textX, textY);
                ctx.shadowBlur = 0;
                ctx.restore();
            }
        });
    },

    showNftPickup: function(item) {
        // Redirect to new item detail view
        this.game.showItemDetails(item);
        this.game.gameState = 'NFT_VIEW'; // Pause for initial pickup
    },

    updateGangDisplay: function() {
        const gang = this.game.player.gang;
        const container = document.getElementById('gangStatus');
        if (!gang || !container) {
            if(container) container.style.display = 'none';
            return;
        }

        container.style.display = 'block';
        
        // Name & Symbol
        const nameEl = document.getElementById('gangName');
        if (nameEl) nameEl.textContent = `${gang.GangName} [${gang.ExpressionSymbol}]`;
        
        // Description
        const descEl = document.getElementById('gangDesc');
        if (descEl) descEl.textContent = gang.Description;

        // Stats Grid
        const statsEl = document.getElementById('gangStats');
        if (statsEl) {
            // Helper for color coding stats
            const fmt = (val, isGoodHigh = true) => {
                if (val === 1.0) return `<span style="color:#777;">${val}x</span>`;
                const color = (val > 1.0 === isGoodHigh) ? '#0F0' : '#F66';
                return `<span style="color:${color}; font-weight:bold;">${val}x</span>`;
            };

            // Trait list
            const traits = [];
            if(gang.Archetype) traits.push(`<span style="color:#EA0;">${gang.Archetype}</span>`);
            if(gang.OnKillEffect && gang.OnKillEffect !== 'None') traits.push(`Kill: <span style="color:#0FF;">${gang.OnKillEffect}</span>`);
            
            statsEl.innerHTML = `
                <div>HP: ${fmt(gang.HpMod)}</div>
                <div>SPD: ${fmt(gang.SpeedMod)}</div>
                <div>DMG: ${fmt(gang.DamageMod)}</div>
                <div>DEF: ${fmt(gang.DefenseMod, false)}</div> 
                <div>LUCK: ${gang.LuckMod > 0 ? '<span style="color:#0F0;">+'+gang.LuckMod+'</span>' : '<span style="color:#777;">0</span>'}</div>
                <div>$$$: ${fmt(gang.PriceMod, false)}</div>
                <div style="grid-column: span 2; margin-top:4px; border-top:1px solid #333; padding-top:2px;">
                    ${traits.join(' | ')}
                </div>
            `;
        }
    },

    updateMissionDisplay: function(mission) {
        let missionBox = document.getElementById('missionDisplay');
        if (!missionBox) {
            // Create it if missing
            missionBox = document.createElement('div');
            missionBox.id = 'missionDisplay';
            missionBox.style.position = 'fixed';
            missionBox.style.top = '10px';
            missionBox.style.left = '50%';
            missionBox.style.transform = 'translateX(-50%)';
            missionBox.style.backgroundColor = 'rgba(0, 20, 0, 0.8)';
            missionBox.style.border = '1px solid #0F0';
            missionBox.style.padding = '10px';
            missionBox.style.color = '#0F0';
            missionBox.style.fontFamily = '"Press Start 2P", monospace';
            missionBox.style.fontSize = '12px';
            missionBox.style.zIndex = '1000';
            missionBox.style.minWidth = '300px';
            missionBox.style.textAlign = 'center';
            missionBox.style.boxShadow = '0 0 10px #0F0';
            document.body.appendChild(missionBox);
        }

        missionBox.style.display = 'block';
        missionBox.innerHTML = `
            <div style="font-size: 10px; color: #888; margin-bottom:5px;">CURRENT OBJECTIVE</div>
            <div style="font-size: 14px; font-weight: bold; margin: 5px 0; color: #fff;">${mission.title}</div>
            <div style="font-size: 12px; color: #aaa;">${mission.description}</div>
        `;
        
        // Narrative / Dialogue Box (Neural Link)
        if (mission.dialogue) {
            this.showNeuralLink(mission.dialogue);
        }
    },

    clearMissionDisplay: function() {
        const missionBox = document.getElementById('missionDisplay');
        if (missionBox) {
            missionBox.style.display = 'none';
        }
    },

    showNeuralLink: function(text) {
        let linkBox = document.getElementById('neuralLink');
        if (!linkBox) {
             linkBox = document.createElement('div');
             linkBox.id = 'neuralLink';
             linkBox.style.position = 'fixed';
             linkBox.style.bottom = '150px';
             linkBox.style.left = '50%';
             linkBox.style.transform = 'translateX(-50%)';
             linkBox.style.backgroundColor = 'rgba(0, 0, 30, 0.95)';
             linkBox.style.border = '1px solid #0FF';
             linkBox.style.padding = '15px';
             linkBox.style.color = '#0FF';
             linkBox.style.fontFamily = '"Courier New", monospace';
             linkBox.style.fontSize = '16px';
             linkBox.style.zIndex = '1000';
             linkBox.style.maxWidth = '600px';
             linkBox.style.minWidth = '400px';
             linkBox.style.boxShadow = '0 0 15px #0FF';
             linkBox.style.display = 'none';
             
             document.body.appendChild(linkBox);
        }
        
        linkBox.innerHTML = `<div style="display:flex; align-items:center;"><div style="font-size:24px; margin-right:15px;">📡</div><div><span style="color:#FFF; font-weight:bold;">[HANDLER]:</span> ${text}</div></div>`;
        linkBox.style.display = 'block';
        
        // Auto-hide after 8 seconds
        if (this.neuralLinkTimeout) clearTimeout(this.neuralLinkTimeout);
        this.neuralLinkTimeout = setTimeout(() => {
            linkBox.style.display = 'none';
        }, 8000);
    },

    renderItemDetails: function(item) {
        const container = document.getElementById('itemDetailView');
        if (!container) return;

        let content = '';
        const index = this.game.player.inventory.items.indexOf(item);
        const inInventory = index > -1;
        this.activeItemIndex = index; // Store for hotkey handling

        if (item.nftTraits) {
            // --- NFT / PILL DISPLAY ---
            const traits = item.nftTraits || {};
            const id = traits.id || '?';
            const hex1 = traits.hex1 || '#FFFFFF';
            const hex2 = traits.hex2 || '#FFFFFF';
            const effect = traits.effect || 'Unknown';
            const sideEffect = traits.sideEffect || traits['sideEffect.'] || 'None';

            console.log(`[HUD NFT] Initial item.imageUrl for ${item.name} (ID: ${id}): ${item.imageUrl}`);
            
            // Logic to distinguish real NFTs from items with "fake" traits (Walkman, Generic Pills)
            let cacheUrl;
            let ipfsUrl;

            if (id && id !== '?') {
                // Real NFT: Use loader for CORS/Cache logic
                cacheUrl = imageLoader.getUrl(id);
                // IPFS Fallback
                ipfsUrl = `https://ipfs.io/ipfs/QmbDXZ5xbx9oKD1F6kXmv9gJ3FCKfN9yuoHad9zi8ndkVo/images/%23${id}.png?cors=1`;
            } else {
                // Local/Special Item (Walkman): Use defined URL
                cacheUrl = item.imageUrl || 'artwork/narcotix_pill.svg';
                // No IPFS fallback for local assets, use same URL or a placeholder to prevent error logic triggering wrongly
                ipfsUrl = cacheUrl; 
            }

            console.log(`[HUD NFT] Resolved URL for ${item.name} (ID: ${id}): ${cacheUrl}`);

            // --- FETCH FULL TAXONOMY DETAILS ---
            let taxonomyDetailsHtml = '';
            // We can re-derive the matches using the effect string, similar to itemManager
            const taxMatches = this.game.itemManager.getTaxonomyMatches(effect, id);
            
            if (taxMatches && taxMatches.length > 0) {
                const match = taxMatches[0]; // Primary match
                taxonomyDetailsHtml = `
                    <div style="margin-top: 10px; padding-top: 8px; border-top: 1px dashed #555;">
                        <div style="color: #FFD700; font-size: 0.85em; font-weight: bold; margin-bottom: 4px;">CLASS: ${match.EffectGroup}</div>
                        <div style="font-size: 0.8em; color: #EEE; display: grid; grid-template-columns: auto 1fr; gap: 4px;">
                            <span style="color: #AAA;">Power:</span> <span style="color: #0F0;">${match.GameMechanic}</span>
                            <span style="color: #AAA;">Visual:</span> <span style="color: #0FF;">${match.VisualEffect}</span>
                            <span style="color: #AAA;">Risk:</span> <span style="color: #F66;">${match.SideEffectMechanic || 'None'}</span>
                        </div>
                    </div>
                `;
            }

            content = `
                <h3 style="margin: 0 0 10px 0; color: #fff; text-shadow: 0 0 5px ${hex1}; border-bottom: 1px solid ${hex1}; padding-bottom: 5px;">${item.name}</h3>
                
                <div style="text-align: center; margin-bottom: 10px;">
                    <img src="${cacheUrl}" alt="${item.name}" 
                         crossorigin="anonymous"
                         referrerpolicy="no-referrer"
                         style="width: 100%; max-width: 200px; border: 1px solid #333; box-shadow: 0 0 10px rgba(0,0,0,0.5);"
                         onerror="
                            const currentSrc = this.src;
                            if (!currentSrc.includes('ipfs.io')) { 
                                console.warn('[HUD NFT Error] Hiro/Cache failed for ID ${id} (' + currentSrc + '). Trying IPFS fallback: ${ipfsUrl}'); 
                                this.src='${ipfsUrl}'; 
                            } else { 
                                this.onerror=null; 
                                this.src='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='; 
                                console.warn('[HUD NFT Critical] IPFS fallback also failed for ID ${id} (' + currentSrc + ').'); 
                            }
                         ">
                                </div>
                
                                <div class="traits" style="font-size: 0.9em;">
                                    <div style="margin-bottom: 8px;">
                                        <span style="color: #aaa;">Colors:</span> 
                                        <span style="display:inline-block; width:12px; height:12px; background-color:${hex1}; border:1px solid #fff; margin: 0 4px;"></span>
                                        <span style="display:inline-block; width:12px; height:12px; background-color:${hex2}; border:1px solid #fff;"></span>
                                    </div>
                
                                    <div style="margin-bottom: 8px;">
                                        <div style="color: #0FF; margin-bottom: 2px;">Effect:</div>
                                        <div style="color:#fff; padding:5px; border-left: 2px solid ${hex1}; background:rgba(255,255,255,0.05);">
                                            ${effect}
                                        </div>
                                    </div>
                
                                    <div style="margin-bottom: 8px;">
                                        <div style="color: #F0F; margin-bottom: 2px;">Side Effect:</div>
                                        <div style="color:#ddd; padding:5px; border-left: 2px solid ${hex2}; background:rgba(255,255,255,0.05);">
                                            ${sideEffect}
                                        </div>
                                    </div>

                                    ${taxonomyDetailsHtml}
                                </div>
                            `;
                        } else if (item.type === 'weapon') {
                            // --- WEAPON DISPLAY ---
                            const wData = getWeaponData(item.weaponId, this.game.config);
                            // Fallback stats if wData fails (shouldn't happen for valid items)
                            const dmg = wData ? wData.damage : '?';
                            const speed = wData ? wData.attackSpeed : '?';
                            const range = wData ? Math.floor(wData.effectiveRange) : '?';
                            const ammoCap = wData && wData.type === weaponTypes.RANGED ? wData.ammoCapacity : 'N/A';
                            const reloadTime = wData && wData.type === weaponTypes.RANGED ? "2.0s" : 'N/A';
                            const desc = item.description || wData?.description || "A weapon.";
                            // const char = item.char || wData?.char || 'W'; // No longer primary display
                            const color = wData?.color || '#FFF';
                            const imageUrl = `artwork/${item.weaponId}.svg`;
                
                            content = `
                                <h3 style="margin: 0 0 10px 0; color: ${color}; border-bottom: 1px solid ${color}; padding-bottom: 5px;">${item.name}</h3>
                                
                                <div style="text-align: center; margin-bottom: 20px;">
                                    <img src="${imageUrl}" alt="${item.name}" 
                                         crossorigin="anonymous"
                                         style="width: 128px; height: 128px; image-rendering: pixelated; border: 1px solid ${color}; background: rgba(0,0,0,0.5); padding: 10px;"
                                         onerror="this.onerror=null; this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNiAxNiI+PHRleHQgeD0iNSIgeT0iMTIiIGZpbGw9IiNGRkYiPj88L3RleHQ+PC9zdmc+';">
                                </div>
                                
                                <div class="traits" style="font-size: 0.9em; display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                                    <div><span style="color:#aaa;">Damage:</span> <span style="color:#fff;">${dmg}</span></div>
                                    <div><span style="color:#aaa;">Fire Rate:</span> <span style="color:#fff;">${speed}ms</span></div>
                                    <div><span style="color:#aaa;">Range:</span> <span style="color:#fff;">${range}px</span></div>
                                    ${wData && wData.type === weaponTypes.RANGED ? `
                                        <div><span style="color:#aaa;">Mag Size:</span> <span style="color:#fff;">${ammoCap}</span></div>
                                        <div><span style="color:#aaa;">Reload:</span> <span style="color:#fff;">${reloadTime}</span></div>
                                        <div><span style="color:#aaa;">Ammo Type:</span> <span style="color:#fff;">${wData.projectileType || 'Standard'}</span></div>
                                    ` : ''}
                                </div>
                                
                                <div style="margin-top: 15px; font-style: italic; color: #ccc; border-top: 1px solid #444; padding-top: 10px;">
                                    ${desc}
                                </div>
                            `;
                
                        } else if (item.type === 'ammo') {
                            // --- AMMO DISPLAY ---
                            // const char = item.char || '∙';
                            const imageUrl = `artwork/${item.id}.svg`;
                            
                            content = `
                                <h3 style="margin: 0 0 10px 0; color: #FFD700; border-bottom: 1px solid #FFD700; padding-bottom: 5px;">${item.name}</h3>
                                
                                <div style="text-align: center; margin-bottom: 20px;">
                                    <img src="${imageUrl}" alt="${item.name}" 
                                         crossorigin="anonymous"
                                         style="width: 128px; height: 128px; image-rendering: pixelated; border: 1px solid #FFD700; background: rgba(0,0,0,0.5); padding: 10px;"
                                         onerror="this.onerror=null; this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNiAxNiI+PHRleHQgeD0iNSIgeT0iMTIiIGZpbGw9IiNGRkYiPj88L3RleHQ+PC9zdmc+';">
                                </div>
                                
                                <div class="traits" style="font-size: 0.9em;">
                                    <div><span style="color:#aaa;">Quantity:</span> <span style="color:#fff;">${item.quantity}</span></div>
                                    <div style="margin-top: 10px; color:#ddd;">${item.description || "Ammunition."}</div>
                                </div>
                            `;
        } else {
            // --- GENERIC / CONSUMABLE DISPLAY ---
            // Fallback for non-NFT consumables or other items
            // const char = item.char || '?'; // No longer primary display
            const color = item.color || '#0FF';
            const imageUrl = item.imageUrl || `artwork/${item.id}.svg`;

            content = `
                <h3 style="margin: 0 0 10px 0; color: ${color}; border-bottom: 1px solid ${color}; padding-bottom: 5px;">${item.name}</h3>
                
                <div style="text-align: center; margin-bottom: 20px;">
                    <img src="${imageUrl}" alt="${item.name}" 
                         crossorigin="anonymous"
                         style="width: 128px; height: 128px; image-rendering: pixelated; border: 1px solid ${color}; background: rgba(0,0,0,0.5); padding: 10px;"
                         onerror="this.onerror=null; this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNiAxNiI+PHRleHQgeD0iNSIgeT0iMTIiIGZpbGw9IiNGRkYiPj88L3RleHQ+PC9zdmc+';">
                </div>
                
                <div class="traits" style="font-size: 0.9em;">
                    <div style="margin-bottom: 10px; color:#ddd;">${item.description || "No description available."}</div>
                    ${item.stackable ? `<div><span style="color:#aaa;">Stack:</span> <span style="color:#fff;">${item.quantity}</span></div>` : ''}
                </div>
            `;
        }

        // --- UNIFIED BUTTON LOGIC ---
        let actionButtons = '';
        if (inInventory) {
            // Equip Action
            if (item.type === 'weapon' || item.type === 'gadget') {
                 actionButtons += `<button class="button" onclick="game.player.useItem(${index}); game.hideItemDetails();"><span style="text-decoration:underline; color:#FF0;">E</span>quip</button>`;
            } 
            // Use/Consume Action
            else if (item.type === 'consumable' || item.effect) {
                 actionButtons += `<button class="button" onclick="game.player.useItem(${index}); game.hideItemDetails();"><span style="text-decoration:underline; color:#FF0;">U</span>se</button>`;
            }
            
            // Drop Action (Available for all inventory items)
            actionButtons += `<button class="button" onclick="game.player.dropItem(${index});"><span style="text-decoration:underline; color:#FF0;">D</span>rop</button>`;
        }

        // Close Action (Always available)
        actionButtons += `<button class="button" onclick="game.hideItemDetails()"><span style="text-decoration:underline; color:#FF0;">C</span>lose</button>`;

        content += `
            <div style="margin-top:20px; display:flex; flex-direction: column; gap:8px; border-top: 1px solid #444; padding-top: 10px;">
                ${actionButtons}
            </div>
        `;

        container.innerHTML = content;
    }
};
