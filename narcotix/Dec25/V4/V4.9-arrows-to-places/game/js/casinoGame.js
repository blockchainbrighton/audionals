export const casinoGame = {
    game: null,
    bet: 10,
    isSpinning: false,
    reelStrip: [], // The pool of pills to spin through
    reelState: [null, null, null], // Current items on the 3 reels
    
    // Payout Configuration
    payouts: {
        'EXPRESSION_MATCH': { mult: 50, label: "JACKPOT! (Expression Match)" },
        'COLOR_MATCH': { mult: 20, label: "COLOR SYNC (Hex Match)" },
        'SHAPE_RARE': { mult: 10, label: "RARE SHAPE (Star/Diamond)" },
        'SHAPE_COMMON': { mult: 3, label: "SHAPE MATCH" },
        'ANY_PAIR': { mult: 1, label: "PAIR (Breakeven)" } // Keep player engaged
    },

    init: function(gameInstance) {
        this.game = gameInstance;
        this.bufferReelStrip();
    },

    // Pre-select a subset of the 3333 pills to act as the "Reel Strip" for performance
    bufferReelStrip: function() {
        if (!this.game.collectionData || this.game.collectionData.length === 0) return;
        
        // Pick 50 random pills to cycle through
        this.reelStrip = [];
        for(let i=0; i<50; i++) {
            const r = Math.floor(Math.random() * this.game.collectionData.length);
            this.reelStrip.push(this.game.collectionData[r]);
        }
    },

    getReelItem: function() {
        if (this.reelStrip.length === 0) return null;
        return this.reelStrip[Math.floor(Math.random() * this.reelStrip.length)];
    },

    renderUI: function(container, actionsContainer) {
        // Build the HTML Interface
        container.innerHTML = `
            <div class="casino-layout">
                <!-- The Machine -->
                <div class="slot-machine">
                    <div class="slot-header">
                        <span class="neon-text-blink">NARC-O-SLOTS 2088</span>
                    </div>
                    
                    <div class="reels-container">
                        <div class="reel" id="reel-1"><div class="reel-content">?</div></div>
                        <div class="reel" id="reel-2"><div class="reel-content">?</div></div>
                        <div class="reel" id="reel-3"><div class="reel-content">?</div></div>
                    </div>

                    <div class="slot-display">
                        <div id="slot-message">INSERT CREDS TO SPIN</div>
                        <div id="last-win">WIN: 0c</div>
                    </div>
                </div>

                <!-- The Rules Card -->
                <div class="rules-card">
                    <h4>PAYOUT TABLE</h4>
                    <ul class="payout-list">
                        <li class="jackpot">3x EXPRESSION <span class="mult">x50</span></li>
                        <li class="high">3x COLOR (Hex) <span class="mult">x20</span></li>
                        <li class="med">3x RARE SHAPE <span class="mult">x10</span><br><small>(Star, Diamond, Pentagon)</small></li>
                        <li class="low">3x ANY SHAPE <span class="mult">x3</span></li>
                        <li class="pair">ANY PAIR (Shape) <span class="mult">x1</span></li>
                    </ul>
                    <div class="bet-controls">
                        <div>BET: <span id="current-bet" style="color:#0FF;">10</span>c</div>
                        <div class="bet-buttons">
                            <button class="button button-small" onclick="game.casinoGame.changeBet(10)">10</button>
                            <button class="button button-small" onclick="game.casinoGame.changeBet(50)">50</button>
                            <button class="button button-small" onclick="game.casinoGame.changeBet(100)">100</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        actionsContainer.innerHTML = `
            <button class="button button-large" id="btn-spin" onclick="game.casinoGame.spin()">SPIN</button>
            <button class="button" onclick="game.exitLocation()">LEAVE</button>
        `;

        // Initialize reels with random static data
        this.updateReelVisuals([this.getReelItem(), this.getReelItem(), this.getReelItem()]);
    },

    changeBet: function(amount) {
        if (this.isSpinning) return;
        this.bet = amount;
        document.getElementById('current-bet').textContent = this.bet;
    },

    spin: function() {
        if (this.isSpinning) return;
        if (!this.game.player.payMoney(this.bet)) {
            this.game.utils.addMessage("Insufficient funds for this bet.");
            return;
        }

        this.isSpinning = true;
        document.getElementById('btn-spin').disabled = true;
        document.getElementById('slot-message').textContent = "SPINNING...";
        document.getElementById('slot-message').style.color = "#FF0";
        document.getElementById('last-win').textContent = "";

        // Spin Animation Logic
        const duration = 2000; // 2 seconds
        const interval = 100;
        let elapsed = 0;

        // Sound
        // We need a looping mechanical sound ideally, but we'll use tick sounds
        const spinInterval = setInterval(() => {
            elapsed += interval;
            
            // Show random items during spin
            const tempReels = [this.getReelItem(), this.getReelItem(), this.getReelItem()];
            this.updateReelVisuals(tempReels);
            
            // Click sound
            if (this.game.soundManager) this.game.soundManager.playUI(); // Blip

            if (elapsed >= duration) {
                clearInterval(spinInterval);
                this.finalizeSpin();
            }
        }, interval);
    },

    finalizeSpin: function() {
        // Determine Final Outcome
        // We pick 3 random items from the FULL collection (or buffer)
        // To make it fun, let's weight it slightly or just purely random?
        // Pure random from 3333 items makes matches rare. 
        // Let's use the buffered strip (size 50) to make matches more likely for gameplay feel.
        
        const r1 = this.getReelItem();
        const r2 = this.getReelItem();
        const r3 = this.getReelItem();
        
        this.reelState = [r1, r2, r3];
        this.updateReelVisuals(this.reelState);
        
        this.checkWin();
        
        this.isSpinning = false;
        document.getElementById('btn-spin').disabled = false;
    },

    updateReelVisuals: function(items) {
        for(let i=0; i<3; i++) {
            const el = document.getElementById(`reel-${i+1}`);
            const item = items[i];
            if (el && item) {
                const imgUrl = `https://assets.hiro.so/api/mainnet/token-metadata-api/SP8HMQP4Q63V3E6SXXPXZ4WJXA263HBD95QY2AM3.narcotix/${item.id}.png`;
                
                // Color border based on hex1
                const borderColor = item.hex1 || '#FFF';
                
                el.innerHTML = `
                    <div class="reel-content" style="border-color:${borderColor}">
                        <img src="${imgUrl}" style="width:64px; height:64px;">
                        <div style="font-size:10px; color:${item.hex2}; margin-top:2px;">${item.shape}</div>
                    </div>
                `;
            }
        }
    },

    checkWin: function() {
        const [i1, i2, i3] = this.reelState;
        const msgEl = document.getElementById('slot-message');
        const winEl = document.getElementById('last-win');
        
        let winAmount = 0;
        let winType = '';

        // 1. EXPRESSION MATCH (Jackpot)
        if (i1.expression === i2.expression && i2.expression === i3.expression && i1.expression !== 'None') {
            winAmount = this.bet * this.payouts.EXPRESSION_MATCH.mult;
            winType = this.payouts.EXPRESSION_MATCH.label;
        } 
        // 2. COLOR MATCH (Hex1)
        else if (i1.hex1 === i2.hex1 && i2.hex1 === i3.hex1) {
            winAmount = this.bet * this.payouts.COLOR_MATCH.mult;
            winType = this.payouts.COLOR_MATCH.label;
        }
        // 3. SHAPE MATCH
        else if (i1.shape === i2.shape && i2.shape === i3.shape) {
            const rareShapes = ['Star', 'Diamond', 'Pentagon', 'Triangle'];
            if (rareShapes.includes(i1.shape)) {
                winAmount = this.bet * this.payouts.SHAPE_RARE.mult;
                winType = this.payouts.SHAPE_RARE.label;
            } else {
                winAmount = this.bet * this.payouts.SHAPE_COMMON.mult;
                winType = this.payouts.SHAPE_COMMON.label;
            }
        }
        // 4. PAIR (Any 2 Shapes)
        else if (i1.shape === i2.shape || i2.shape === i3.shape || i1.shape === i3.shape) {
            winAmount = this.bet * this.payouts.ANY_PAIR.mult;
            winType = this.payouts.ANY_PAIR.label;
        }

        if (winAmount > 0) {
            this.game.player.earnMoney(winAmount);
            msgEl.textContent = winType;
            msgEl.style.color = "#0F0";
            winEl.textContent = `WIN: ${winAmount}c`;
            if (this.game.soundManager) this.game.soundManager.playPickup(); // Cha-ching
        } else {
            msgEl.textContent = "NO MATCH";
            msgEl.style.color = "#888";
            winEl.textContent = "WIN: 0c";
        }
    }
};
