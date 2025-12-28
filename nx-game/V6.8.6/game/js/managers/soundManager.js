// js/soundManager.js

// --- 80s SYNTHWAVE ENGINE ---
// A complete "Band in a Box" featuring FM Synthesis, Virtual Analog, and retro Drum Machines.

const FX = {
    createReverb: function(ctx, duration = 2.0, decay = 2.0) {
        const convolver = ctx.createConvolver();
        const rate = ctx.sampleRate;
        const length = rate * duration;
        const impulse = ctx.createBuffer(2, length, rate);
        const left = impulse.getChannelData(0);
        const right = impulse.getChannelData(1);

        for (let i = 0; i < length; i++) {
            // Exponential decay noise
            const n = i / length;
            const env = Math.pow(1 - n, decay);
            left[i] = (Math.random() * 2 - 1) * env;
            right[i] = (Math.random() * 2 - 1) * env;
        }
        
        convolver.buffer = impulse;
        return convolver;
    },

    createStereoDelay: function(ctx, time = 0.3, feedback = 0.4) {
        const input = ctx.createGain();
        const output = ctx.createGain();
        const delayL = ctx.createDelay();
        const delayR = ctx.createDelay();
        const feedL = ctx.createGain();
        const feedR = ctx.createGain();
        const merger = ctx.createChannelMerger(2);

        delayL.delayTime.value = time;
        delayR.delayTime.value = time + 0.1; // Offset for stereo width
        feedL.gain.value = feedback;
        feedR.gain.value = feedback;

        // Routing: Input -> Delay -> Output
        input.connect(delayL);
        input.connect(delayR);

        // Feedback Loops
        delayL.connect(feedL);
        feedL.connect(delayL);
        
        delayR.connect(feedR);
        feedR.connect(delayR);

        // Merger
        delayL.connect(merger, 0, 0);
        delayR.connect(merger, 0, 1);
        
        merger.connect(output);
        return { input, output }; // Return nodes to connect
    },

    createChorus: function(ctx, dest) {
        // Juno-60 style Stereo Chorus
        const splitter = ctx.createChannelSplitter(2);
        const merger = ctx.createChannelMerger(2);
        const input = ctx.createGain();
        
        // Left Channel
        const delayL = ctx.createDelay();
        const lfoL = ctx.createOscillator();
        const gainL = ctx.createGain();
        const depthL = ctx.createGain();
        
        // Right Channel
        const delayR = ctx.createDelay();
        const lfoR = ctx.createOscillator();
        const gainR = ctx.createGain();
        const depthR = ctx.createGain();

        delayL.delayTime.value = 0.02; // 20ms
        delayR.delayTime.value = 0.025; // 25ms

        depthL.gain.value = 0.002; // Mod depth
        depthR.gain.value = 0.0025;

        lfoL.type = 'sine';
        lfoL.frequency.value = 0.5; // Slow rate
        lfoR.type = 'triangle';
        lfoR.frequency.value = 0.7;

        // Routing
        input.connect(splitter);
        
        // L
        lfoL.connect(depthL);
        depthL.connect(delayL.delayTime);
        input.connect(delayL);
        delayL.connect(gainL);
        gainL.connect(merger, 0, 0); // Out L
        lfoL.start();

        // R
        lfoR.connect(depthR);
        depthR.connect(delayR.delayTime);
        input.connect(delayR);
        delayR.connect(gainR);
        gainR.connect(merger, 0, 1); // Out R
        lfoR.start();

        // Dry signal mix
        input.connect(merger); 
        merger.connect(dest);

        return input;
    },

    createPingPongDelay: function(ctx, dest, time = 0.3, feedback = 0.4) {
        const input = ctx.createGain();
        const delayL = ctx.createDelay();
        const delayR = ctx.createDelay();
        const feedL = ctx.createGain();
        const feedR = ctx.createGain();
        const merger = ctx.createChannelMerger(2);

        delayL.delayTime.value = time;
        delayR.delayTime.value = time;
        feedL.gain.value = feedback;
        feedR.gain.value = feedback;

        // Cross feedback
        input.connect(delayL);
        delayL.connect(feedL);
        feedL.connect(delayR);
        
        delayR.connect(feedR);
        feedR.connect(delayL);

        // Output
        delayL.connect(merger, 0, 0);
        delayR.connect(merger, 0, 1);
        
        input.connect(merger); // Dry
        merger.connect(dest);
        
        return input;
    }
};

