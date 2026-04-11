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
        // Primary URL: Hiro Cache
        const cacheUrl = `https://assets.hiro.so/api/mainnet/token-metadata-api/${CONTRACT}/${id}.png`;

        popup.innerHTML = `
            <h3>${item.name}</h3>
            <img id="nftPopupImage" src="${cacheUrl}" 
                 alt="Loading..." 
                 style="min-height:200px; max-width:100%; background:#111; display:block; margin:0 auto; border:1px solid #333;"
                 onload="console.log('[HUD] Primary image loaded: ${cacheUrl}')"
                 onerror="console.warn('[HUD] Primary image failed, trying metadata...'); this.dataset.failed='true';">
            
            <div class="traits">
        `;

        // Async fetch for metadata as backup/verification
        const metaUrl = `https://api.hiro.so/metadata/v1/nft/${CONTRACT}/${id}`;
        fetch(metaUrl)
            .then(res => res.json())
            .then(data => {
                let imgUrl = data.metadata?.image || '';
                
                // Fix IPFS URL
                if (imgUrl.startsWith('ipfs://')) {
                    if (imgUrl.startsWith('ipfs://ipfs/')) {
                         imgUrl = imgUrl.replace('ipfs://ipfs/', 'https://ipfs.io/ipfs/');
                    } else {
                         imgUrl = imgUrl.replace('ipfs://', 'https://ipfs.io/ipfs/');
                    }
                }

                console.log(`[HUD] Metadata Image URL: ${imgUrl}`);
                const imgEl = document.getElementById('nftPopupImage');
                
                // If the primary cache URL failed (marked by onerror), try this one
                if (imgEl && imgEl.dataset.failed === 'true' && imgUrl) {
                    console.log('[HUD] Switching to metadata image...');
                    imgEl.src = imgUrl;
                    imgEl.dataset.failed = 'false'; // Reset
                }
            })
            .catch(err => {
                console.error('[HUD] Metadata fetch failed:', err);
            });

        // Append the rest of the HTML
        popup.innerHTML += `
                <div class="trait-row">
                    <span class="trait-key">ID:</span> 
                    <span class="trait-val">#${id}</span>
                </div>
                
                <div class="trait-row">
                    <span class="trait-key">Colors:</span> 
                    <span class="trait-val">
                        <span style="display:inline-block; width:12px; height:12px; background-color:${hex1}; border:1px solid #fff; vertical-align:middle; margin-right:4px;"></span>
                        <span style="color:${hex1}; font-family:monospace;">${hex1}</span>
                        <span style="margin:0 8px; color:#555;">|</span>
                        <span style="display:inline-block; width:12px; height:12px; background-color:${hex2}; border:1px solid #fff; vertical-align:middle; margin-right:4px;"></span>
                        <span style="color:${hex2}; font-family:monospace;">${hex2}</span>
                    </span>
                </div>

                <div style="margin-top:10px; text-align:left;">
                    <div class="trait-key" style="margin-bottom:2px;">Effect:</div>
                    <div class="trait-val" style="color:${hex1}; padding:5px 8px; border-left: 3px solid ${hex1}; background:rgba(0,0,0,0.4); font-size:0.9em; line-height:1.4;">
                        ${effect}
                    </div>
                </div>

                <div style="margin-top:10px; text-align:left;">
                    <div class="trait-key" style="margin-bottom:2px;">Side Effect:</div>
                    <div class="trait-val" style="color:${hex2}; padding:5px 8px; border-left: 3px solid ${hex2}; background:rgba(0,0,0,0.4); font-size:0.9em; line-height:1.4;">
                        ${sideEffect}
                    </div>
                </div>
            </div>

            <div style="margin-top:15px; display:flex; justify-content:center; gap:10px;">
                <button class="button" onclick="game.closeNftPopup()">Save for Later</button>
                <button class="button" style="background-color:#F00; border-color:#F55; color:#FFF;" onclick="game.consumeNftPill('${item.id}')">Do it NOW!</button>
            </div>
        `;
        
        popup.style.display = 'block';
    }
};