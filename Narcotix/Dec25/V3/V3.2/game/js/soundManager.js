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
            combat: 0,
            exploration: 1
        },
        
        // Spatial State
        safehousePan: 0,
        shopPan: 0,

        // Walkman State
        walkmanMode: false,
        walkmanLayer: {
            base: 1.0,   // Kick/Bass
            melody: 0.0, // Safe/Chill
            rhythm: 0.0, // High energy/Shop
            noise: 0.0   // Danger/Combat
        }
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

        this.music.walkmanMode = this.game.player.hasWalkmanActive;

        if (this.music.walkmanMode) {
            // --- WALKMAN MIXING LOGIC ---
            // "Non-stop player specific soundtrack that morphs"
            
            // 1. Determine "Danger" (Combat/Enemies)
            // Check for nearby enemies in chase/attack mode
            const enemiesNearby = this.game.enemyManager.list.filter(e => 
                (e.aiState === 'CHASE' || e.aiState === 'ATTACK') &&
                this.game.utils.distance(pX, pY, e.x, e.y) < 500
            );
            const dangerLevel = Math.min(1, enemiesNearby.length / 3); // 0 to 1

            // 2. Determine Zone Influence
            // Distance to Safehouse (Melodic)
            const dSafe = this.game.utils.distance(pX, pY, this.sources.safehouse.x, this.sources.safehouse.y);
            const safeInfluence = Math.max(0, 1 - (dSafe / 600));

            // Distance to Shop/Hub (Rhythmic)
            const dShop = this.game.utils.distance(pX, pY, this.sources.shop.x, this.sources.shop.y);
            const shopInfluence = Math.max(0, 1 - (dShop / 600));

            // Exploration (Base) - Always present, but modified by others
            
            // Target Weights
            const targetBase = 1.0;
            const targetMelody = safeInfluence; // High near safehouse
            const targetRhythm = shopInfluence; // High near shops
            const targetNoise = dangerLevel;    // High in combat

            // Smooth Transitions (Lerp)
            const lerp = (start, end, amt) => (1 - amt) * start + amt * end;
            const dt = 0.05; // Smoothing factor

            this.music.walkmanLayer.base = targetBase; // Constant drive
            this.music.walkmanLayer.melody = lerp(this.music.walkmanLayer.melody, targetMelody, dt);
            this.music.walkmanLayer.rhythm = lerp(this.music.walkmanLayer.rhythm, targetRhythm, dt);
            this.music.walkmanLayer.noise = lerp(this.music.walkmanLayer.noise, targetNoise, dt);

            // Tempo Modulation: Faster in danger
            const targetTempo = 110 + (dangerLevel * 30); // 110 to 140
            this.music.tempo = lerp(this.music.tempo, targetTempo, 0.05);

        } else {
            // --- STANDARD AMBIENT MIXING LOGIC ---
            // 1. Safehouse Weight
            const dSafe = this.game.utils.distance(pX, pY, this.sources.safehouse.x, this.sources.safehouse.y);
            this.music.weights.safehouse = Math.max(0, 1 - (dSafe / this.sources.safehouse.radius));
            this.music.safehousePan = Math.max(-1, Math.min(1, (this.sources.safehouse.x - pX) / 400));

            // 2. Shop Weight
            const dShop = this.game.utils.distance(pX, pY, this.sources.shop.x, this.sources.shop.y);
            this.music.weights.shop = Math.max(0, 1 - (dShop / this.sources.shop.radius));
            this.music.shopPan = Math.max(-1, Math.min(1, (this.sources.shop.x - pX) / 400));
            
            this.music.tempo = 110; // Reset tempo
        }
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
        const offset = time - this.audioCtx.currentTime;

        if (this.music.walkmanMode) {
            this.scheduleWalkmanTrack(beatNumber, offset);
        } else {
            this.scheduleAmbientTrack(beatNumber, offset);
        }
    },

    scheduleAmbientTrack: function(beatNumber, offset) {
        const w = this.music.weights;

        // --- TRACK 1: SAFEHOUSE (Chill Lo-Fi) ---
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
    },

    scheduleWalkmanTrack: function(beatNumber, offset) {
        const layer = this.music.walkmanLayer;
        // Centralized Pan (Headphones)
        const pan = 0; 

        // 1. BASE LAYER (Driving Synthwave)
        // Kick
        if (beatNumber % 4 === 0) this.playSpatialTone(pan, layer.base * 0.8, 60, 'square', 0.1, offset); // Deep Kick
        // Snare
        if (beatNumber % 8 === 4) this.playSpatialTone(pan, layer.base * 0.6, 200, 'sawtooth', 0.1, offset);
        // Bass (Rolling 16ths)
        const bassNote = [55, 55, 65, 55][Math.floor(beatNumber / 4)]; // A1 -> C2
        this.playSpatialTone(pan, layer.base * 0.4, bassNote, 'sawtooth', 0.1, offset);


        // 2. MELODY LAYER (Safehouse/Chill Influence)
        if (layer.melody > 0.1) {
            // Arpeggio
            const arpNotes = [220, 261, 329, 392]; // Am7
            const note = arpNotes[beatNumber % 4];
            this.playSpatialTone(pan, layer.melody * 0.3, note, 'sine', 0.2, offset);
            
            // Long Pad on 1
            if (beatNumber === 0) {
                this.playSpatialTone(pan, layer.melody * 0.2, 110, 'triangle', 2.0, offset);
            }
        }

        // 3. RHYTHM LAYER (Shop/Tech Influence)
        if (layer.rhythm > 0.1) {
            // Hi-Hats (16th notes)
            this.playSpatialTone(pan, layer.rhythm * 0.2, 8000 + (beatNumber%2)*2000, 'square', 0.03, offset);
            
            // Syncopated Percussion
            if (beatNumber % 8 === 2 || beatNumber % 8 === 6) {
                this.playSpatialTone(pan, layer.rhythm * 0.3, 800, 'triangle', 0.05, offset);
            }
        }

        // 4. NOISE LAYER (Combat/Danger Influence)
        if (layer.noise > 0.1) {
            // Distortion/Grit (Random freq square waves)
            if (beatNumber % 2 === 0) {
                 this.playSpatialTone(pan, layer.noise * 0.2, 100 + Math.random()*200, 'sawtooth', 0.05, offset);
            }
            // Alarm-like Lead
            if (beatNumber % 4 === 0) {
                this.playSpatialTone(pan, layer.noise * 0.3, 880, 'square', 0.1, offset);
            }
        }
    },

    // --- SFX (Global/Spatial) ---
    playTone: function(freq, type, duration, startTime = 0, vol = 1) {
        this.playSpatialTone(0, vol, freq, type, duration, startTime);
    },
    playShoot: function() { this.playTone(800, 'square', 0.1, 0, 0.3); },
    playHit: function() { this.playTone(100, 'sawtooth', 0.1, 0, 0.4); }, 
    playPickup: function() { this.playTone(1200, 'sine', 0.1, 0, 0.4); },
    playDamage: function() { this.playTone(150, 'sawtooth', 0.2, 0, 0.8); },
    playUI: function() { this.playTone(2000, 'sine', 0.05, 0, 0.1); },
    
    playEnemyAlert: function(x, y) {
        if (!this.game || !this.game.player) return;
        const pX = this.game.player.x + this.game.player.width/2;
        const pan = Math.max(-1, Math.min(1, (x - pX) / 400));
        this.playSpatialTone(pan, 0.6, 600, 'triangle', 0.3);
    }
};