const INSTRUMENTS = {
    // -- DRUMS --
    playArp: function(ctx, dest, freq, time) {
        // Plucky Square Wave for rapid sequences
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, time);

        filter.type = 'lowpass';
        filter.Q.value = 5;
        filter.frequency.setValueAtTime(freq * 4, time);
        filter.frequency.exponentialRampToValueAtTime(freq, time + 0.1); // Quick filter pluck

        gain.gain.setValueAtTime(0.15, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.15); // Short decay

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(dest);

        osc.start(time);
        osc.stop(time + 0.15);
    },

    playPWMStrings: function(ctx, dest, freq, time, duration) {
        // Simulated Solina Strings using detuned saws + Bandpass
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc1.type = 'sawtooth';
        osc2.type = 'sawtooth';
        osc1.frequency.setValueAtTime(freq, time);
        osc2.frequency.setValueAtTime(freq * 1.01, time); // Detune

        filter.type = 'highpass'; // Thin out the lows for that stringy sound
        filter.frequency.value = 500;

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.1, time + duration * 0.2); // Slow attack
        gain.gain.linearRampToValueAtTime(0, time + duration);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(dest);

        osc1.start(time); osc2.start(time);
        osc1.stop(time + duration); osc2.stop(time + duration);
    },

    playKick: function(ctx, dest, time, type = '808') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const clickOsc = ctx.createOscillator();
        const clickGain = ctx.createGain();

        // Main Body
        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
        gain.gain.setValueAtTime(1.0, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);

        // Click (Attack)
        clickOsc.type = 'square';
        clickOsc.frequency.setValueAtTime(300, time);
        clickOsc.frequency.exponentialRampToValueAtTime(50, time + 0.02);
        clickGain.gain.setValueAtTime(0.5, time);
        clickGain.gain.exponentialRampToValueAtTime(0.01, time + 0.02);

        osc.connect(gain);
        clickOsc.connect(clickGain);
        gain.connect(dest);
        clickGain.connect(dest);

        osc.start(time); clickOsc.start(time);
        osc.stop(time + 0.5); clickOsc.stop(time + 0.5);
    },

    playGatedSnare: function(ctx, dest, time) {
        // The Sound of the 80s: Noise + Reverb + Hard Gate
        
        // 1. Tonal Core
        const tone = ctx.createOscillator();
        const toneGain = ctx.createGain();
        tone.type = 'triangle';
        tone.frequency.setValueAtTime(200, time);
        tone.frequency.linearRampToValueAtTime(100, time + 0.1);
        toneGain.gain.setValueAtTime(0.5, time);
        toneGain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);

        // 2. Noise Burst
        const bufferSize = ctx.sampleRate * 0.3; // 300ms
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for(let i=0; i<bufferSize; i++) data[i] = (Math.random()*2-1);
        
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.value = 3000;
        
        const noiseGain = ctx.createGain();
        // GATED ENVELOPE: Flat then cut
        noiseGain.gain.setValueAtTime(0.8, time);
        noiseGain.gain.setValueAtTime(0.8, time + 0.15); // Hold
        noiseGain.gain.linearRampToValueAtTime(0, time + 0.16); // Hard Cut

        tone.connect(toneGain);
        toneGain.connect(dest);
        
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(dest);

        tone.start(time); tone.stop(time+0.2);
        noise.start(time);
    },

    playHat: function(ctx, dest, time, open=false) {
        // Metallic FM Noise
        const fundamental = 400;
        const ratios = [2, 3, 4.16, 5.43, 6.79, 8.21];
        const gain = ctx.createGain();
        
        // Bandpass for metallic sizzle
        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 7000;

        gain.gain.setValueAtTime(0.3, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + (open ? 0.3 : 0.05));

        ratios.forEach(r => {
            const osc = ctx.createOscillator();
            osc.type = 'square';
            osc.frequency.value = fundamental * r;
            osc.connect(filter);
            osc.start(time);
            osc.stop(time + (open ? 0.3 : 0.05));
        });

        filter.connect(gain);
        gain.connect(dest);
    },

    // -- SYNTHS --
    playFMBass: function(ctx, dest, freq, time, duration) {
        // Classic DX7 "Lately Bass" style 
        // Carrier (Triangle) <- Modulator (Sine)
        const carrier = ctx.createOscillator();
        const modulator = ctx.createOscillator();
        const modGain = ctx.createGain(); // Modulation Index
        const outGain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        carrier.type = 'sawtooth'; // Modified for grittier bass
        carrier.frequency.setValueAtTime(freq, time);

        modulator.type = 'sine';
        modulator.frequency.setValueAtTime(freq * 2.0, time); // 2:1 Ratio

        // Mod Envelope (Pluck)
        modGain.gain.setValueAtTime(freq * 3, time); // Intensity
        modGain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);

        // Filter Envelope
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(3000, time);
        filter.frequency.exponentialRampToValueAtTime(100, time + 0.3);
        filter.Q.value = 5;

        // Amp Envelope
        outGain.gain.setValueAtTime(0.6, time);
        outGain.gain.exponentialRampToValueAtTime(0.01, time + duration);

        modulator.connect(modGain);
        modGain.connect(carrier.frequency); // FM Routing
        carrier.connect(filter);
        filter.connect(outGain);
        outGain.connect(dest);

        carrier.start(time); modulator.start(time);
        carrier.stop(time + duration); modulator.stop(time + duration);
    },

    playJunoPad: function(ctx, dest, freq, time, duration, isPop=false) {
        // Sawtooth + PWM + Filter
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator(); // Detuned
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc1.type = isPop ? 'square' : 'sawtooth';
        osc2.type = 'sawtooth';
        
        osc1.frequency.setValueAtTime(freq, time);
        osc2.frequency.setValueAtTime(freq * 1.005, time); // Detune chorus effect

        filter.type = 'lowpass';
        
        // Envelope
        gain.gain.setValueAtTime(0, time);
        
        if (isPop) {
            // "Stab" envelope
            filter.frequency.setValueAtTime(2000, time);
            filter.frequency.exponentialRampToValueAtTime(500, time + 0.5);
            gain.gain.linearRampToValueAtTime(0.3, time + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, time + 0.4);
        } else {
            // "Lush" envelope
            filter.frequency.setValueAtTime(400, time);
            filter.frequency.linearRampToValueAtTime(800, time + duration);
            gain.gain.linearRampToValueAtTime(0.2, time + duration/2);
            gain.gain.linearRampToValueAtTime(0, time + duration);
        }

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(dest);

        osc1.start(time); osc2.start(time);
        osc1.stop(time + duration); osc2.stop(time + duration);
    },

    playSyncLead: function(ctx, dest, freq, time, duration) {
        // Hard Sync Sound (Simulated with Saw + Envelope Sweep)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        const delay = ctx.createDelay();
        const feedback = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, time);
        
        filter.type = 'lowpass';
        filter.Q.value = 10; // Resonant "Wah"
        filter.frequency.setValueAtTime(freq * 2, time);
        filter.frequency.exponentialRampToValueAtTime(freq * 5, time + 0.1);
        filter.frequency.exponentialRampToValueAtTime(freq, time + duration);

        gain.gain.setValueAtTime(0.2, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + duration);

        // Delay effect
        delay.delayTime.value = 0.25;
        feedback.gain.value = 0.3;

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(dest);
        
        gain.connect(delay);
        delay.connect(feedback);
        feedback.connect(delay);
        delay.connect(dest);

        osc.start(time);
        osc.stop(time + duration);
    },

    playSwish: function(ctx, dest, time) {
        const bufferSize = ctx.sampleRate * 0.1;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for(let i=0; i<bufferSize; i++) data[i] = (Math.random()*2-1);
        
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(800, time);
        filter.frequency.linearRampToValueAtTime(200, time + 0.1);
        
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.1, time);
        gain.gain.linearRampToValueAtTime(0, time + 0.1);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(dest);

        noise.start(time);
    }
};

