// js/soundManager.js

export const soundManager = {
    audioCtx: null,
    masterGain: null,
    enabled: true,

    init: function() {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioCtx = new AudioContext();
            this.masterGain = this.audioCtx.createGain();
            this.masterGain.gain.value = 0.3; // Default volume
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
    },

    playTone: function(freq, type, duration, startTime = 0, vol = 1) {
        if (!this.enabled || !this.audioCtx) return;
        this.resume();

        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime + startTime);

        gain.gain.setValueAtTime(vol, this.audioCtx.currentTime + startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + startTime + duration);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(this.audioCtx.currentTime + startTime);
        osc.stop(this.audioCtx.currentTime + startTime + duration);
    },

    playShoot: function() {
        // High frequency "pew"
        this.playTone(800, 'square', 0.1, 0, 0.5);
        this.playTone(400, 'sawtooth', 0.1, 0.05, 0.3);
    },

    playHit: function() {
        // Low noise/thud simulation
        if (!this.enabled || !this.audioCtx) return;
        this.resume();

        // White noise buffer for "crunch"
        const bufferSize = this.audioCtx.sampleRate * 0.1; // 0.1 sec
        const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.audioCtx.createBufferSource();
        noise.buffer = buffer;
        const gain = this.audioCtx.createGain();
        gain.gain.setValueAtTime(0.5, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.1);
        
        noise.connect(gain);
        gain.connect(this.masterGain);
        noise.start();
    },

    playPickup: function() {
        // Happy chime
        this.playTone(1000, 'sine', 0.1, 0, 0.4);
        this.playTone(1500, 'sine', 0.2, 0.1, 0.4);
    },

    playDamage: function() {
        // Low dissonant alert
        this.playTone(150, 'sawtooth', 0.2, 0, 0.8);
        this.playTone(140, 'sawtooth', 0.2, 0.05, 0.8);
    },
    
    playUI: function() {
        this.playTone(2000, 'sine', 0.05, 0, 0.1);
    }
};
