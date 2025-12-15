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

        const traits = item.nftTraits || {};
        const id = traits.id || '?';
        const hex1 = traits.hex1 || '#FFFFFF';
        const hex2 = traits.hex2 || '#FFFFFF';
        const effect = traits.effect || 'Unknown';
        const sideEffect = traits.sideEffect || traits['sideEffect.'] || 'None';

        const CONTRACT = 'SP8HMQP4Q63V3E6SXXPXZ4WJXA263HBD95QY2AM3.narcotix';
        const cacheUrl = item.imageUrl || `https://assets.hiro.so/api/mainnet/token-metadata-api/${CONTRACT}/${id}.png`;

        container.innerHTML = `
            <h3 style="margin: 0 0 10px 0; color: #fff; text-shadow: 0 0 5px ${hex1}; border-bottom: 1px solid ${hex1}; padding-bottom: 5px;">${item.name}</h3>
            
            <div style="text-align: center; margin-bottom: 10px;">
                <img src="${cacheUrl}" alt="${item.name}" 
                     style="width: 100%; max-width: 200px; border: 1px solid #333; box-shadow: 0 0 10px rgba(0,0,0,0.5);">
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
                <button class="button" style="background-color:rgba(255, 0, 0, 0.2); border-color:#F55; color:#F55;" onclick="game.consumeNftPill('${item.id}')">Consume Now</button>
            </div>
        `;
    }
};