export const soundManager = {
    audioCtx: null,
    masterGain: null,
    musicBus: null,
    musicFilter: null,
    musicPanner: null,
    musicReverb: null, // New Reverb Node
    walkmanBus: null,
    walkmanChorus: null,
    walkmanDelay: null, // New Delay Node
    compressor: null,
    game: null,
    enabled: false,
    initialized: false,

    // --- Patterns (Sequencer) ---
    patterns: {
        'GOONIES': {
            kick: [1,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,1,0],
            snare:[0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
            hat:  [1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1],
            bass: [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0] // Driving 8ths
        },
        'CHILL': {
            kick: [1,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
            snare:[0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // Rimshot usually
            hat:  [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0],
            bass: [1,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0] // Long notes
        }
    },

    music: {
        isPlaying: false,
        tempo: 110,
        current16th: 0,
        nextNoteTime: 0,
        lookahead: 25.0,
        scheduleAheadTime: 0.1,
        timerID: null,
        activeProfile: 'SILENCE', 
        intensity: 0, 
        rootFreq: 55,
        scale: [],
        chordChangeCounter: 0,
        
        // Spatial
        filterFreq: 20000,
        targetFilterFreq: 20000
    },
    
    walkmanUserVolume: 0.8, // User setting
    walkmanPaused: false,   // Pause state
    wasInside: true,

    poiAudioProfiles: {
        'xlounge_stash': 'SAFEHOUSE',
        'safehouse': 'SAFEHOUSE',
        'exchange_node': 'SHOP',
        'exchange': 'SHOP',
        'bar': 'BAR',
        'armoury': 'ARMOURY',
        'casino': 'CASINO',
        'xemist_contact': null
    },

    profiles: {
        SAFEHOUSE: { tempo: 85, scaleType: 'major', root: 65, padType: 'lush', pattern: 'CHILL' },
        EXPLORATION: { tempo: 105, scaleType: 'mixolydian', root: 58, padType: 'retro', pattern: 'CHILL' },
        SHOP: { tempo: 120, scaleType: 'major', root: 73, padType: 'thin', pattern: 'CHILL' },
        BAR: { tempo: 95, scaleType: 'dorian', root: 52, padType: 'lush', pattern: 'GOONIES' }, // Updated pattern for vibe
        CASINO: { tempo: 145, scaleType: 'major', root: 60, padType: 'pop', pattern: 'GOONIES' }, // Pop pad for casino
        ARMOURY: { tempo: 100, scaleType: 'dorian', root: 43, padType: 'dark', pattern: 'CHILL' },
        COMBAT: { tempo: 140, scaleType: 'mixolydian', root: 41, padType: 'retro', pattern: 'GOONIES' },
        WALKMAN: { tempo: 116, scaleType: 'major', root: 55, padType: 'pop', pattern: 'GOONIES' }
    },

    init: function(gameInstance) {
        this.game = gameInstance;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioCtx = new AudioContext();
            
            // Master Chain
            this.masterGain = this.audioCtx.createGain();
            this.masterGain.gain.value = 0.4;
            
            this.compressor = this.audioCtx.createDynamicsCompressor();
            this.compressor.threshold.value = -20;
            this.compressor.ratio.value = 12;
            
            this.masterGain.connect(this.compressor);
            this.compressor.connect(this.audioCtx.destination);
            
            // 1. Music Bus (Env) -> Filter -> Panner -> Reverb -> Master
            this.musicBus = this.audioCtx.createGain();
            this.musicFilter = this.audioCtx.createBiquadFilter();
            this.musicFilter.type = 'lowpass';
            this.musicFilter.frequency.value = 20000; 
            this.musicPanner = this.audioCtx.createStereoPanner();
            
            // Reverb Setup (Send Effect style, but inline for simplicity here)
            this.musicReverb = FX.createReverb(this.audioCtx, 3.0, 3.0); // Large Hall
            const reverbGain = this.audioCtx.createGain();
            reverbGain.gain.value = 0.3; // 30% Wet

            this.musicBus.connect(this.musicFilter);
            this.musicFilter.connect(this.musicPanner);
            
            this.musicPanner.connect(this.masterGain); // Dry
            this.musicPanner.connect(this.musicReverb); // Wet Send
            this.musicReverb.connect(reverbGain);
            reverbGain.connect(this.masterGain);

            // 2. Walkman Bus -> FX Chain (Chorus + Delay) -> Master
            this.walkmanBus = this.audioCtx.createGain();
            this.walkmanBus.gain.value = 0;
            
            this.walkmanChorus = FX.createChorus(this.audioCtx, this.masterGain);
            const delayFX = FX.createStereoDelay(this.audioCtx, 0.375, 0.4); // Dotted 8th delay
            
            this.walkmanBus.connect(this.walkmanChorus); 
            // Also send to Delay
            this.walkmanBus.connect(delayFX.input);
            delayFX.output.connect(this.masterGain);

            this.initialized = true;
            this.enabled = true; 
            console.log("[Audio] 80s Synth Engine Loaded.");
        } catch (e) {
            console.warn("[Audio] Init failed.", e);
            this.enabled = false;
        }
        
        this.generateScale('minor', 55); 

        // Event Listeners
        if (this.game.events) {
            this.game.events.on('WEAPON_FIRED', (weapon) => this.playAttackSound(weapon));
            this.game.events.on('RELOAD_PERFECT', () => this.playPickup());
            this.game.events.on('PLAYER_HIT', () => this.playHit());
            this.game.events.on('ITEM_PICKUP', () => this.playPickup());
            this.game.events.on('WALKMAN_STATE_CHANGED', () => this.updateMusicState());
        }
    },

    resume: function() {
        if (!this.initialized) return;
        if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
        if (this.enabled && !this.music.isPlaying) {
            this.music.isPlaying = true;
            this.music.nextNoteTime = this.audioCtx.currentTime;
            this.scheduler();
        }
    },

    // --- State & Logic ---
    updateMusicState: function() {
        if (!this.game || !this.game.player) return;
        const player = this.game.player;
        
        // Determine Context
        let profileKey = 'EXPLORATION';
        let targetEnvVol = 0, targetWalkmanVol = 0;
        let targetFilter = 200; // Default to muffled
        let targetPan = 0;
        let targetFilterQ = 0.7;

        const lenp = (a, b, t) => a + (b - a) * t;
        let intensity = 0.3;

        const mapId = this.game.mapManager.currentMapId;
        const enemiesActive = this.game.enemyManager.list.some(e => e.aiState === 'CHASE' || e.aiState === 'ATTACK');

        // 1. WALKMAN OVERRIDE (Highest Priority)
        if (player.hasWalkmanActive && !this.walkmanPaused) {
            profileKey = 'WALKMAN';
            targetWalkmanVol = this.walkmanUserVolume; 
            intensity = enemiesActive ? 1.0 : (Math.abs(player.vx)>0.1 ? 0.7 : 0.4);
            targetFilter = 20000;
        
        // 2. INTERIOR / UI STATES (Snap into focus)
        } else if (this.game.gameState === 'SHOP_MENU') {
            targetEnvVol = 0.8;
            if (this.game.currentShopId && this.game.currentShopId.includes('armoury')) profileKey = 'ARMOURY';
            else profileKey = 'SHOP';
            targetFilter = 20000;
        
        } else if (this.game.gameState === 'MINIGAME') { // Casino
            profileKey = 'CASINO';
            targetEnvVol = 0.8;
            targetFilter = 20000;
        
        } else if (this.game.gameState === 'INTERACTION_MODE') { // Bar
            profileKey = 'BAR';
            targetEnvVol = 0.8;
            targetFilter = 20000;

        } else if (this.game.gameState === 'LOCATION_TRANSITION') {
            targetEnvVol = 0.3;
            targetFilter = 400;
            profileKey = this.music.activeProfile; 

        // 3. INTERIOR MAPS (Walking around inside)
        } else if (mapId.includes('_interior') || mapId.includes('safehouse')) {
            if (mapId.includes('bar')) profileKey = 'BAR';
            else if (mapId.includes('armoury')) profileKey = 'ARMOURY';
            else if (mapId.includes('casino') || mapId.includes('lucky_hash')) profileKey = 'CASINO';
            else if (mapId.includes('exchange') || mapId.includes('xemist_den')) profileKey = 'SHOP';
            else if (mapId.includes('safehouse')) profileKey = 'SAFEHOUSE';
            
            targetEnvVol = 0.8;
            targetFilter = 20000;
        
        // 4. SPATIAL OVERWORLD (Distance Based)
        } else {
            let nearest = null, minDist = 99999;
            const pX = player.x + player.width/2;
            const pY = player.y + player.height/2;
            
            const dynamicSources = this.getDynamicSources();
            dynamicSources.forEach(src => {
                const d = this.game.utils.distance(pX, pY, src.x, src.y);
                if(d < src.radius && d < minDist) { minDist = d; nearest = src; }
            });

            if(nearest) {
                profileKey = nearest.profile;
                const proximity = Math.max(0, 1 - (minDist/(nearest.radius * 0.5)));
                
                // CONSTANT MUFFLE: Filter does NOT change with distance outside.
                // It stays at a fixed "behind the wall" frequency.
                targetFilter = 350; 
                targetFilterQ = 1.5;
                
                // Volume still fades spatially as we walk away.
                targetEnvVol = proximity * 0.8;
                targetPan = Math.max(-1, Math.min(1, (nearest.x - pX)/300));
            } else {
                profileKey = 'EXPLORATION';
                targetEnvVol = 0; 
                targetFilter = 350; // Keep muffled for smooth transitions
            }
        }

        // Apply Logic
        if (profileKey !== this.music.activeProfile) {
            this.switchProfile(profileKey);
        }

        const lerp = (a, b, t) => (1-t)*a + t*b;
        this.music.intensity = lerp(this.music.intensity, intensity, 0.05);

        // Mixer
        if(this.musicBus) this.musicBus.gain.value = lerp(this.musicBus.gain.value, targetEnvVol, 0.1);
        if(this.walkmanBus) this.walkmanBus.gain.value = lerp(this.walkmanBus.gain.value, targetWalkmanVol, 0.1);
        
        // Filter: 0.1s fade (0.4 lerp) between muffled and clear
        const isInside = ['SHOP_MENU', 'MINIGAME', 'INTERACTION_MODE', 'SAFEHOUSE'].includes(profileKey) || 
                         mapId.includes('safehouse') || mapId.includes('_interior');
        
        if (isInside) {
             if(this.musicFilter) {
                 // Fast lerp (0.4) = ~0.1s at 60fps
                 this.musicFilter.frequency.value = lerp(this.musicFilter.frequency.value, targetFilter, 0.4);
                 this.musicFilter.Q.value = lerp(this.musicFilter.Q.value, 0.7, 0.2);
             }
             if(this.musicPanner) this.musicPanner.pan.value = lerp(this.musicPanner.pan.value, 0, 0.1); 
        } else {
             if(this.musicFilter) {
                 this.musicFilter.frequency.value = lerp(this.musicFilter.frequency.value, targetFilter, 0.4);
                 this.musicFilter.Q.value = lerp(this.musicFilter.Q.value, targetFilterQ, 0.2);
             }
             if(this.musicPanner) this.musicPanner.pan.value = lerp(this.musicPanner.pan.value, targetPan, 0.1);
        }

        // DEBUG LOGGING (Throttle to avoid spam)
        if (this.game.gameTime % 1000 < 20) {
            console.log(`[AudioDebug] State: ${this.game.gameState} | Map: ${mapId} | Inside: ${isInside} | Filter: ${Math.round(this.musicFilter.frequency.value)}Hz | Vol: ${this.musicBus.gain.value.toFixed(2)}`);
        }

        this.wasInside = isInside;

        if(profileKey === 'WALKMAN') {
            const newTempo = 116 + (this.music.intensity * 20);
            this.music.tempo = lerp(this.music.tempo, newTempo, 0.05);
        }
    },

    getDynamicSources: function() {
        const sources = [];
        if (!this.game || !this.game.mapManager || !this.game.mapManager.poiLocations) return sources;
        if (this.game.mapManager.currentMapId !== 'overworld') return sources;
        const tileSize = this.game.config.TILE_SIZE;
        this.game.mapManager.poiLocations.forEach(poi => {
            const profile = this.profileForPoi(poi);
            if (!profile) return;
            sources.push({
                x: poi.x * tileSize,
                y: poi.y * tileSize,
                radius: 800,
                profile: profile
            });
        });
        return sources;
    },

    profileForPoi: function(poi) {
        if (!poi) return null;
        const typeKey = poi.type || poi.id;
        if (!typeKey) return null;
        const lower = String(typeKey).toLowerCase();
        if (lower.includes('armoury')) return 'ARMOURY';
        if (lower.includes('casino')) return 'CASINO';
        if (lower.includes('bar')) return 'BAR';
        if (lower.includes('exchange')) return 'SHOP';
        if (lower.includes('stash') || lower.includes('safehouse')) return 'SAFEHOUSE';
        return this.poiAudioProfiles[typeKey] || null;
    },

    resolveProfileKey: function(key) {
        if (!key) return 'EXPLORATION';
        if (key === 'WORLD') return 'EXPLORATION';
        if (!this.profiles[key]) {
            console.warn(`[Audio] Unknown profile "${key}", defaulting to EXPLORATION.`);
            return 'EXPLORATION';
        }
        return key;
    },

    switchProfile: function(key) {
        const resolvedKey = this.resolveProfileKey(key);
        console.log(`[Audio] Switching to ${resolvedKey}`);
        const p = this.profiles[resolvedKey] || this.profiles.EXPLORATION;
        this.music.activeProfile = resolvedKey;
        if(resolvedKey !== 'WALKMAN') this.music.tempo = p.tempo;
        this.music.rootFreq = p.root;
        this.generateScale(p.scaleType, p.root);
        this.music.chordChangeCounter = 0;
    },

    generateScale: function(type, root) {
        const intervals = {
            'minor': [0, 2, 3, 5, 7, 8, 10],
            'major': [0, 2, 4, 5, 7, 9, 11],
            'mixolydian': [0, 2, 4, 5, 7, 9, 10],
            'dorian': [0, 2, 3, 5, 7, 9, 10]
        }[type] || [0,2,4,5,7,9,11];
        
        this.music.scale = [];
        for(let oct=0; oct<3; oct++) {
            intervals.forEach(i => this.music.scale.push(root * Math.pow(2, (i + oct*12)/12)));
        }
    },

    pickNote: function(offset=0) {
        const s = this.music.scale;
        if(!s.length) return 220;
        let start=0, end=s.length-1;
        if(offset < 0) end = Math.floor(s.length/2);
        else if(offset > 0) start = Math.floor(s.length/2);
        return s[Math.floor(start + Math.random()*(end-start))];
    },

    // --- THE SCHEDULER ---
    scheduler: function() {
        if (!this.enabled) return;
        while (this.music.nextNoteTime < this.audioCtx.currentTime + this.music.scheduleAheadTime) {
            this.playTick(this.music.current16th, this.music.nextNoteTime);
            this.music.nextNoteTime += 0.25 * (60.0 / this.music.tempo);
            this.music.current16th = (this.music.current16th + 1) % 16;
        }
        this.music.timerID = window.setTimeout(() => this.scheduler(), this.music.lookahead);
    },

    playTick: function(tick, time) {
        const prof = this.profiles[this.music.activeProfile] || this.profiles.EXPLORATION;
        const isWalkman = (this.music.activeProfile === 'WALKMAN');
        const dest = isWalkman ? this.walkmanBus : this.musicBus;
        if(!dest || !prof) return;

        // Get Pattern
        const patternName = prof.pattern || 'CHILL';
        const pat = this.patterns[patternName] || this.patterns.CHILL;
        
        // Intensity Modifiers
        const int = this.music.intensity;
        
        // 1. DRUMS
        if (pat.kick[tick] && Math.random() < 0.9) INSTRUMENTS.playKick(this.audioCtx, dest, time);
        
        if (pat.snare[tick] && int > 0.3) {
            // Only Walkman gets the gated snare effect fully, others get lighter snare
            INSTRUMENTS.playGatedSnare(this.audioCtx, dest, time);
        }
        
        if (pat.hat[tick]) {
            const open = (tick % 4 === 2); // Open hat on offbeat
            if (int > 0.5 || tick % 4 === 0) INSTRUMENTS.playHat(this.audioCtx, dest, time, open);
        }

        // 2. BASS
        if (pat.bass[tick] || (int > 0.8 && tick%2===0)) {
            const note = this.pickNote(-1); // Low
            INSTRUMENTS.playFMBass(this.audioCtx, dest, note/2, time, 0.2);
        }

        // 3. PADS / CHORDS (On beat 1)
        if (tick === 0 && prof.padType !== 'pop') {
            const root = this.music.scale[0];
            const third = this.music.scale[2];
            const fifth = this.music.scale[4];
            INSTRUMENTS.playJunoPad(this.audioCtx, dest, root, time, 4.0, false);
            // Add high strings for extra lushness in Safehouse
            if (prof.padType === 'lush') {
                INSTRUMENTS.playPWMStrings(this.audioCtx, dest, third*2, time, 4.0); 
            } else {
                INSTRUMENTS.playJunoPad(this.audioCtx, dest, third, time, 4.0, false);
            }
            INSTRUMENTS.playJunoPad(this.audioCtx, dest, fifth, time, 4.0, false);
        }

        // 4. LEAD / POP STABS / ARPS
        if (isWalkman && prof.padType === 'pop') {
            // Arpeggio Bass/Mid (16th notes)
            if (int > 0.6) {
                const note = this.pickNote(0); // Mid range
                INSTRUMENTS.playArp(this.audioCtx, dest, note, time);
            }

            // Goonies style melody
            if (tick % 4 === 0 || (int > 0.6 && Math.random() > 0.5)) {
                const note = this.pickNote(1);
                // Use Synth Brass Stab
                INSTRUMENTS.playJunoPad(this.audioCtx, dest, note, time, 0.2, true); 
            }
            // Heroic Lead
            if (int > 0.7 && Math.random() < 0.3) {
                const note = this.pickNote(1);
                INSTRUMENTS.playSyncLead(this.audioCtx, dest, note, time, 0.4);
            }
        } else if (int > 0.5 && Math.random() < 0.2) {
            // Ambient Lead
            const note = this.pickNote(1);
            INSTRUMENTS.playSyncLead(this.audioCtx, dest, note, time, 0.5);
        }
    },

    // SFX Helpers
    playTone: function(freq, type, dur, vol=0.1) {
        if(!this.enabled) return;
        const o = this.audioCtx.createOscillator();
        const g = this.audioCtx.createGain();
        o.type = type;
        o.frequency.value = freq;
        g.gain.setValueAtTime(vol, this.audioCtx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime+dur);
        o.connect(g); g.connect(this.masterGain);
        o.start(); o.stop(this.audioCtx.currentTime+dur);
    },
    playPickup: function() { this.playTone(1200, 'sine', 0.1, 0.3); },
    playAttackSound: function(weapon) { 
        if (!this.enabled) return;
        if (weapon && weapon.type === 'ranged') {
            INSTRUMENTS.playGatedSnare(this.audioCtx, this.masterGain, this.audioCtx.currentTime); 
        } else {
            INSTRUMENTS.playSwish(this.audioCtx, this.masterGain, this.audioCtx.currentTime);
        }
    }, 
    playHit: function() { this.playTone(100, 'sawtooth', 0.2, 0.5); },
    playUI: function() { this.playTone(2000, 'sine', 0.05, 0.1); },
    playError: function() { this.playTone(150, 'sawtooth', 0.3, 0.5); },
    playPowerUp: function() {
        if(!this.enabled) return;
        this.playTone(400, 'sine', 0.1, 0.3);
        setTimeout(() => this.playTone(600, 'sine', 0.1, 0.3), 100);
        setTimeout(() => this.playTone(800, 'sine', 0.2, 0.3), 200);
    },
    playEnemyAlert: function(x, y) {
        if(!this.enabled) return;
        const pX = this.game.player.x;
        const pan = Math.max(-1, Math.min(1, (x-pX)/300));
        const o = this.audioCtx.createOscillator();
        const g = this.audioCtx.createGain();
        const p = this.audioCtx.createStereoPanner();
        o.type='sawtooth'; o.frequency.setValueAtTime(400, this.audioCtx.currentTime);
        o.frequency.linearRampToValueAtTime(600, this.audioCtx.currentTime+0.2);
        g.gain.value=0.3; g.gain.linearRampToValueAtTime(0, this.audioCtx.currentTime+0.2);
        p.pan.value=pan;
        o.connect(g); g.connect(p); p.connect(this.masterGain);
        o.start(); o.stop(this.audioCtx.currentTime+0.2);
    },

    // --- Walkman Controls ---
    toggleWalkmanPlayback: function() {
        if (!this.game.player.hasWalkmanActive) return; // Can't toggle if not equipped
        // This is a UI toggle. Logic: If active, stop. If stopped, play.
        // Wait, player.hasWalkmanActive IS the state.
        // But maybe we want to PAUSE without unequipping?
        // Let's toggle the internal "paused" state of the walkman logic.
        // Actually, player.hasWalkmanActive controls the whole audio profile switch.
        // Let's map Play/Pause to equipping/unequipping for simplicity, 
        // OR add a sub-state 'walkmanPaused'.
        
        this.walkmanPaused = !this.walkmanPaused;
        this.updateMusicState();
    },
    
    stopWalkman: function() {
        // Hard stop (unequip effect)
        if (this.game.player.hasWalkmanActive) {
            this.game.player.hasWalkmanActive = false;
            this.game.utils.addMessage("Walkman Stopped.");
            this.updateMusicState();
            // Hide UI
            const ui = document.getElementById('walkmanControls');
            if(ui) ui.style.display = 'none';
        }
    },

    setWalkmanVolume: function(val) {
        // This sets the MAX volume for the Walkman bus
        // We need to store this user preference
        this.walkmanUserVolume = parseFloat(val);
        this.updateMusicState(); // Re-apply volume
    },

    playTheme: function(themeName) {
        this.switchProfile(themeName);
    }
};
