import { imageLoader } from './imageLoader.js';

const PAYOUT_CONFIG = {
    // Legacy pair payout (kept for fallback/engagement)
    ANY_PAIR: { mult: 1, label: "PAIR (Breakeven)" },

    // Jackpot trait stacking definitions (ordered by priority)
    TRAIT_RULES: [
        { key: 'expression', label: 'Expression Sync', baseMultiplier: 50 },
        { key: 'hex1', label: 'Primary Color Lock', baseMultiplier: 25 },
        { key: 'shape', label: 'Silhouette Match', baseMultiplier: 12, rareValues: ['star','diamond','pentagon','triangle'], rareBonus: 8 },
        { key: 'base', label: 'Base Pigment Match', baseMultiplier: 10 },
        { key: 'extras', label: 'Burst Pattern Match', baseMultiplier: 8 },
        { key: 'animation', label: 'Animation State Match', baseMultiplier: 5 }
    ],

    // Bonus for multiple simultaneous trait matches
    STACKED_BONUSES: [
        { matchesRequired: 6, label: 'APEX JACKPOT', bonusMultiplier: 120 },
        { matchesRequired: 5, label: 'NEXUS JACKPOT', bonusMultiplier: 80 },
        { matchesRequired: 4, label: 'HARMONIC JACKPOT', bonusMultiplier: 40 },
        { matchesRequired: 3, label: 'SYNC SURGE', bonusMultiplier: 15 }
    ],

    // Special Mini-Jackpots
    DUAL_COLOR_BONUS: { label: 'Color Fusion Mini-Jackpot', bonusMultiplier: 20 },

    // Pair Matching Rules
    PAIR_RULES: [
        { key: 'expression', label: 'Expression Pair' },
        { key: 'shape', label: 'Shape Pair' },
        { key: 'base', label: 'Base Color Pair' },
        { key: 'hex1', label: 'Primary Color Pair' },
    ]
};

