// js/soundManager.js

export const soundManager = {
    audioCtx: null,
    masterGain: null,
    game: null,
    enabled: true,
    
    // Music System
    music: {
        isPlaying: false,
        nextNoteTime: 0,
        current16thNote: 0,
        tempo: 110,
        lookahead: 25.0, 
        scheduleAheadTime: 0.1, 
        timerID: null,
        
        // Dynamic Weights (0.0 to 1.0)
        weights: {
            safehouse: 0,
            shop: 0,
            walkman: 0
        },
        
        // Spatial State
        safehousePan: 0,
        shopPan: 0
    },

    sources: {
        // Defined locations in tiles * TILE_SIZE
        safehouse: { x: 5 * 32, y: 6 * 32, radius: 400 }, 
        shop: { x: 40 * 32, y: 6 * 32, radius: 400 } // Xemist Den example
    },

    init: function(gameInstance) {
        this.game = gameInstance;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioCtx = new AudioContext();
            this.masterGain = this.audioCtx.createGain();
            this.masterGain.gain.value = 0.3; 
            this.masterGain.connect(this.audioCtx.destination);
            console.log("[Audio] Sound System Initialized.");
        } catch (e) {
            console.warn("[Audio] Web Audio API not supported.", e);
            this.enabled = false;
        }
    },

    resume: function() {
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
        if (this.enabled && !this.music.isPlaying) {
            this.music.isPlaying = true;
            this.music.nextNoteTime = this.audioCtx.currentTime;
            this.scheduler();
        }
    },

    updateMusicState: function() {
        // Called by game loop to update spatial weights
        if (!this.game || !this.game.player) return;

        const pX = this.game.player.x + this.game.player.width/2;
        const pY = this.game.player.y + this.game.player.height/2;

        // 1. Safehouse Weight
        const dSafe = this.game.utils.distance(pX, pY, this.sources.safehouse.x, this.sources.safehouse.y);
        this.music.weights.safehouse = Math.max(0, 1 - (dSafe / this.sources.safehouse.radius));
        this.music.safehousePan = Math.max(-1, Math.min(1, (this.sources.safehouse.x - pX) / 400));

        // 2. Shop Weight
        const dShop = this.game.utils.distance(pX, pY, this.sources.shop.x, this.sources.shop.y);
        this.music.weights.shop = Math.max(0, 1 - (dShop / this.sources.shop.radius));
        this.music.shopPan = Math.max(-1, Math.min(1, (this.sources.shop.x - pX) / 400));

        // 3. Walkman Weight (Global)
        // Only active if player has toggled it ON (stored in player.hasWalkman)
        // If Walkman is ON, it might override others or mix. Let's mix.
        this.music.weights.walkman = this.game.player.hasWalkman ? 0.8 : 0;

        // Combat Tempo Check (Only affects Walkman track usually, or global tempo)
        const isCombat = this.game.enemyManager.list.some(e => e.aiState === 'CHASE' || e.aiState === 'ATTACK');
        this.music.tempo = isCombat ? 135 : 110;
    },

    // --- Spatial Audio Helper ---
    playSpatialTone: function(pan, gainVal, freq, type, duration, startTime = 0) {
        if (gainVal <= 0.01) return;

        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        const panner = this.audioCtx.createStereoPanner();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime + startTime);

        gain.gain.setValueAtTime(gainVal, this.audioCtx.currentTime + startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + startTime + duration);
        
        panner.pan.value = pan;

        osc.connect(gain);
        gain.connect(panner);
        panner.connect(this.masterGain);

        osc.start(this.audioCtx.currentTime + startTime);
        osc.stop(this.audioCtx.currentTime + startTime + duration);
    },

    // --- Scheduler ---
    scheduler: function() {
        if (!this.enabled) return;
        while (this.music.nextNoteTime < this.audioCtx.currentTime + this.music.scheduleAheadTime) {
            this.scheduleNote(this.music.current16thNote, this.music.nextNoteTime);
            this.nextNote();
        }
        this.music.timerID = window.setTimeout(() => this.scheduler(), this.music.lookahead);
    },

    nextNote: function() {
        const secondsPerBeat = 60.0 / this.music.tempo;
        this.music.nextNoteTime += 0.25 * secondsPerBeat; 
        this.music.current16thNote++;
        if (this.music.current16thNote === 16) {
            this.music.current16thNote = 0;
        }
    },

    scheduleNote: function(beatNumber, time) {
        const w = this.music.weights;
        const offset = time - this.audioCtx.currentTime;

        // --- TRACK 1: SAFEHOUSE (Chill Lo-Fi) ---
        // Sine/Triangle chords, slow drums
        if (w.safehouse > 0) {
            const pan = this.music.safehousePan;
            // Kick (4-on-the-floor)
            if (beatNumber % 4 === 0) this.playSpatialTone(pan, w.safehouse * 0.6, 100, 'sine', 0.2, offset);
            // Pads
            if (beatNumber === 0) {
                this.playSpatialTone(pan, w.safehouse * 0.3, 220, 'triangle', 1.0, offset); // A3
                this.playSpatialTone(pan, w.safehouse * 0.3, 261, 'triangle', 1.0, offset); // C4
                this.playSpatialTone(pan, w.safehouse * 0.3, 329, 'triangle', 1.0, offset); // E4
            }
        }

        // --- TRACK 2: SHOP (Upbeat Techno) ---
        if (w.shop > 0) {
            const pan = this.music.shopPan;
            // Fast Hats
            if (beatNumber % 2 === 0) this.playSpatialTone(pan, w.shop * 0.2, 8000, 'square', 0.05, offset);
            // Bass Arp
            const note = [110, 110, 220, 110][Math.floor(beatNumber / 4)];
            if (beatNumber % 2 === 0) this.playSpatialTone(pan, w.shop * 0.4, note, 'sawtooth', 0.1, offset);
        }

        // --- TRACK 3: WALKMAN (Dynamic Player Track) ---
        if (w.walkman > 0) {
            // This is the combat/calm track from before, centralized (pan 0)
            const root = 82.41; 
            const isCombat = this.music.tempo > 120;

            // Kick
            if (beatNumber % 4 === 0) this.playSpatialTone(0, w.walkman * 0.8, 150, 'sine', 0.1, offset); // Punchy kick
            
            // Bass
            if (isCombat) {
                if (beatNumber % 2 === 0) this.playSpatialTone(0, w.walkman * 0.4, root, 'sawtooth', 0.1, offset);
            } else {
                if (beatNumber === 0) this.playSpatialTone(0, w.walkman * 0.3, root, 'triangle', 1.0, offset);
            }

            // Snare (Combat)
            if (isCombat && beatNumber % 8 === 4) {
                // Noise burst simulation using high freq random
                 this.playSpatialTone(0, w.walkman * 0.4, Math.random()*1000+1000, 'square', 0.1, offset); 
            }
        }
    },

    // --- SFX (Global/Spatial) ---
    // Kept simplified for space, assuming spatial where appropriate or global
    playTone: function(freq, type, duration, startTime = 0, vol = 1) {
        this.playSpatialTone(0, vol, freq, type, duration, startTime);
    },
    playShoot: function() { this.playTone(800, 'square', 0.1, 0, 0.3); },
    playHit: function() { this.playTone(100, 'sawtooth', 0.1, 0, 0.4); }, // Simplified hit
    playPickup: function() { this.playTone(1200, 'sine', 0.1, 0, 0.4); },
    playDamage: function() { this.playTone(150, 'sawtooth', 0.2, 0, 0.8); },
    playUI: function() { this.playTone(2000, 'sine', 0.05, 0, 0.1); },
    
    playEnemyAlert: function(x, y) {
        // Calculate pan
        if (!this.game || !this.game.player) return;
        const pX = this.game.player.x + this.game.player.width/2;
        const pan = Math.max(-1, Math.min(1, (x - pX) / 400));
        this.playSpatialTone(pan, 0.6, 600, 'triangle', 0.3);
    }
};
