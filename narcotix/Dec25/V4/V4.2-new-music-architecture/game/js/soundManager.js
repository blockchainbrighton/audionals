// js/soundManager.js

export const soundManager = {
    audioCtx: null,
    masterGain: null,
    compressor: null,
    game: null,
    enabled: false,
    initialized: false,

    // --- Music State ---
    music: {
        isPlaying: false,
        tempo: 100, // BPM
        currentSixteenth: 0,
        nextNoteTime: 0,
        lookahead: 25.0,
        scheduleAheadTime: 0.1,
        timerID: null,
        
        // The current "Vibe" driving the generator
        activeProfile: 'SILENCE', 
        
        // Intensity (0.0 - 1.0) - Drives complexity and volume of layers
        intensity: 0, 
        targetIntensity: 0,

        // Musical Context
        rootFreq: 55, // A1
        scale: [], // Current set of allowed frequencies
        chord: [], // Current active chord tones
        chordChangeCounter: 0
    },

    // --- Profiles (The "Vibes") ---
    profiles: {
        SAFEHOUSE: {
            tempo: 70,
            scaleType: 'minor',
            root: 55, // A
            prob: { pad: 1.0, bass: 0.0, lead: 0.2, perc: 0.0 }, // Pure ambient
            padType: 'lush',
            description: "Super chilled pads and relaxation"
        },
        EXPLORATION: {
            tempo: 95,
            scaleType: 'dorian',
            root: 49, // G
            prob: { pad: 0.6, bass: 0.8, lead: 0.3, perc: 0.4 }, // Atmospheric but moving
            padType: 'dark',
            description: "Mystery and tension"
        },
        SHOP: {
            tempo: 110,
            scaleType: 'pentatonic',
            root: 65, // C
            prob: { pad: 0.3, bass: 0.6, lead: 0.0, perc: 0.8 }, // Tech/Rhythmic
            padType: 'thin',
            description: "Data processing beats"
        },
        BAR: {
            tempo: 85,
            scaleType: 'dorian',
            root: 58, // Bb
            prob: { pad: 0.5, bass: 0.8, lead: 0.4, perc: 0.5 }, // Jazzy/Lo-fi
            padType: 'lush', // Re-use lush for smoky vibe
            description: "Glitch & Tonic smooth jazz"
        },
        CASINO: {
            tempo: 140,
            scaleType: 'major',
            root: 60, // C
            prob: { pad: 0.2, bass: 0.8, lead: 0.8, perc: 0.9 }, // High energy
            padType: 'thin',
            description: "Lucky Hash manic loops"
        },
        ARMOURY: {
            tempo: 90,
            scaleType: 'minor',
            root: 36, // Low C
            prob: { pad: 0.1, bass: 1.0, lead: 0.1, perc: 0.6 }, // Heavy Industrial
            padType: 'dark',
            description: "Heavy metal munitions"
        },
        COMBAT: {
            tempo: 135,
            scaleType: 'minor',
            root: 41, // E
            prob: { pad: 0.2, bass: 1.0, lead: 0.7, perc: 1.0 }, // Aggressive
            padType: 'dark',
            description: "High octane action"
        },
        WALKMAN: {
            tempo: 120, // Variable
            scaleType: 'minor',
            root: 55, 
            prob: { pad: 0.5, bass: 1.0, lead: 0.5, perc: 1.0 }, // Full Mix
            padType: 'retro',
            description: "Personal Soundtrack"
        }
    },

    // --- Initialization ---
    init: function(gameInstance) {
        this.game = gameInstance;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioCtx = new AudioContext();
            
            // Master Bus Chain: Master Gain -> Compressor -> Destination
            this.masterGain = this.audioCtx.createGain();
            this.masterGain.gain.value = 0.4; // Initial Volume
            
            this.compressor = this.audioCtx.createDynamicsCompressor();
            this.compressor.threshold.setValueAtTime(-20, this.audioCtx.currentTime);
            this.compressor.knee.setValueAtTime(40, this.audioCtx.currentTime);
            this.compressor.ratio.setValueAtTime(12, this.audioCtx.currentTime);
            this.compressor.attack.setValueAtTime(0, this.audioCtx.currentTime);
            this.compressor.release.setValueAtTime(0.25, this.audioCtx.currentTime);

            this.masterGain.connect(this.compressor);
            this.compressor.connect(this.audioCtx.destination);
            
            this.initialized = true;
            this.enabled = true; // Default enable, but requires user interaction to unlock
            console.log("[Audio] Generative Synthwave Engine Initialized.");
        } catch (e) {
            console.warn("[Audio] Web Audio API not supported.", e);
            this.enabled = false;
        }
        
        // Init Scales
        this.generateScale('minor', 55); 
    },

    resume: function() {
        if (!this.initialized) return;
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
        if (this.enabled && !this.music.isPlaying) {
            this.music.isPlaying = true;
            this.music.nextNoteTime = this.audioCtx.currentTime;
            this.scheduler();
        }
    },

    // --- State Management ---
    updateMusicState: function() {
        if (!this.game || !this.game.player) return;

        const player = this.game.player;
        const enemiesActive = this.game.enemyManager.list.some(e => 
            (e.aiState === 'CHASE' || e.aiState === 'ATTACK') &&
            this.game.utils.distance(player.x, player.y, e.x, e.y) < 600
        );

        // 1. Determine Target Profile & Intensity
        let targetProfileKey = 'EXPLORATION'; // Default
        let targetInt = 0.3;

        // Check Zone/Location overrides first
        const mapId = this.game.mapManager.currentMapId;
        
        if (player.hasWalkmanActive) {
            targetProfileKey = 'WALKMAN';
            // Walkman Intensity logic
            if (enemiesActive) {
                targetInt = 1.0; // Combat max
            } else if (Math.abs(player.vx) > 0.1 || Math.abs(player.vy) > 0.1) {
                targetInt = 0.7; // Moving/Running
            } else {
                targetInt = 0.4; // Idle
            }
        } else {
            // Environmental Logic
            if (mapId.includes('safehouse')) {
                targetProfileKey = 'SAFEHOUSE';
                targetInt = 0.0; // Pure chill
            } else if (enemiesActive) {
                targetProfileKey = 'COMBAT';
                targetInt = 1.0;
            } else if (this.game.gameState === 'SHOP_MENU') {
                if (this.game.currentShopId && this.game.currentShopId.includes('armoury')) {
                    targetProfileKey = 'ARMOURY';
                    targetInt = 0.6;
                } else {
                    targetProfileKey = 'SHOP';
                    targetInt = 0.5;
                }
            } else if (this.game.gameState === 'INTERACTION_MODE') {
                targetProfileKey = 'BAR'; // Assuming Bar is the main interaction mode for now
                targetInt = 0.4;
            } else if (this.game.gameState === 'MINIGAME') {
                targetProfileKey = 'CASINO';
                targetInt = 0.8;
            } else {
                // Default Exploration
                targetProfileKey = 'EXPLORATION';
                targetInt = 0.3;
            }
        }

        // 2. Apply Profile Changes
        if (targetProfileKey !== this.music.activeProfile) {
            this.switchProfile(targetProfileKey);
        }

        // 3. Smooth Intensity Transition
        const lerp = (start, end, amt) => (1 - amt) * start + amt * end;
        this.music.intensity = lerp(this.music.intensity, targetInt, 0.05);
        
        // 4. Dynamic Tempo for Walkman
        if (targetProfileKey === 'WALKMAN') {
            const baseTempo = 110;
            const newTempo = baseTempo + (this.music.intensity * 40); // 110 -> 150 bpm
            this.music.tempo = lerp(this.music.tempo, newTempo, 0.05);
        }
    },

    switchProfile: function(key) {
        console.log(`[Audio] Switching Profile: ${key}`);
        const p = this.profiles[key];
        this.music.activeProfile = key;
        
        // Only hard set tempo if NOT walkman (Walkman modulates it)
        if (key !== 'WALKMAN') {
            this.music.tempo = p.tempo;
        }
        
        // Regenerate Scale/Key Context
        this.music.rootFreq = p.root;
        this.generateScale(p.scaleType, p.root);
        this.music.chordChangeCounter = 0;
    },

    // --- Music Theory Helper ---
    generateScale: function(type, root) {
        // Frequencies for 2 octaves
        // Minor: 0, 2, 3, 5, 7, 8, 10
        // Dorian: 0, 2, 3, 5, 7, 9, 10
        // Pentatonic: 0, 3, 5, 7, 10
        
        const intervals = {
            'minor': [0, 2, 3, 5, 7, 8, 10],
            'major': [0, 2, 4, 5, 7, 9, 11],
            'dorian': [0, 2, 3, 5, 7, 9, 10],
            'pentatonic': [0, 3, 5, 7, 10]
        }[type] || [0, 2, 3, 5, 7, 8, 10];

        const getFreq = (semitones) => root * Math.pow(2, semitones / 12);
        
        this.music.scale = [];
        // Generate 3 Octaves
        for (let oct = 0; oct < 3; oct++) {
            intervals.forEach(i => {
                this.music.scale.push(getFreq(i + (oct * 12)));
            });
        }
    },

    pickNote: function(octaveOffset = 0) {
        // Pick a note from the current scale, preferably one in the current "chord"
        // For simplicity, just pick random scale degrees for now, prioritized by low/mid/high
        const s = this.music.scale;
        if (!s.length) return 220;
        
        // Restrict range based on request
        let start = 0;
        let end = s.length - 1;
        
        if (octaveOffset < 0) { end = Math.floor(s.length / 2); } // Bass
        else if (octaveOffset > 0) { start = Math.floor(s.length / 2); } // Lead
        
        const idx = Math.floor(start + Math.random() * (end - start));
        return s[idx];
    },

    // --- Scheduler (The Conductor) ---
    scheduler: function() {
        if (!this.enabled) return;
        while (this.music.nextNoteTime < this.audioCtx.currentTime + this.music.scheduleAheadTime) {
            this.playTick(this.music.currentSixteenth, this.music.nextNoteTime);
            this.nextNote();
        }
        this.music.timerID = window.setTimeout(() => this.scheduler(), this.music.lookahead);
    },

    nextNote: function() {
        const secondsPerBeat = 60.0 / this.music.tempo;
        this.music.nextNoteTime += 0.25 * secondsPerBeat; // 16th notes
        this.music.currentSixteenth++;
        if (this.music.currentSixteenth === 16) {
            this.music.currentSixteenth = 0;
        }
    },

    playTick: function(tick, time) {
        const p = this.profiles[this.music.activeProfile];
        const int = this.music.intensity; // 0.0 to 1.0

        // Chord Changes (Every 4 bars typically, or slow random)
        if (tick === 0 && this.music.chordChangeCounter++ > 3) {
            this.music.chordChangeCounter = 0;
            // Repick root? Or just let the generative pads handle it.
            // For pads, we trigger them on tick 0 mostly.
        }

        // --- 1. PADS (The Atmosphere) ---
        // Triggered sparsely, usually on beat 1 (tick 0)
        if (tick === 0 && Math.random() < p.prob.pad) {
            const root = this.music.scale[0]; // Root
            const third = this.music.scale[2]; // Minor 3rd
            const fifth = this.music.scale[4]; // 5th
            const seventh = this.music.scale[6]; // 7th
            
            // Randomize chord voicing
            const chord = [root, fifth, Math.random()>0.5?third:seventh]; 
            
            chord.forEach((freq, i) => {
                // Stagger entrance slightly for humanity
                this.synthPad(freq, time + (i*0.05), 4.0, p.padType);
            });
        }

        // --- 2. BASS (The Drive) ---
        // Active on 16ths or 8ths depending on intensity
        if (p.prob.bass > 0) {
            const isDownbeat = (tick % 4 === 0);
            const isOffbeat = (tick % 4 === 2);
            
            let playBass = false;
            if (int > 0.8) playBass = true; // Rolling 16ths
            else if (int > 0.5) playBass = isDownbeat || isOffbeat; // 8ths
            else playBass = isDownbeat; // Quarter notes
            
            if (playBass && Math.random() < p.prob.bass) {
                // Root note or simple alternation
                const freq = this.music.scale[0] / 2; // Octave down
                const decay = int > 0.8 ? 0.15 : 0.3;
                this.synthBass(freq, time, decay, int);
            }
        }

        // --- 3. DRUMS (The Pulse) ---
        if (p.prob.perc > 0) {
            // Kick: Beat 1 & 3 usually, or 4-on-the-floor
            const kickPattern = (int > 0.6) ? [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0] : [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0];
            if (kickPattern[tick]) this.synthKick(time, int);

            // Snare: Beat 2 & 4
            if (tick % 16 === 4 || tick % 16 === 12) {
                 if (int > 0.3) this.synthSnare(time, int);
            }

            // Hats: 16ths
            if (int > 0.4) {
                 if (tick % 2 === 0 || int > 0.8) { // 8ths or 16ths
                     const vol = (tick % 4 === 0) ? 0.3 : 0.1;
                     this.synthHat(time, vol);
                 }
            }
        }

        // --- 4. LEAD (The Melody) ---
        if (p.prob.lead > 0 && int > 0.2) {
            // Generative Melody: Higher chance on strong beats, but allow syncopation
            const density = p.prob.lead * int;
            if (Math.random() < density) {
                const note = this.pickNote(1); // High octave
                const dur = 0.1 + Math.random() * 0.2;
                this.synthLead(note, time, dur, p.padType);
            }
        }
    },

    // --- SYNTH INSTRUMENTS ---

    synthPad: function(freq, time, duration, type) {
        // Lush, detuned sawtooths with slow attack
        const osc1 = this.audioCtx.createOscillator();
        const osc2 = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        const filter = this.audioCtx.createBiquadFilter();

        osc1.type = 'sawtooth';
        osc2.type = 'sawtooth';
        
        osc1.frequency.value = freq;
        osc2.frequency.value = freq * 1.01; // Detune
        
        filter.type = 'lowpass';
        filter.frequency.value = 400; 
        
        // Envelope
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.15, time + duration/2); // Slow Attack
        gain.gain.linearRampToValueAtTime(0, time + duration); // Slow Release
        
        // Filter movement
        filter.frequency.setValueAtTime(300, time);
        filter.frequency.linearRampToValueAtTime(800, time + duration);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain); // Stereo Panner could go here

        osc1.start(time);
        osc2.start(time);
        osc1.stop(time + duration);
        osc2.stop(time + duration);
    },

    synthBass: function(freq, time, duration, int) {
        // Punchy Square/Saw
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        const filter = this.audioCtx.createBiquadFilter();

        osc.type = (int > 0.7) ? 'sawtooth' : 'square';
        osc.frequency.value = freq;
        
        filter.type = 'lowpass';
        filter.Q.value = 5;

        // Filter Envelope (The "Pluck" sound)
        filter.frequency.setValueAtTime(2000, time);
        filter.frequency.exponentialRampToValueAtTime(100, time + duration);

        // Amp Envelope
        gain.gain.setValueAtTime(0.4, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + duration);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc.start(time);
        osc.stop(time + duration);
    },

    synthLead: function(freq, time, duration, vibe) {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        const delay = this.audioCtx.createDelay();
        const feedback = this.audioCtx.createGain();

        osc.type = (vibe === 'retro') ? 'square' : 'triangle';
        osc.frequency.setValueAtTime(freq, time);
        
        // Slide/Portamento effect for leads
        // osc.frequency.linearRampToValueAtTime(freq, time + 0.05);

        // Simple Delay Line
        delay.delayTime.value = 0.3; // ~300ms
        feedback.gain.value = 0.3;
        
        gain.gain.setValueAtTime(0.2, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + duration);

        osc.connect(gain);
        gain.connect(this.masterGain);
        
        // Connect Delay
        gain.connect(delay);
        delay.connect(feedback);
        feedback.connect(delay);
        delay.connect(this.masterGain);

        osc.start(time);
        osc.stop(time + duration);
    },

    // --- DRUM SYNTHESIS ---

    synthKick: function(time, int) {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        
        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5); // Pitch Drop
        
        gain.gain.setValueAtTime(0.8, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);

        osc.connect(gain);
        gain.connect(this.masterGain);
        
        osc.start(time);
        osc.stop(time + 0.5);
    },

    synthSnare: function(time, int) {
        // Noise Burst
        const bufferSize = this.audioCtx.sampleRate * 0.2; // 200ms
        const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.audioCtx.createBufferSource();
        noise.buffer = buffer;
        
        const filter = this.audioCtx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 1000;
        
        const gain = this.audioCtx.createGain();
        gain.gain.setValueAtTime(0.5, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        
        noise.start(time);
    },

    synthHat: function(time, vol) {
        // High frequency metal noise
        // Simplified: High frequency square wave array or just filtered noise
        // Let's use 6 oscillators at random high freqs for metallic sound
        const gain = this.audioCtx.createGain();
        gain.gain.setValueAtTime(vol, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);
        gain.connect(this.masterGain);

        for(let i=0; i<4; i++) {
            const osc = this.audioCtx.createOscillator();
            osc.type = 'square';
            osc.frequency.value = 8000 + Math.random()*4000;
            osc.connect(gain);
            osc.start(time);
            osc.stop(time + 0.05);
        }
    },

    // --- SFX (Simple pass-throughs or functional sounds) ---
    playTheme: function(themeName) {
        // Legacy support wrapper
        // The main loop handles this now via updateMusicState, but specific events can force a switch
        // this.switchProfile(themeName); 
    },
    
    // SFX Methods
    playTone: function(freq, type, dur, vol=0.1) {
        if (!this.enabled) return;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
        gain.gain.setValueAtTime(vol, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + dur);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start();
        osc.stop(this.audioCtx.currentTime + dur);
    },

    playPickup: function() { this.playTone(1200, 'sine', 0.1, 0.3); },
    playShoot: function() { 
        // Noise burst for shoot
        if(!this.enabled) return;
        const t = this.audioCtx.currentTime;
        this.synthSnare(t, 1.0); 
    },
    playHit: function() { this.playTone(100, 'sawtooth', 0.2, 0.5); },
    playDamage: function() { this.playTone(80, 'square', 0.3, 0.6); },
    playUI: function() { this.playTone(2000, 'sine', 0.05, 0.1); }
};
