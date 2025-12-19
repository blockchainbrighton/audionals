import { imageLoader } from '../imageLoader.js';

export const RouletteGame = {
    game: null,
    bets: {}, // { 'key:value': amount }
    chipValue: 10,
    isSpinning: false,
    lastResult: null,

    // Payout Multipliers (Approximate based on rarity)
    ODDS: {
        'shape': 5,      // ~1/5 chance
        'base': 6,       // ~1/6 chance
        'expression': 8  // ~1/8 chance
    },

    options: {
        shapes: ['Round', 'Star', 'Diamond', 'Triangle', 'Capsule'],
        colors: ['Red', 'Blue', 'Green', 'Yellow', 'Purple', 'Pink'], // Mapped to 'base'
        expressions: ['XO', 'X]', 'X)', 'X}', 'X>', 'X|'] 
    },
    
    preloadBuffer: [],
    history: [], // Session history

    init: function(gameInstance) {
        this.game = gameInstance;
        this.bets = {};
        this.preloadBuffer = [];
        this.history = [];
    },

    addHistory: function(msg, type = 'info') {
        const time = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        this.history.unshift({ time, msg, type });
        if (this.history.length > 50) this.history.pop();
        this.updateHistoryUI();
    },

    updateHistoryUI: function() {
        const el = document.getElementById('roulette-history-log');
        if (!el) return;
        el.innerHTML = this.history.map(h => `
            <div class="history-entry history-${h.type}">
                <span style="color:#555">[${h.time}]</span> ${h.msg}
            </div>
        `).join('');
    },

    preloadImages: function() {
        const pool = this.game.collectionData || [];
        if (pool.length === 0) return;

        // Ensure we have at least 20 preloaded outcomes ready
        while (this.preloadBuffer.length < 20) {
            const r = Math.floor(Math.random() * pool.length);
            const item = pool[r];
            if (item && item.id) {
                imageLoader.preload(item.id);
                this.preloadBuffer.push(item);
            }
        }
    },

    renderUI: function(container, actionsContainer) {
        container.innerHTML = `
            <div class="casino-layout roulette-theme">
                <div class="roulette-header">
                    <span class="neon-text-blink">TRAIT ROULETTE</span>
                    <div class="roulette-result" id="roulette-result-display">
                        <div id="roulette-img-placeholder">?</div>
                    </div>
                </div>

                <div class="roulette-board">
                    <div class="bet-section">
                        <h5>SHAPE (x${this.ODDS.shape})</h5>
                        <div class="bet-grid" id="grid-shape"></div>
                    </div>
                    <div class="bet-section">
                        <h5>PIGMENT (x${this.ODDS.base})</h5>
                        <div class="bet-grid" id="grid-base"></div>
                    </div>
                    <div class="bet-section">
                        <h5>EXPRESSION (x${this.ODDS.expression})</h5>
                        <div class="bet-grid" id="grid-expression"></div>
                    </div>
                </div>

                <div class="roulette-controls">
                    <div class="chip-selector">
                        <span>CHIP:</span>
                        <button class="button button-small chip-btn selected" data-val="10">10</button>
                        <button class="button button-small chip-btn" data-val="50">50</button>
                        <button class="button button-small chip-btn" data-val="100">100</button>
                    </div>
                    <div class="total-bet">TOTAL BET: <span id="total-bet-val" style="color:#0FF">0</span>c</div>
                </div>

                <div class="roulette-history" id="roulette-history-log">
                    <div class="history-entry history-info">Welcome to Trait Roulette. Place your bets.</div>
                </div>
            </div>
        `;

        actionsContainer.innerHTML = `
            <button class="button button-large" id="btn-spin-roulette">SPIN</button>
            <button class="button" id="btn-clear-bets">CLEAR</button>
            <button class="button" id="btn-leave-roulette">LEAVE</button>
        `;

        this.renderBetButtons();
        this.attachEvents();
        this.updateHistoryUI();
    },

    renderBetButtons: function() {
        // Shapes
        const shapeGrid = document.getElementById('grid-shape');
        this.options.shapes.forEach(opt => this.createBetButton(shapeGrid, 'shape', opt));

        // Colors (Base)
        const colorGrid = document.getElementById('grid-base');
        this.options.colors.forEach(opt => this.createBetButton(colorGrid, 'base', opt));

        // Expressions
        const exprGrid = document.getElementById('grid-expression');
        this.options.expressions.forEach(opt => this.createBetButton(exprGrid, 'expression', opt));
    },

    createBetButton: function(parent, type, value) {
        const btn = document.createElement('div');
        btn.className = 'bet-option';
        btn.dataset.type = type;
        btn.dataset.value = value;
        btn.textContent = value;
        
        const key = `${type}:${value}`;
        if (this.bets[key]) {
            const chip = document.createElement('div');
            chip.className = 'bet-chip';
            chip.textContent = this.bets[key];
            btn.appendChild(chip);
            btn.classList.add('has-bet');
        }

        btn.onclick = () => this.placeBet(type, value);
        parent.appendChild(btn);
    },

    attachEvents: function() {
        // Chip Selection
        document.querySelectorAll('.chip-btn').forEach(btn => {
            btn.onclick = (e) => {
                document.querySelectorAll('.chip-btn').forEach(b => b.classList.remove('selected'));
                e.target.classList.add('selected');
                this.chipValue = parseInt(e.target.dataset.val);
            };
        });

        document.getElementById('btn-spin-roulette').onclick = () => this.spin();
        document.getElementById('btn-clear-bets').onclick = () => this.clearBets();
        document.getElementById('btn-leave-roulette').onclick = () => this.game.exitLocation();
    },

    placeBet: function(type, value) {
        if (this.isSpinning) return;
        const key = `${type}:${value}`;
        
        // Check funds for this specific chip
        if (this.game.player.money < this.getTotalBet() + this.chipValue) {
            this.game.utils.addMessage("Insufficient Creds for this bet.");
            return;
        }

        if (!this.bets[key]) this.bets[key] = 0;
        this.bets[key] += this.chipValue;
        
        this.updateBetUI();
    },

    clearBets: function() {
        if (this.isSpinning) return;
        this.bets = {};
        this.updateBetUI();
    },

    getTotalBet: function() {
        return Object.values(this.bets).reduce((a, b) => a + b, 0);
    },

    updateBetUI: function() {
        document.getElementById('total-bet-val').textContent = this.getTotalBet();
        // Re-render buttons to show chips
        const options = document.querySelectorAll('.bet-option');
        options.forEach(btn => {
            const type = btn.dataset.type;
            const val = btn.dataset.value;
            const key = `${type}:${val}`;
            
            // Remove old chips
            const oldChip = btn.querySelector('.bet-chip');
            if(oldChip) oldChip.remove();
            btn.classList.remove('has-bet');

            if (this.bets[key]) {
                const chip = document.createElement('div');
                chip.className = 'bet-chip';
                chip.textContent = this.bets[key];
                btn.appendChild(chip);
                btn.classList.add('has-bet');
            }
        });
    },

    spin: function() {
        const totalBet = this.getTotalBet();
        if (totalBet === 0) {
            this.game.utils.addMessage("Place a bet first.");
            return;
        }
        if (this.isSpinning) return;

        if (!this.game.player.payMoney(totalBet)) return;

        this.addHistory(`SPINNING... (Bet: ${totalBet}c)`, 'info');
        this.isSpinning = true;
        document.getElementById('btn-spin-roulette').disabled = true;
        const display = document.getElementById('roulette-result-display');
        
        // Ensure buffer is ready
        this.preloadImages();
        const spinPool = this.preloadBuffer.length > 0 ? this.preloadBuffer : (this.game.collectionData || []);

        const duration = 2000;
        const intervalTime = 100;
        let elapsed = 0;

        const spinInterval = setInterval(() => {
            elapsed += intervalTime;
            
            // Visual Cycle
            const randomItem = spinPool[Math.floor(Math.random() * spinPool.length)];
            if (randomItem) {
                // Reuse showResult logic but without text details for speed/cleanliness during spin
                const imgUrl = imageLoader.getUrl(randomItem.id);
                const attemptState = imgUrl.includes('ipfs.io') ? 'ipfs' : 'hiro';
                
                display.innerHTML = `
                    <div style="text-align:center; animation: pulse 0.1s infinite;">
                        <img src="${imgUrl}" data-img-attempt="${attemptState}" style="width:80px; height:80px; opacity:0.7; filter:blur(1px);" onerror="game.casino.Roulette.handleImageError(this, '${randomItem.id}')">
                    </div>
                `;
            }

            if (this.game.soundManager) this.game.soundManager.playUI(); // Click sound

            if (elapsed >= duration) {
                clearInterval(spinInterval);
                this.finalizeSpin();
            }
        }, intervalTime);
    },

    finalizeSpin: function() {
        // Replenish buffer if low
        this.preloadImages(); 
        
        let choice = null;
        if (this.preloadBuffer.length > 0) {
            choice = this.preloadBuffer.shift();
        } else {
            const pool = this.game.collectionData || [];
            if (pool.length > 0) {
                choice = pool[Math.floor(Math.random() * pool.length)];
            }
        }

        if (!choice) {
            this.isSpinning = false;
            return;
        }

        this.showResult(choice);
        const resultLabel = `${choice.shape} | ${choice.base} | ${choice.expression}`;
        this.addHistory(`RESULT: ${resultLabel}`, 'info');

        // Check Wins
        let totalWin = 0;
        const winningBets = []; // Store winning criteria {type, value}

        const norm = (s) => String(s || '').trim().toLowerCase();

        // Check Shape
        const shapeVal = this.options.shapes.find(s => norm(choice.shape).includes(norm(s)));
        if (shapeVal) {
             const key = `shape:${shapeVal}`;
             if (this.bets[key]) {
                 const win = this.bets[key] * this.ODDS.shape;
                 totalWin += win;
                 winningBets.push({type: 'shape', value: shapeVal});
                 this.addHistory(`WIN: Shape ${shapeVal} (x${this.ODDS.shape}) +${win}c`, 'win');
             }
        }

        // Check Color/Base
        const baseVal = this.options.colors.find(c => norm(choice.base).includes(norm(c)));
        if (baseVal) {
             const key = `base:${baseVal}`;
             if (this.bets[key]) {
                 const win = this.bets[key] * this.ODDS.base;
                 totalWin += win;
                 winningBets.push({type: 'base', value: baseVal});
                 this.addHistory(`WIN: Color ${baseVal} (x${this.ODDS.base}) +${win}c`, 'win');
             }
        }

        // Check Expression
        const exprVal = this.options.expressions.find(e => norm(choice.expression).includes(norm(e)));
        if (exprVal) {
             const key = `expression:${exprVal}`;
             if (this.bets[key]) {
                 const win = this.bets[key] * this.ODDS.expression;
                 totalWin += win;
                 winningBets.push({type: 'expression', value: exprVal});
                 this.addHistory(`WIN: Expr ${exprVal} (x${this.ODDS.expression}) +${win}c`, 'win');
             }
        }

        if (totalWin > 0) {
            this.game.player.earnMoney(totalWin);
            this.game.utils.addMessage(`WINNER! +${totalWin}c`);
            if (this.game.soundManager) this.game.soundManager.playPickup();
            this.highlightWins(winningBets);
        } else {
            this.game.utils.addMessage("No Match.");
            this.addHistory(`LOSS: No matches.`, 'loss');
        }

        // Delay clearing the table so player can see results
        setTimeout(() => {
            this.clearTable();
        }, 3000);
    },

    highlightWins: function(winners) {
        winners.forEach(w => {
            // Find button by data attributes
            const btn = document.querySelector(`.bet-option[data-type="${w.type}"][data-value="${w.value}"]`);
            if (btn) {
                btn.style.backgroundColor = '#0F0';
                btn.style.color = '#000';
                btn.style.borderColor = '#FFF';
                btn.style.boxShadow = '0 0 10px #0F0';
                btn.style.transform = 'scale(1.1)';
                btn.style.zIndex = '10';
            }
        });
    },

    clearTable: function() {
        this.bets = {};
        this.updateBetUI();
        this.isSpinning = false;
        const spinBtn = document.getElementById('btn-spin-roulette');
        if(spinBtn) spinBtn.disabled = false;
        
        // Reset styles for all bet buttons
        document.querySelectorAll('.bet-option').forEach(btn => {
            btn.style.backgroundColor = '';
            btn.style.color = '';
            btn.style.borderColor = '';
            btn.style.boxShadow = '';
            btn.style.transform = '';
            btn.style.zIndex = '';
        });
        
        // Reset result display to '?'
        const display = document.getElementById('roulette-result-display');
        if(display) {
            display.innerHTML = '<div id="roulette-img-placeholder" style="font-size:40px; color:#555;">?</div>';
        }
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

    showResult: function(item) {
        const display = document.getElementById('roulette-result-display');
        const imgUrl = imageLoader.getUrl(item.id);
        const attemptState = imgUrl.includes('ipfs.io') ? 'ipfs' : 'hiro';
        
        display.innerHTML = `
            <div style="text-align:center;">
                <img src="${imgUrl}" data-img-attempt="${attemptState}" style="width:80px; height:80px; border:2px solid #FFF;" onerror="game.casino.Roulette.handleImageError(this, '${item.id}')">
                <div style="font-size:12px; margin-top:5px;">${item.name || 'Unknown'}</div>
                <div style="font-size:10px; color:#888;">${item.shape} | ${item.base} | ${item.expression}</div>
            </div>
        `;
    }
};
