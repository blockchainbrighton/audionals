// js/soundManager.js

export const soundManager = {
    audioCtx: null,
    masterGain: null,
    musicBus: null,
    musicFilter: null,
    musicPanner: null,
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
        chordChangeCounter: 0,
        
        // Spatial
        filterFreq: 20000,
        targetFilterFreq: 20000
    },

    // --- Building Sources ---
    sources: {
        safehouse: { x: 5 * 32, y: 6 * 32, radius: 400, profile: 'SAFEHOUSE' },
        bar: { x: 20 * 32, y: 20 * 32, radius: 400, profile: 'BAR' },
        shop: { x: 40 * 32, y: 6 * 32, radius: 400, profile: 'SHOP' },
        casino: { x: 25 * 32, y: 30 * 32, radius: 400, profile: 'CASINO' },
        armoury: { x: 30 * 32, y: 10 * 32, radius: 400, profile: 'ARMOURY' }
    },

    // --- Profiles (The "Vibes") ---
    profiles: {
        SAFEHOUSE: {
            tempo: 85,
            scaleType: 'major',
            root: 65, // C (Happy/Bright)
            prob: { pad: 1.0, bass: 0.2, lead: 0.4, perc: 0.1 },
            padType: 'bright',
            description: "Neon sunset relaxation"
        },
        EXPLORATION: {
            tempo: 105,
            scaleType: 'mixolydian',
            root: 58, // Bb (Cool/Driving)
            prob: { pad: 0.5, bass: 0.8, lead: 0.4, perc: 0.6 },
            padType: 'retro',
            description: "City lights cruising"
        },
        SHOP: {
            tempo: 120,
            scaleType: 'major',
            root: 73, // D (Energetic)
            prob: { pad: 0.3, bass: 0.6, lead: 0.1, perc: 0.8 },
            padType: 'thin',
            description: "Digital commerce"
        },
        BAR: {
            tempo: 95,
            scaleType: 'mixolydian',
            root: 52, // Ab
            prob: { pad: 0.6, bass: 0.8, lead: 0.5, perc: 0.5 },
            padType: 'lush',
            description: "Smooth synth jazz"
        },
        CASINO: {
            tempo: 145,
            scaleType: 'major',
            root: 60, // C
            prob: { pad: 0.2, bass: 0.8, lead: 0.8, perc: 0.9 },
            padType: 'thin',
            description: "High stakes winning"
        },
        ARMOURY: {
            tempo: 100,
            scaleType: 'dorian', // Less depressing than minor
            root: 43, // F (Punchy)
            prob: { pad: 0.2, bass: 1.0, lead: 0.3, perc: 0.7 },
            padType: 'dark',
            description: "Tactical preparations"
        },
        COMBAT: {
            tempo: 140,
            scaleType: 'mixolydian',
            root: 41, // E
            prob: { pad: 0.1, bass: 1.0, lead: 0.8, perc: 1.0 }, // Heroic Action
            padType: 'retro',
            description: "Heroic showdown"
        },
        WALKMAN: {
            tempo: 128,
            scaleType: 'major',
            root: 62, // D (Anthemic)
            prob: { pad: 0.4, bass: 1.0, lead: 0.6, perc: 1.0 },
            padType: 'bright',
            description: "Main Character Energy"
        }
    },

    // --- Initialization ---
    init: function(gameInstance) {
        this.game = gameInstance;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioCtx = new AudioContext();
            
            // 1. Master Chain
            this.masterGain = this.audioCtx.createGain();
            this.masterGain.gain.value = 0.4;
            
            this.compressor = this.audioCtx.createDynamicsCompressor();
            this.compressor.threshold.setValueAtTime(-20, this.audioCtx.currentTime);
            this.compressor.ratio.setValueAtTime(12, this.audioCtx.currentTime);
            
            this.masterGain.connect(this.compressor);
            this.compressor.connect(this.audioCtx.destination);
            
            // 2. Music Bus (Synthesizers -> Filter -> Panner -> Master)
            this.musicBus = this.audioCtx.createGain();
            this.musicFilter = this.audioCtx.createBiquadFilter();
            this.musicFilter.type = 'lowpass';
            this.musicFilter.frequency.value = 20000; // Start open
            this.musicFilter.Q.value = 1;

            this.musicPanner = this.audioCtx.createStereoPanner(); // New Panner

            this.musicBus.connect(this.musicFilter);
            this.musicFilter.connect(this.musicPanner); // Filter -> Panner
            this.musicPanner.connect(this.masterGain);  // Panner -> Master

            this.initialized = true;
            this.enabled = true; 
            console.log("[Audio] Generative Synthwave Engine Initialized.");
        } catch (e) {
            console.warn("[Audio] Web Audio API not supported.", e);
            this.enabled = false;
        }
        
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

        let targetProfileKey = 'EXPLORATION';
        let targetInt = 0.3;
        let targetFilter = 20000; // Open by default
        let targetVolume = 0.5;   // Default Volume
        let targetPan = 0;        // Default Center

        const mapId = this.game.mapManager.currentMapId;
        
        if (player.hasWalkmanActive) {
            targetProfileKey = 'WALKMAN';
            targetFilter = 20000; // Walkman is always crisp
            targetVolume = 0.8;   // Walkman is loud and clear
            targetPan = 0;        // Headphones are centered
            
            if (enemiesActive) {
                targetInt = 1.0; 
            } else if (Math.abs(player.vx) > 0.1 || Math.abs(player.vy) > 0.1) {
                targetInt = 0.7; 
            } else {
                targetInt = 0.4; 
            }
        } else {
            // --- Environmental & Spatial Logic ---
            
            // Are we INSIDE a specific location?
            if (mapId.includes('safehouse')) {
                targetProfileKey = 'SAFEHOUSE';
                targetFilter = 20000; // Inside = Clear
                targetInt = 0.0;
                targetVolume = 0.6;
                targetPan = 0;
            } else if (this.game.gameState === 'SHOP_MENU') {
                targetFilter = 20000;
                targetVolume = 0.5;
                targetPan = 0;
                if (this.game.currentShopId && this.game.currentShopId.includes('armoury')) {
                    targetProfileKey = 'ARMOURY';
                    targetInt = 0.6;
                } else {
                    targetProfileKey = 'SHOP';
                    targetInt = 0.5;
                }
            } else if (this.game.gameState === 'INTERACTION_MODE') {
                targetProfileKey = 'BAR'; 
                targetFilter = 20000;
                targetInt = 0.4;
                targetVolume = 0.6;
                targetPan = 0;
            } else if (this.game.gameState === 'MINIGAME') {
                targetProfileKey = 'CASINO';
                targetFilter = 20000;
                targetInt = 0.8;
                targetVolume = 0.6;
                targetPan = 0;
            } else if (enemiesActive) {
                // ...
            } 
            
            // Overworld / Spatial Check
            if (targetProfileKey === 'EXPLORATION' && !mapId.includes('safehouse') && this.game.gameState === 'PLAYING') {
                let nearestSource = null;
                let minDist = 99999;
                
                const pX = player.x + player.width/2;
                const pY = player.y + player.height/2;

                for (const key in this.sources) {
                    const src = this.sources[key];
                    const dist = this.game.utils.distance(pX, pY, src.x, src.y);
                    if (dist < src.radius && dist < minDist) {
                        minDist = dist;
                        nearestSource = src;
                    }
                }

                if (nearestSource) {
                    // We are outside but near a building
                    targetProfileKey = nearestSource.profile;
                    targetInt = 0.3; 
                    targetFilter = 300; // Even more muffled when outside
                    
                    // Spatial Volume Falloff
                    const volPct = Math.max(0, 1 - (minDist / nearestSource.radius));
                    targetVolume = volPct * 0.6;

                    // Spatial Panning
                    const panRaw = (nearestSource.x - pX) / 300; // 300px range for full pan
                    targetPan = Math.max(-1, Math.min(1, panRaw)); // Clamp -1 to 1
                    
                } else {
                    // Deep wilderness / City streets -> Silence
                    targetProfileKey = 'EXPLORATION'; // Or 'SILENCE'
                    targetVolume = 0.0; // Fades to silence
                    targetPan = 0;
                }
            }
        }

        // Apply State
        if (targetProfileKey !== this.music.activeProfile && targetVolume > 0.01) {
            this.switchProfile(targetProfileKey);
        }

        // Smooth Transitions
        const lerp = (start, end, amt) => (1 - amt) * start + amt * end;
        
        this.music.intensity = lerp(this.music.intensity, targetInt, 0.05);
        
        // Volume Lerp
        if (this.musicBus) {
             const curVol = this.musicBus.gain.value;
             this.musicBus.gain.value = lerp(curVol, targetVolume, 0.1);
        }

        // Filter Lerp
        if (this.musicFilter) {
            const currentF = this.musicFilter.frequency.value;
            // Apply filter changes more abruptly (0.5 for quicker transition)
            const newF = lerp(currentF, targetFilter, 0.5); 
            this.musicFilter.frequency.value = newF;
        }

        // Pan Lerp
        if (this.musicPanner) {
            const curPan = this.musicPanner.pan.value;
            this.musicPanner.pan.value = lerp(curPan, targetPan, 0.1);
        }
        
        if (targetProfileKey === 'WALKMAN') {
            const baseTempo = 110;
            const newTempo = baseTempo + (this.music.intensity * 40); 
            this.music.tempo = lerp(this.music.tempo, newTempo, 0.05);
        }
    },

    switchProfile: function(key) {
        console.log(`[Audio] Switching Profile: ${key}`);
        const p = this.profiles[key];
        this.music.activeProfile = key;
        
        if (key !== 'WALKMAN') {
            this.music.tempo = p.tempo;
        }
        
        this.music.rootFreq = p.root;
        this.generateScale(p.scaleType, p.root);
        this.music.chordChangeCounter = 0;
    },

    // --- Music Theory Helper ---
    generateScale: function(type, root) {
        const intervals = {
            'minor': [0, 2, 3, 5, 7, 8, 10],
            'major': [0, 2, 4, 5, 7, 9, 11],
            'dorian': [0, 2, 3, 5, 7, 9, 10],
            'mixolydian': [0, 2, 4, 5, 7, 9, 10], // 80s Cool
            'pentatonic': [0, 3, 5, 7, 10]
        }[type] || [0, 2, 3, 5, 7, 8, 10];

        const getFreq = (semitones) => root * Math.pow(2, semitones / 12);
        
        this.music.scale = [];
        for (let oct = 0; oct < 3; oct++) {
            intervals.forEach(i => {
                this.music.scale.push(getFreq(i + (oct * 12)));
            });
        }
    },

    pickNote: function(octaveOffset = 0) {
        const s = this.music.scale;
        if (!s.length) return 220;
        let start = 0;
        let end = s.length - 1;
        if (octaveOffset < 0) { end = Math.floor(s.length / 2); } 
        else if (octaveOffset > 0) { start = Math.floor(s.length / 2); } 
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
        const int = this.music.intensity; 

        if (tick === 0 && this.music.chordChangeCounter++ > 3) {
            this.music.chordChangeCounter = 0;
        }

        // 1. PADS 
        if (tick === 0 && Math.random() < p.prob.pad) {
            const root = this.music.scale[0];
            const third = this.music.scale[2];
            const fifth = this.music.scale[4];
            const seventh = this.music.scale[6];
            
            const chord = [root, fifth, Math.random()>0.5?third:seventh]; 
            
            chord.forEach((freq, i) => {
                this.synthPad(freq, time + (i*0.05), 4.0, p.padType);
            });
        }

        // 2. BASS 
        if (p.prob.bass > 0) {
            const isDownbeat = (tick % 4 === 0);
            const isOffbeat = (tick % 4 === 2);
            
            let playBass = false;
            if (int > 0.8) playBass = true; 
            else if (int > 0.5) playBass = isDownbeat || isOffbeat;
            else playBass = isDownbeat;
            
            if (playBass && Math.random() < p.prob.bass) {
                const freq = this.music.scale[0] / 2; 
                const decay = int > 0.8 ? 0.15 : 0.3;
                this.synthBass(freq, time, decay, int);
            }
        }

        // 3. DRUMS 
        if (p.prob.perc > 0) {
            const kickPattern = (int > 0.6) ? [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0] : [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0];
            if (kickPattern[tick]) this.synthKick(time, int);

            if (tick % 16 === 4 || tick % 16 === 12) {
                 if (int > 0.3) this.synthSnare(time, int);
            }

            if (int > 0.4) {
                 if (tick % 2 === 0 || int > 0.8) { 
                     const vol = (tick % 4 === 0) ? 0.3 : 0.1;
                     this.synthHat(time, vol);
                 }
            }
        }

        // 4. LEAD
        if (p.prob.lead > 0 && int > 0.2) {
            const density = p.prob.lead * int;
            if (Math.random() < density) {
                const note = this.pickNote(1); 
                const dur = 0.1 + Math.random() * 0.2;
                this.synthLead(note, time, dur, p.padType);
            }
        }
    },

    // --- SYNTH INSTRUMENTS (Now Routing to musicBus) ---

    synthPad: function(freq, time, duration, type) {
        if(!this.musicBus) return;
        const osc1 = this.audioCtx.createOscillator();
        const osc2 = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        const filter = this.audioCtx.createBiquadFilter();

        osc1.type = 'sawtooth';
        osc2.type = 'sawtooth';
        
        osc1.frequency.value = freq;
        osc2.frequency.value = freq * 1.01; 
        
        filter.type = 'lowpass';
        filter.frequency.value = (type === 'bright') ? 1200 : 600; 
        
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.15, time + duration/2); 
        gain.gain.linearRampToValueAtTime(0, time + duration); 
        
        filter.frequency.setValueAtTime((type === 'bright') ? 800 : 400, time);
        filter.frequency.linearRampToValueAtTime((type === 'bright') ? 2000 : 1000, time + duration);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicBus); // CONNECT TO MUSIC BUS

        osc1.start(time);
        osc2.start(time);
        osc1.stop(time + duration);
        osc2.stop(time + duration);
    },

    synthBass: function(freq, time, duration, int) {
        if(!this.musicBus) return;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        const filter = this.audioCtx.createBiquadFilter();

        osc.type = (int > 0.7) ? 'sawtooth' : 'square';
        osc.frequency.value = freq;
        
        filter.type = 'lowpass';
        filter.Q.value = 5;

        filter.frequency.setValueAtTime(2000, time);
        filter.frequency.exponentialRampToValueAtTime(100, time + duration);

        gain.gain.setValueAtTime(0.4, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + duration);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicBus); // CONNECT TO MUSIC BUS

        osc.start(time);
        osc.stop(time + duration);
    },

    synthLead: function(freq, time, duration, vibe) {
        if(!this.musicBus) return;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        const delay = this.audioCtx.createDelay();
        const feedback = this.audioCtx.createGain();

        osc.type = (vibe === 'retro') ? 'square' : 'triangle';
        osc.frequency.setValueAtTime(freq, time);
        
        delay.delayTime.value = 0.3; 
        feedback.gain.value = 0.3;
        
        gain.gain.setValueAtTime(0.2, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + duration);

        osc.connect(gain);
        gain.connect(this.musicBus); // Connect Dry signal to Music Bus
        
        gain.connect(delay);
        delay.connect(feedback);
        feedback.connect(delay);
        delay.connect(this.musicBus); // Connect Wet signal to Music Bus

        osc.start(time);
        osc.stop(time + duration);
    },

    synthKick: function(time, int) {
        if(!this.musicBus) return;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        
        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5); 
        
        gain.gain.setValueAtTime(0.8, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);

        osc.connect(gain);
        gain.connect(this.musicBus); // CONNECT TO MUSIC BUS
        
        osc.start(time);
        osc.stop(time + 0.5);
    },

    synthSnare: function(time, int) {
        if(!this.musicBus) return;
        const bufferSize = this.audioCtx.sampleRate * 0.2; 
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
        gain.connect(this.musicBus); // CONNECT TO MUSIC BUS
        
        noise.start(time);
    },

    synthHat: function(time, vol) {
        if(!this.musicBus) return;
        const gain = this.audioCtx.createGain();
        gain.gain.setValueAtTime(vol, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);
        gain.connect(this.musicBus); // CONNECT TO MUSIC BUS

        for(let i=0; i<4; i++) {
            const osc = this.audioCtx.createOscillator();
            osc.type = 'square';
            osc.frequency.value = 8000 + Math.random()*4000;
            osc.connect(gain);
            osc.start(time);
            osc.stop(time + 0.05);
        }
    },

    // --- SFX (Direct to Master, bypass Filter) ---
    playTheme: function(themeName) { },
    
    playTone: function(freq, type, dur, vol=0.1) {
        if (!this.enabled) return;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
        gain.gain.setValueAtTime(vol, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + dur);
        osc.connect(gain);
        gain.connect(this.masterGain); // Direct to Master
        osc.start();
        osc.stop(this.audioCtx.currentTime + dur);
    },

    playPickup: function() { this.playTone(1200, 'sine', 0.1, 0.3); },
    playShoot: function() { 
        if(!this.enabled) return;
        // Re-implement simplified burst for SFX to avoid using synthSnare which routes to musicBus
        const t = this.audioCtx.currentTime;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.frequency.setValueAtTime(100, t);
        osc.frequency.exponentialRampToValueAtTime(0.01, t+0.1);
        gain.gain.setValueAtTime(0.5, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t+0.1);
        osc.connect(gain);
        gain.connect(this.masterGain); // Direct to Master
        osc.start(t);
        osc.stop(t+0.1);
    },
    playHit: function() { this.playTone(100, 'sawtooth', 0.2, 0.5); },
    playDamage: function() { this.playTone(80, 'square', 0.3, 0.6); },
    playUI: function() { this.playTone(2000, 'sine', 0.05, 0.1); }
};