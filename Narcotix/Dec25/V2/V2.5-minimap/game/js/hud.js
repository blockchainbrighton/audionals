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
    },

    showNftPickup: function(item) {
        const popup = document.getElementById('nftPickupPopup');
        if (!popup) return;

        // PAUSE THE GAME
        this.game.gameState = 'NFT_VIEW';

        const traits = item.nftTraits || {};
        const id = traits.id || '?';
        const hex1 = traits.hex1 || '#FFFFFF';
        const hex2 = traits.hex2 || '#FFFFFF';
        const effect = traits.effect || 'Unknown';
        // Handle potential trailing dot in CSV header key
        const sideEffect = traits.sideEffect || traits['sideEffect.'] || 'None';

        console.log(`[HUD] Opening NFT Popup for: ${item.name}`);
        console.log(`[HUD] Traits:`, traits);

        const CONTRACT = 'SP8HMQP4Q63V3E6SXXPXZ4WJXA263HBD95QY2AM3.narcotix';
        // Use item.imageUrl if available, otherwise construct it
        const cacheUrl = item.imageUrl || `https://assets.hiro.so/api/mainnet/token-metadata-api/${CONTRACT}/${id}.png`;

        popup.innerHTML = `
            <h3 style="margin-bottom: 15px; color: #fff; text-shadow: 0 0 5px ${hex1};">${item.name}</h3>
            <img id="nftPopupImage" src="${cacheUrl}" 
                 alt="${item.name}" 
                 style="min-height:200px; max-width:100%; background:#111; display:block; margin:0 auto 15px auto; border:1px solid #333; box-shadow: 0 0 15px rgba(0,0,0,0.5);">
            
            <div class="traits" style="text-align: left; padding: 0 10px;">
                
                <div class="trait-row" style="margin-bottom: 12px; display: flex; align-items: center;">
                    <span class="trait-key" style="width: 80px; display: inline-block; color: #aaa;">Colors:</span> 
                    <span class="trait-val" style="flex: 1;">
                        <span style="display:inline-block; width:16px; height:16px; background-color:${hex1}; border:1px solid #fff; vertical-align:middle; margin-right:6px; box-shadow: 0 0 5px ${hex1};"></span>
                        <span style="color:${hex1}; font-family:monospace; margin-right: 15px;">${hex1}</span>
                        
                        <span style="display:inline-block; width:16px; height:16px; background-color:${hex2}; border:1px solid #fff; vertical-align:middle; margin-right:6px; box-shadow: 0 0 5px ${hex2};"></span>
                        <span style="color:${hex2}; font-family:monospace;">${hex2}</span>
                    </span>
                </div>

                <div style="margin-bottom: 12px;">
                    <div class="trait-key" style="margin-bottom: 4px; color: #0FF;">Effect:</div>
                    <div class="trait-val" style="color:#fff; padding:8px 10px; border-left: 3px solid ${hex1}; background:linear-gradient(90deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 100%); font-size:0.95em; line-height:1.4;">
                        ${effect}
                    </div>
                </div>

                <div style="margin-bottom: 12px;">
                    <div class="trait-key" style="margin-bottom: 4px; color: #F0F;">Side Effect:</div>
                    <div class="trait-val" style="color:#ddd; padding:8px 10px; border-left: 3px solid ${hex2}; background:linear-gradient(90deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 100%); font-size:0.95em; line-height:1.4;">
                        ${sideEffect}
                    </div>
                </div>
            </div>

            <div style="margin-top:20px; display:flex; justify-content:center; gap:15px;">
                <button class="button" onclick="game.closeNftPopup()" style="flex:1;">Stash</button>
                <button class="button" style="background-color:rgba(255, 0, 0, 0.2); border-color:#F55; color:#F55; flex:1;" onclick="game.consumeNftPill('${item.id}')">Consume</button>
            </div>
        `;
        
        popup.style.display = 'block';
    }
};