import { imageLoader } from '../imageLoader.js';

export const HighLowGame = {
    game: null,
    currentPill: null,
    nextPillBuffer: [], // Cache for next items
    bet: 10,
    isProcessing: false,

    init: function(gameInstance) {
        this.game = gameInstance;
        this.pickRandomPill();
    },

    preloadImages: function() {
        const pool = this.game.collectionData || [];
        if (pool.length === 0) return;

        // Ensure we have next few moves ready
        while (this.nextPillBuffer.length < 5) {
            const r = Math.floor(Math.random() * pool.length);
            const item = pool[r];
            if (item && item.id) {
                imageLoader.preload(item.id);
                this.nextPillBuffer.push(item);
            }
        }
        
        // Also preload current if set
        if (this.currentPill && this.currentPill.id) {
            imageLoader.preload(this.currentPill.id);
        }
    },

    pickRandomPill: function() {
        this.preloadImages(); // Ensure buffer is populated
        if (this.nextPillBuffer.length > 0) {
            this.currentPill = this.nextPillBuffer.shift();
        } else {
            const pool = this.game.collectionData || [];
            if (pool.length === 0) return;
            this.currentPill = pool[Math.floor(Math.random() * pool.length)];
        }
    },

    renderUI: function(container, actionsContainer) {
        if (!this.currentPill) this.pickRandomPill();

        container.innerHTML = `
            <div class="casino-layout highlow-theme">
                <div class="highlow-header">
                    <span class="neon-text-blink">HIGH / LOW</span>
                </div>

                <div class="highlow-arena">
                    <div class="card current-card">
                        <div class="card-label">CURRENT SIGNAL</div>
                        <div id="hl-current-img"></div>
                        <div class="card-value" id="hl-current-val">--</div>
                    </div>
                    
                    <div class="versus">VS</div>

                    <div class="card next-card">
                        <div class="card-label">NEXT SIGNAL</div>
                        <div id="hl-next-img" class="hidden-card">?</div>
                        <div class="card-value" id="hl-next-val">???</div>
                    </div>
                </div>

                <div class="bet-controls centered">
                    <div>BET: <span id="hl-bet-val" style="color:#0FF;">10</span>c</div>
                    <div class="bet-buttons">
                        <button class="button button-small" onclick="game.casinoGame.HighLow.changeBet(10)">10</button>
                        <button class="button button-small" onclick="game.casinoGame.HighLow.changeBet(50)">50</button>
                        <button class="button button-small" onclick="game.casinoGame.HighLow.changeBet(100)">100</button>
                    </div>
                </div>
            </div>
        `;

        actionsContainer.innerHTML = `
            <button class="button button-large hl-btn" id="btn-low" style="border-color:#F00; color:#F00;">LOWER</button>
            <button class="button button-large hl-btn" id="btn-high" style="border-color:#0F0; color:#0F0;">HIGHER</button>
            <button class="button" id="btn-leave-hl">LEAVE</button>
        `;

        this.updateCurrentCard();

        // Attach via direct reference or global if needed, 
        // but since we are modular, we need to bind clicks here.
        // NOTE: The inline onclicks above rely on game.casinoGame.HighLow which might not exist yet if I don't structure it right.
        // Better to addEventListeners.
        
        container.querySelectorAll('.button-small').forEach(btn => {
            btn.onclick = (e) => this.changeBet(parseInt(e.target.textContent));
        });

        document.getElementById('btn-low').onclick = () => this.play('lower');
        document.getElementById('btn-high').onclick = () => this.play('higher');
        document.getElementById('btn-leave-hl').onclick = () => this.game.exitLocation();
    },

    ipfsBase: 'https://ipfs.io/ipfs/QmbDXZ5xbx9oKD1F6kXmv9gJ3FCKfN9yuoHad9zi8ndkVo/images',
    fallbackImageUrl: 'artwork/narcotix_pill.svg',

    getIpfsUrl: function(id) {
        const cleanId = id ? String(id).trim() : '';
        if (!cleanId) return this.fallbackImageUrl;
        return `${this.ipfsBase}/${encodeURIComponent(`#${cleanId}`)}.png`;
    },

    handleImageError: function(imgEl, itemId) {
        if (!imgEl) return;
        const cleanId = itemId ? String(itemId).trim() : '';
        const attempt = imgEl.dataset.imgAttempt || 'hiro';

        if (attempt === 'hiro' && cleanId) {
            imgEl.dataset.imgAttempt = 'ipfs';
            imgEl.src = this.getIpfsUrl(cleanId);
            return;
        }
        imgEl.src = this.fallbackImageUrl;
    },

    changeBet: function(amount) {
        if (this.isProcessing) return;
        this.bet = amount;
        const el = document.getElementById('hl-bet-val');
        if(el) el.textContent = this.bet;
    },

    updateCurrentCard: function() {
        const imgContainer = document.getElementById('hl-current-img');
        const valContainer = document.getElementById('hl-current-val');
        
        const imgUrl = imageLoader.getUrl(this.currentPill.id);
        const attemptState = imgUrl.includes('ipfs.io') ? 'ipfs' : 'hiro';

        imgContainer.innerHTML = `<img src="${imgUrl}" data-img-attempt="${attemptState}" style="width:100px; height:100px;" onerror="game.casino.HighLow.handleImageError(this, '${this.currentPill.id}')">`;
        
        valContainer.textContent = this.getPillValue(this.currentPill);
    },

    getPillValue: function(pill) {
        // Try score first (e.g. "36.51%")
        if (pill.score) {
            return parseFloat(pill.score.replace('%', ''));
        }
        // Fallback to ID
        return parseInt(pill.id);
    },

    play: function(choice) {
        if (this.isProcessing) return;
        if (!this.game.player.payMoney(this.bet)) {
            this.game.utils.addMessage("Insufficient Creds.");
            return;
        }

        this.isProcessing = true;
        document.getElementById('btn-low').disabled = true;
        document.getElementById('btn-high').disabled = true;

        // Ensure buffer has items
        this.preloadImages();

        let nextPill = null;
        if (this.nextPillBuffer.length > 0) {
            nextPill = this.nextPillBuffer[0]; // Peek at next (don't shift yet, we shift on reset)
        } else {
            const pool = this.game.collectionData;
            nextPill = pool[Math.floor(Math.random() * pool.length)];
        }
        
        const currentVal = this.getPillValue(this.currentPill);
        const nextVal = this.getPillValue(nextPill);

        // Reveal Animation
        const nextImg = document.getElementById('hl-next-img');
        const nextValEl = document.getElementById('hl-next-val');
        
        const imgUrl = imageLoader.getUrl(nextPill.id);
        const attemptState = imgUrl.includes('ipfs.io') ? 'ipfs' : 'hiro';

        nextImg.innerHTML = `<img src="${imgUrl}" data-img-attempt="${attemptState}" style="width:100px; height:100px;" onerror="game.casino.HighLow.handleImageError(this, '${nextPill.id}')">`;
        nextImg.classList.remove('hidden-card');
        nextValEl.textContent = nextVal;

        // Determine Win
        let won = false;
        if (choice === 'higher' && nextVal > currentVal) won = true;
        else if (choice === 'lower' && nextVal < currentVal) won = true;
        // Tie = Loss (House Edge)

        setTimeout(() => {
            if (won) {
                const winAmount = Math.floor(this.bet * 1.8);
                this.game.player.earnMoney(winAmount);
                this.game.utils.addMessage(`SUCCESS! Won ${winAmount}c.`);
                if (this.game.soundManager) this.game.soundManager.playPickup();
            } else {
                this.game.utils.addMessage(`FAILURE. Signal Lost.`);
            }

            // Reset for next round
            setTimeout(() => {
                // If we used the buffer, shift it now
                if (this.nextPillBuffer.length > 0 && this.nextPillBuffer[0].id === nextPill.id) {
                    this.currentPill = this.nextPillBuffer.shift();
                } else {
                    this.currentPill = nextPill;
                }
                
                // Replenish buffer
                this.preloadImages();

                this.renderUI(document.querySelector('#locContent'), document.querySelector('#locActions'));
                this.isProcessing = false;
            }, 1500);

        }, 500);
    }
};
