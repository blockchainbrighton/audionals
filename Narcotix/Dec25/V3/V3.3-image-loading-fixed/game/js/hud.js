import { getWeaponData, weaponTypes } from './player/playerWeapons.js';

export const hud = {
    game: null,
    init: function(gameInstance) {
        this.game = gameInstance;
    },
    update: function() {
        if (!this.game || !this.game.player) return; // Ensure game and player are initialized

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
    },

    showNftPickup: function(item) {
        // Redirect to new item detail view
        this.game.showItemDetails(item);
        this.game.gameState = 'NFT_VIEW'; // Pause for initial pickup
    },

    renderItemDetails: function(item) {
        const container = document.getElementById('itemDetailView');
        if (!container) return;

        let content = '';
        const index = this.game.player.inventory.items.indexOf(item);
        const inInventory = index > -1;

        if (item.nftTraits) {
            // --- NFT / PILL DISPLAY ---
            const traits = item.nftTraits || {};
            const id = traits.id || '?';
            const hex1 = traits.hex1 || '#FFFFFF';
            const hex2 = traits.hex2 || '#FFFFFF';
            const effect = traits.effect || 'Unknown';
            const sideEffect = traits.sideEffect || traits['sideEffect.'] || 'None';

            console.log(`[HUD NFT] Initial item.imageUrl for ${item.name} (ID: ${id}): ${item.imageUrl}`);
            const CONTRACT = 'SP8HMQP4Q63V3E6SXXPXZ4WJXA263HBD95QY2AM3.narcotix';
            let cacheUrl = item.imageUrl;
            
            if (!cacheUrl || cacheUrl === 'undefined') { // Check for explicit 'undefined' string which might come from CSV
                cacheUrl = `https://assets.hiro.so/api/mainnet/token-metadata-api/${CONTRACT}/${id}.png`;
                console.log(`[HUD NFT] Using fallback cacheUrl for ${item.name} (ID: ${id}): ${cacheUrl}`);
            } else {
                console.log(`[HUD NFT] Using direct item.imageUrl for ${item.name} (ID: ${id}): ${cacheUrl}`);
            }

            // IPFS Fallback URL
            const ipfsUrl = `https://ipfs.io/ipfs/QmbDXZ5xbx9oKD1F6kXmv9gJ3FCKfN9yuoHad9zi8ndkVo/images/%23${id}.png`;

            content = `
                <h3 style="margin: 0 0 10px 0; color: #fff; text-shadow: 0 0 5px ${hex1}; border-bottom: 1px solid ${hex1}; padding-bottom: 5px;">${item.name}</h3>
                
                <div style="text-align: center; margin-bottom: 10px;">
                    <img src="${cacheUrl}" alt="${item.name}" 
                         referrerpolicy="no-referrer"
                         style="width: 100%; max-width: 200px; border: 1px solid #333; box-shadow: 0 0 10px rgba(0,0,0,0.5);"
                         onerror="
                            if (!this.src.includes('ipfs.io')) { 
                                console.warn('[HUD NFT Error] Hiro/Cache failed for ID ${id}. Trying IPFS fallback...'); 
                                this.src='${ipfsUrl}'; 
                            } else { 
                                this.onerror=null; 
                                this.src='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='; 
                                console.warn('[HUD NFT Critical] IPFS fallback also failed for ID ${id}.'); 
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
                </div>

                <div style="margin-top:15px; display:flex; flex-direction: column; gap:8px;">
                    <button class="button" onclick="game.hideItemDetails()">Pocket the stuff</button>
                    ${inInventory ? `<button class="button" style="background-color:rgba(255, 0, 0, 0.2); border-color:#F55; color:#F55;" onclick="game.consumeNftPill('${item.id}')">Consume Now</button>` : ''}
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
            const char = item.char || wData?.char || 'W';
            const color = wData?.color || '#FFF';

            content = `
                <h3 style="margin: 0 0 10px 0; color: ${color}; border-bottom: 1px solid ${color}; padding-bottom: 5px;">${item.name}</h3>
                
                <div style="text-align: center; margin-bottom: 20px; font-size: 64px; color: ${color}; text-shadow: 0 0 10px ${color};">
                    ${char}
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

                <div style="margin-top:20px; display:flex; flex-direction: column; gap:8px;">
                     ${inInventory ? `<button class="button" onclick="game.player.useItem(${index}); game.hideItemDetails();">Equip</button>` : ''}
                    <button class="button" onclick="game.hideItemDetails()">Close</button>
                </div>
            `;

        } else if (item.type === 'ammo') {
            // --- AMMO DISPLAY ---
            const char = item.char || '∙';
            
            content = `
                <h3 style="margin: 0 0 10px 0; color: #FFD700; border-bottom: 1px solid #FFD700; padding-bottom: 5px;">${item.name}</h3>
                
                <div style="text-align: center; margin-bottom: 20px; font-size: 64px; color: #FFD700; text-shadow: 0 0 10px #C5A000;">
                    ${char}
                </div>
                
                <div class="traits" style="font-size: 0.9em;">
                    <div><span style="color:#aaa;">Quantity:</span> <span style="color:#fff;">${item.quantity}</span></div>
                    <div style="margin-top: 10px; color:#ddd;">${item.description || "Ammunition."}</div>
                </div>

                <div style="margin-top:20px; display:flex; flex-direction: column; gap:8px;">
                    <button class="button" onclick="game.hideItemDetails()">Close</button>
                </div>
            `;

        } else {
            // --- GENERIC / CONSUMABLE DISPLAY ---
            // Fallback for non-NFT consumables or other items
            const char = item.char || '?';
            const color = item.color || '#0FF';

            content = `
                <h3 style="margin: 0 0 10px 0; color: ${color}; border-bottom: 1px solid ${color}; padding-bottom: 5px;">${item.name}</h3>
                
                <div style="text-align: center; margin-bottom: 20px; font-size: 64px; color: ${color}; text-shadow: 0 0 10px ${color};">
                    ${char}
                </div>
                
                <div class="traits" style="font-size: 0.9em;">
                    <div style="margin-bottom: 10px; color:#ddd;">${item.description || "No description available."}</div>
                    ${item.stackable ? `<div><span style="color:#aaa;">Stack:</span> <span style="color:#fff;">${item.quantity}</span></div>` : ''}
                </div>

                <div style="margin-top:20px; display:flex; flex-direction: column; gap:8px;">
                    ${inInventory && (item.type === 'consumable' || item.effect) ? `<button class="button" onclick="game.player.useItem(${index}); game.hideItemDetails();">Use</button>` : ''}
                    <button class="button" onclick="game.hideItemDetails()">Close</button>
                </div>
            `;
        }

        container.innerHTML = content;
    }
};