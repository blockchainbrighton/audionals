import { imageLoader } from './imageLoader.js';

export const casinoGame = {
    game: null,
    bet: 10,
    isSpinning: false,
    reelStrip: [], // The pool of pills to spin through
    reelState: [null, null, null], // Current items on the 3 reels
    fallbackImageUrl: 'artwork/narcotix_pill.svg',
    ipfsBase: 'https://ipfs.io/ipfs/QmbDXZ5xbx9oKD1F6kXmv9gJ3FCKfN9yuoHad9zi8ndkVo/images',
    
    // Legacy pair payout (kept for fallback/engagement)
    payouts: {
        'ANY_PAIR': { mult: 1, label: "PAIR (Breakeven)" }
    },

    // Jackpot trait stacking definitions (ordered by priority)
    traitJackpotRules: [
        { key: 'expression', label: 'Expression Sync', baseMultiplier: 50 },
        { key: 'hex1', label: 'Primary Color Lock', baseMultiplier: 25 },
        { key: 'hex2', label: 'Accent Color Lock', baseMultiplier: 15 },
        { key: 'shape', label: 'Silhouette Match', baseMultiplier: 12, rareValues: ['star','diamond','pentagon','triangle'], rareBonus: 8 },
        { key: 'base', label: 'Base Pigment Match', baseMultiplier: 10 },
        { key: 'extras', label: 'Burst Pattern Match', baseMultiplier: 8 },
        { key: 'outline', label: 'Outline Pulse Match', baseMultiplier: 6 },
        { key: 'animation', label: 'Animation State Match', baseMultiplier: 5 },
        { key: 'scoreBand', label: 'Rarity Tier Lock', baseMultiplier: 18 }
    ],

    stackedJackpotTiers: [
        { matchesRequired: 6, label: 'APEX JACKPOT', bonusMultiplier: 120 },
        { matchesRequired: 5, label: 'NEXUS JACKPOT', bonusMultiplier: 80 },
        { matchesRequired: 4, label: 'HARMONIC JACKPOT', bonusMultiplier: 40 },
        { matchesRequired: 3, label: 'SYNC SURGE', bonusMultiplier: 15 }
    ],

    init: function(gameInstance) {
        this.game = gameInstance;
        this.bufferReelStrip();
    },

    // Pre-select a subset of the 3333 pills to act as the "Reel Strip" for performance
    bufferReelStrip: function() {
        const pool = Array.isArray(this.game.collectionData) ? this.game.collectionData : [];
        this.reelStrip = [];

        if (pool.length === 0) {
            // Keep at least three fallback items so the UI never renders blanks.
            this.reelStrip = [this.createFallbackItem(0), this.createFallbackItem(1), this.createFallbackItem(2)];
            return;
        }
        
        // Pick up to 50 random pills to cycle through
        const picks = Math.min(50, pool.length);
        for(let i = 0; i < picks; i++) {
            const r = Math.floor(Math.random() * pool.length);
            const sanitized = this.sanitizeReelItem(pool[r], i);
            this.reelStrip.push(sanitized);
            if (!sanitized.isFallback) imageLoader.preload(sanitized.id);
        }

        while (this.reelStrip.length < 3) {
            this.reelStrip.push(this.createFallbackItem(this.reelStrip.length));
        }
    },

    getReelItem: function(slotIndex = 0) {
        if (!Array.isArray(this.reelStrip) || this.reelStrip.length === 0) this.bufferReelStrip();
        const entry = (this.reelStrip.length > 0) 
            ? this.reelStrip[Math.floor(Math.random() * this.reelStrip.length)]
            : null;
        const sanitized = this.sanitizeReelItem(entry, slotIndex);
        if (!sanitized.isFallback) imageLoader.preload(sanitized.id);
        return sanitized;
    },

    renderUI: function(container, actionsContainer) {
        console.log("[CasinoGame] casinoGame.renderUI called, injecting HTML.");
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
        this.updateReelVisuals([this.getReelItem(0), this.getReelItem(1), this.getReelItem(2)]);
    },

    changeBet: function(amount) {
        if (this.isSpinning) return;
        this.bet = amount;
        document.getElementById('current-bet').textContent = this.bet;
    },

    spin: function() {
        console.log("[CasinoGame] SPIN button clicked.");
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
            const tempReels = [this.getReelItem(0), this.getReelItem(1), this.getReelItem(2)];
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
        
        const r1 = this.getReelItem(0);
        const r2 = this.getReelItem(1);
        const r3 = this.getReelItem(2);
        
        this.reelState = [r1, r2, r3];
        this.updateReelVisuals(this.reelState);
        
        this.checkWin();
        
        this.isSpinning = false;
        document.getElementById('btn-spin').disabled = false;
    },

    updateReelVisuals: function(items = []) {
        for(let i = 0; i < 3; i++) {
            const el = document.getElementById(`reel-${i+1}`);
            if (!el) continue;

            const safeItem = this.sanitizeReelItem(items[i], i);
            const borderColor = this.normalizeColor(safeItem.hex1, '#FFF');
            const labelColor = this.normalizeColor(safeItem.hex2, '#FFF');
            const safeName = safeItem.name || safeItem.shape || 'Pill';
            const resolvedImgUrl = safeItem.isFallback 
                ? this.getFallbackImage()
                : (imageLoader.getUrl(safeItem.id) || this.getFallbackImage());
            const usingIpfs = !safeItem.isFallback && resolvedImgUrl.includes('ipfs.io');
            const onErrorAttr = safeItem.isFallback ? '' : ` onerror="game.casinoGame.handleImageError(this, '${safeItem.id}')"`; 
            const dataAttempt = safeItem.isFallback ? 'fallback' : (usingIpfs ? 'ipfs' : 'hiro');
            
            el.innerHTML = `
                <div class="reel-content" style="border-color:${borderColor}">
                    <img src="${resolvedImgUrl}" alt="${safeName}" data-img-attempt="${dataAttempt}" style="width:64px; height:64px;"${onErrorAttr}>
                    <div style="font-size:10px; color:${labelColor}; margin-top:2px;">${safeItem.shape}</div>
                </div>
            `;
        }
    },

    getFallbackImage: function() {
        return this.fallbackImageUrl;
    },

    getIpfsUrl: function(id) {
        const cleanId = id ? String(id).trim() : '';
        if (!cleanId) return this.getFallbackImage();
        return `${this.ipfsBase}/${encodeURIComponent(`#${cleanId}`)}.png`;
    },

    handleImageError: function(imgEl, itemId) {
        if (!imgEl) return;
        const cleanId = itemId ? String(itemId).trim() : '';
        const attempt = imgEl.dataset.imgAttempt || 'hiro';

        if (attempt === 'hiro' && cleanId) {
            imgEl.dataset.imgAttempt = 'ipfs';
            imageLoader.preload(cleanId);
            imgEl.src = this.getIpfsUrl(cleanId);
            return;
        }

        imgEl.dataset.imgAttempt = 'fallback';
        imgEl.src = this.getFallbackImage();
    },

    sanitizeReelItem: function(item, slotIndex = 0) {
        const fallback = this.createFallbackItem(slotIndex);
        if (!item || item.isFallback) return { ...fallback };

        const cleanId = item.id ?? item.Id ?? item.ID;
        if (!cleanId) return { ...fallback };

        const normalizedScore = this.parseScore(item.score ?? item.Score);
        return {
            id: String(cleanId).trim(),
            name: item.name || item.Name || fallback.name,
            shape: item.shape || item.Shape || fallback.shape,
            hex1: this.normalizeColor(item.hex1 || item.Hex1, fallback.hex1),
            hex2: this.normalizeColor(item.hex2 || item.Hex2, fallback.hex2),
            expression: item.expression || item.Expression || fallback.expression,
            base: item.base || item.Base || fallback.base,
            extras: item.extras || item.Extras || fallback.extras,
            outline: item.outline || item.Outline || fallback.outline,
            animation: item.animation || item.Animation || fallback.animation,
            score: normalizedScore,
            scoreBand: this.getScoreBand(normalizedScore),
            isFallback: false
        };
    },

    createFallbackItem: function(slotIndex = 0) {
        return {
            id: `fallback-${slotIndex}`,
            name: 'Signal Archive',
            shape: `???${slotIndex + 1}`,
            hex1: '#0FF',
            hex2: '#0FF',
            expression: 'None',
            base: 'None',
            extras: 'None',
            outline: 'None',
            animation: 'None',
            score: null,
            scoreBand: 'unknown',
            isFallback: true
        };
    },

    normalizeColor: function(value, fallbackColor = '#FFF') {
        if (typeof value !== 'string') return fallbackColor;
        let trimmed = value.trim();
        if (trimmed.startsWith('##')) trimmed = `#${trimmed.slice(2)}`;
        if (/^#[0-9a-fA-F]{3,6}$/.test(trimmed)) return trimmed;
        return fallbackColor;
    },

    parseScore: function(raw) {
        if (!raw) return null;
        const cleaned = String(raw).replace('%', '').trim();
        const num = parseFloat(cleaned);
        return Number.isNaN(num) ? null : num;
    },

    getScoreBand: function(score) {
        if (score === null || score === undefined) return 'unknown';
        if (score >= 70) return 'mythic';
        if (score >= 50) return 'legendary';
        if (score >= 30) return 'rare';
        if (score >= 15) return 'uncommon';
        return 'common';
    },

    normalizeTraitValue: function(value) {
        if (typeof value !== 'string') return '';
        return value.trim().toLowerCase();
    },

    checkWin: function() {
        const [i1, i2, i3] = this.reelState;
        const msgEl = document.getElementById('slot-message');
        const winEl = document.getElementById('last-win');
        const reels = [i1, i2, i3];
        
        let winAmount = 0;
        let winType = '';

        if (reels.some(item => !item || item.isFallback)) {
            msgEl.textContent = "SIGNAL INTERFERENCE";
            msgEl.style.color = "#FF0";
            winEl.textContent = "WIN: 0c";
            return;
        }

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