export const casinoGame = {
    game: null,
    bet: 10,
    isSpinning: false,
    reelStrip: [], // The pool of pills to spin through
    reelState: [null, null, null], // Current items on the 3 reels
    fallbackImageUrl: 'artwork/narcotix_pill.svg',
    ipfsBase: 'https://ipfs.io/ipfs/QmbDXZ5xbx9oKD1F6kXmv9gJ3FCKfN9yuoHad9zi8ndkVo/images',
    
    // Reference centralized config
    payouts: { ANY_PAIR: PAYOUT_CONFIG.ANY_PAIR },
    traitJackpotRules: PAYOUT_CONFIG.TRAIT_RULES,
    stackedJackpotTiers: PAYOUT_CONFIG.STACKED_BONUSES,
    pairMatchRules: PAYOUT_CONFIG.PAIR_RULES,
    dualColorMiniJackpot: PAYOUT_CONFIG.DUAL_COLOR_BONUS,

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
                        <li class="jackpot">APEX JACKPOT <span class="mult">+120</span><br><small>6 synced traits</small></li>
                        <li class="high">NEXUS / HARMONIC <span class="mult">+80 / +40</span><br><small>5+ / 4 synced traits</small></li>
                        <li class="med">TRAIT STACKS<br><small>Expression x50 | Primary Hex x25 | Base x10 | Shape x12 (+rare bonus)</small></li>
                        <li class="low">Pigments / Extras / Animation<br><small>Multipliers from x5 up to x18 + Color Fusion Mini (x20)</small></li>
                        <li class="pair">SAFETY PAIR <span class="mult">x1</span><br><small>Any two matching expressions / shapes / base / colors</small></li>
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

        return {
            id: String(cleanId).trim(),
            name: item.name || item.Name || fallback.name,
            shape: item.shape || item.Shape || fallback.shape,
            hex1: this.normalizeColor(item.hex1 || item.Hex1, fallback.hex1),
            hex2: this.normalizeColor(item.hex2 || item.Hex2, fallback.hex2),
            expression: item.expression || item.Expression || fallback.expression,
            base: item.base || item.Base || fallback.base,
            extras: item.extras || item.Extras || fallback.extras,
            animation: item.animation || item.Animation || fallback.animation,
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
            animation: 'None',
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

    normalizeTraitValue: function(value, traitKey = '') {
        if (value === null || value === undefined) return '';
        if (typeof value !== 'string') value = String(value);
        let normalized = value.trim().toLowerCase();
        if (traitKey === 'expression') {
            normalized = normalized.replace(/\s+x$/, '');
        }
        if (normalized === 'none') return '';
        return normalized;
    },

    evaluateTraitMatches: function(reels) {
        const matches = [];
        for (const rule of this.traitJackpotRules) {
            const values = reels.map(item => this.normalizeTraitValue(item[rule.key], rule.key));
            if (values.length < 3) continue;
            const hasEmpty = values.some(v => !v || v === 'unknown');
            if (hasEmpty) continue;
            const uniqueCount = new Set(values).size;
            if (uniqueCount === 1) {
                let multiplier = rule.baseMultiplier;
                if (rule.rareValues && rule.rareValues.includes(values[0])) {
                    multiplier += rule.rareBonus || 0;
                }
                matches.push({
                    key: rule.key,
                    label: rule.label,
                    value: reels[0][rule.key],
                    multiplier
                });
            }
        }

        matches.sort((a, b) => b.multiplier - a.multiplier);

        const hasPrimary = matches.some(match => match.key === 'hex1');
        if (hasPrimary) {
            matches.unshift({
                key: 'dualColor',
                label: this.dualColorMiniJackpot.label,
                value: null,
                multiplier: this.dualColorMiniJackpot.bonusMultiplier
            });
        }

        const stackedTier = this.stackedJackpotTiers.find(tier => matches.length >= tier.matchesRequired) || null;
        const stackedBonus = stackedTier ? stackedTier.bonusMultiplier : 0;
        const totalMultiplier = matches.reduce((sum, match) => sum + match.multiplier, 0) + stackedBonus;

        return {
            matches,
            stackedTier,
            stackedBonus,
            totalMultiplier
        };
    },

    detectPairMatches: function(reels) {
        const pairResults = [];
        const pairPayout = (this.payouts && this.payouts.ANY_PAIR) ? this.payouts.ANY_PAIR : { mult: 1, label: 'PAIR' };
        const pairMultiplierValue = Number(pairPayout.mult);
        const pairLabel = pairPayout.label || 'PAIR';
        const safePairMultiplier = Number.isFinite(pairMultiplierValue) && pairMultiplierValue > 0 ? pairMultiplierValue : 1;

        for (const rule of this.pairMatchRules) {
            const counts = {};
            reels.forEach((item, idx) => {
                const rawValue = item[rule.key];
                const normalized = this.normalizeTraitValue(rawValue, rule.key);
                if (!normalized) return;
                if (!counts[normalized]) counts[normalized] = [];
                counts[normalized].push({ idx, rawValue });
            });

            Object.entries(counts)
                .filter(([, arr]) => arr.length >= 2)
                .forEach(([normalizedValue, arr]) => {
                    const pairDisplay = arr[0].rawValue || rule.label || normalizedValue;
                    pairResults.push({
                        label: `${rule.label} (${pairDisplay})`,
                        multiplier: safePairMultiplier,
                        sourceLabel: pairLabel
                    });
                });
        }

        return pairResults;
    },

    formatWinMessage: function(jackpotResult) {
        const { matches, stackedTier } = jackpotResult;
        const parts = [];
        if (stackedTier) parts.push(stackedTier.label);

        const matchLabels = matches
            .map(match => {
                const val = typeof match.value === 'string' ? match.value : '';
                return val ? `${match.label} [${val}]` : match.label;
            });

        if (matchLabels.length > 0) {
            parts.push(matchLabels.slice(0, 3).join(' + '));
        } else {
            parts.push('JACKPOT');
        }

        return parts.join(' | ');
    },

    formatPairMessage: function(pairMatches) {
        if (!Array.isArray(pairMatches) || pairMatches.length === 0) return this.payouts.ANY_PAIR?.label || 'PAIR';
        const labels = pairMatches.map(match => match.label);
        if (labels.length === 1) return labels[0];
        return `PAIR STREAK | ${labels.join(' + ')}`;
    },

    checkWin: function() {
        const sanitizedReels = this.reelState.map((item, idx) => this.sanitizeReelItem(item, idx));
        const [i1, i2, i3] = sanitizedReels;
        const msgEl = document.getElementById('slot-message');
        const winEl = document.getElementById('last-win');
        
        let winAmount = 0;

        if (sanitizedReels.some(item => !item || item.isFallback)) {
            msgEl.textContent = "SIGNAL INTERFERENCE";
            msgEl.style.color = "#FF0";
            winEl.textContent = "WIN: 0c";
            return;
        }

        const jackpotResult = this.evaluateTraitMatches(sanitizedReels);
        if (jackpotResult.totalMultiplier > 0) {
            winAmount = this.bet * jackpotResult.totalMultiplier;
            this.game.player.earnMoney(winAmount);
            msgEl.textContent = this.formatWinMessage(jackpotResult);
            msgEl.style.color = "#0F0";
            winEl.textContent = `WIN: ${winAmount}c (x${jackpotResult.totalMultiplier})`;
            if (this.game.soundManager) this.game.soundManager.playPickup(); // Cha-ching
            return;
        }

        const pairMatches = this.detectPairMatches(sanitizedReels);
        if (pairMatches.length > 0) {
            const totalPairMult = pairMatches.reduce((sum, match) => sum + (match?.multiplier || 0), 0);
            winAmount = this.bet * totalPairMult;
            this.game.player.earnMoney(winAmount);
            msgEl.textContent = this.formatPairMessage(pairMatches);
            msgEl.style.color = "#0AA";
            winEl.textContent = `WIN: ${winAmount}c (x${totalPairMult})`;
            if (this.game.soundManager) this.game.soundManager.playPickup();
            return;
        }

        msgEl.textContent = "NO MATCH";
        msgEl.style.color = "#888";
        winEl.textContent = "WIN: 0c";
    }
};
