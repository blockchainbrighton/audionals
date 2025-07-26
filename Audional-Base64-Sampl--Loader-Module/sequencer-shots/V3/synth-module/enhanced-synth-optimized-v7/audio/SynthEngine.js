/**
 * SynthEngine - Modular synthesis engine
 * Handles oscillators, envelopes, and voice management for synthesis
 */
import { audioEngine } from '../core/AudioEngine.js';
import { stateManager } from '../core/StateManager.js';
import { eventBus, EVENTS } from '../core/EventBus.js';
import { errorHandler } from '../core/ErrorHandler.js';

export class SynthEngine {
    constructor() {
        this.voices = new Map();
        this.isInitialized = false;
        
        // Synthesis parameters
        this.waveform = 'sine';
        this.detune = 0;
        this.envelope = {
            attack: 0.01,
            decay: 0.1,
            sustain: 0.7,
            release: 0.3
        };
        
        // Presets
        this.presets = this.createPresets();
        
        this.setupEventListeners();
    }

    /**
     * Initialize the synthesis engine
     * @returns {Promise<boolean>} Success
     */
    async initialize() {
        if (this.isInitialized) {
            return true;
        }

        try {
            // Wait for audio engine to be ready
            if (!audioEngine.isReady) {
                await new Promise(resolve => {
                    eventBus.once(EVENTS.AUDIO_CONTEXT_READY, resolve);
                });
            }

            this.loadStateFromManager();
            this.isInitialized = true;
            
            errorHandler.info('Synthesis engine initialized');
            return true;
            
        } catch (error) {
            errorHandler.handleAudioError(error, {
                operation: 'initialize',
                context: 'SynthEngine.initialize'
            });
            return false;
        }
    }

    /**
     * Play a note
     * @param {string} note - Note name (e.g., 'C4', 'F#3')
     * @param {number} velocity - Velocity (0-1)
     * @param {number} duration - Duration in seconds (optional)
     * @returns {string|null} Note ID for stopping
     */
    playNote(note, velocity = 1, duration = null) {
        if (!this.isInitialized || !audioEngine.context) {
            errorHandler.warn('Cannot play note: synthesis engine not ready');
            return null;
        }

        try {
            const noteId = this.generateNoteId(note);
            const voiceId = audioEngine.allocateVoice(noteId);
            
            if (voiceId === null) {
                errorHandler.warn(`No voice available for note ${note}`);
                return null;
            }

            const voice = this.createVoice(note, velocity, voiceId);
            this.voices.set(noteId, voice);
            
            // Start the voice
            voice.start();
            
            // Auto-stop if duration is specified
            if (duration) {
                setTimeout(() => {
                    this.stopNote(noteId);
                }, duration * 1000);
            }
            
            eventBus.emit(EVENTS.AUDIO_NOTE_ON, { note, velocity, noteId });
            errorHandler.debug(`Note started: ${note} (velocity: ${velocity})`);
            
            return noteId;
            
        } catch (error) {
            errorHandler.handleAudioError(error, {
                operation: 'playNote',
                note,
                velocity
            });
            return null;
        }
    }

    /**
     * Stop a note
     * @param {string} noteId - Note ID from playNote
     * @param {number} releaseTime - Custom release time (optional)
     */
    stopNote(noteId, releaseTime = null) {
        const voice = this.voices.get(noteId);
        if (voice) {
            try {
                voice.stop(releaseTime);
                eventBus.emit(EVENTS.AUDIO_NOTE_OFF, { noteId });
                errorHandler.debug(`Note stopped: ${noteId}`);
            } catch (error) {
                errorHandler.handleAudioError(error, {
                    operation: 'stopNote',
                    noteId
                });
            }
        }
    }

    /**
     * Stop all notes immediately
     */
    stopAllNotes() {
        for (const noteId of this.voices.keys()) {
            this.stopNote(noteId, 0); // Immediate stop
        }
        errorHandler.debug('All notes stopped');
    }

    /**
     * Create a voice for synthesis
     * @param {string} note - Note name
     * @param {number} velocity - Velocity
     * @param {number} voiceId - Voice ID
     * @returns {Object} Voice object
     */
    createVoice(note, velocity, voiceId) {
        const context = audioEngine.context;
        const frequency = this.noteToFrequency(note);
        
        // Create oscillator
        const oscillator = context.createOscillator();
        oscillator.type = this.waveform;
        oscillator.frequency.value = frequency + this.detune;
        
        // Create envelope (gain node)
        const envelope = context.createGain();
        envelope.gain.value = 0;
        
        // Create velocity scaling
        const velocityGain = context.createGain();
        velocityGain.gain.value = velocity;
        
        // Connect: oscillator -> envelope -> velocity -> master
        oscillator.connect(envelope);
        envelope.connect(velocityGain);
        velocityGain.connect(audioEngine.masterGain);
        
        const voice = {
            oscillator,
            envelope,
            velocityGain,
            voiceId,
            note,
            velocity,
            startTime: null,
            isPlaying: false,
            
            start() {
                const now = context.currentTime;
                this.startTime = now;
                this.isPlaying = true;
                
                // Start oscillator
                oscillator.start(now);
                
                // Apply ADSR envelope
                const attack = stateManager.getStateValue('synth.envelope.attack');
                const decay = stateManager.getStateValue('synth.envelope.decay');
                const sustain = stateManager.getStateValue('synth.envelope.sustain');
                
                // Attack phase
                envelope.gain.setValueAtTime(0, now);
                envelope.gain.linearRampToValueAtTime(1, now + attack);
                
                // Decay phase
                envelope.gain.linearRampToValueAtTime(sustain, now + attack + decay);
            },
            
            stop(customReleaseTime = null) {
                if (!this.isPlaying) return;
                
                const now = context.currentTime;
                const release = customReleaseTime !== null ? 
                    customReleaseTime : 
                    stateManager.getStateValue('synth.envelope.release');
                
                // Release phase
                envelope.gain.cancelScheduledValues(now);
                envelope.gain.setValueAtTime(envelope.gain.value, now);
                envelope.gain.linearRampToValueAtTime(0, now + release);
                
                // Stop oscillator after release
                oscillator.stop(now + release);
                
                // Clean up after release
                setTimeout(() => {
                    this.cleanup();
                }, (release + 0.1) * 1000);
                
                this.isPlaying = false;
            },
            
            cleanup() {
                try {
                    // Disconnect all nodes
                    oscillator.disconnect();
                    envelope.disconnect();
                    velocityGain.disconnect();
                    
                    // Release voice
                    audioEngine.releaseVoice(voiceId);
                    
                    // Remove from voices map
                    const noteId = SynthEngine.prototype.generateNoteId(note);
                    SynthEngine.prototype.voices.delete(noteId);
                    
                } catch (error) {
                    errorHandler.handleAudioError(error, {
                        operation: 'cleanup',
                        voiceId
                    });
                }
            }
        };
        
        return voice;
    }

    /**
     * Update synthesis parameters
     * @param {Object} params - Parameters to update
     */
    updateParameters(params) {
        if (params.waveform !== undefined) {
            this.waveform = params.waveform;
            stateManager.setState('synth.waveform', params.waveform);
        }
        
        if (params.detune !== undefined) {
            this.detune = params.detune;
            stateManager.setState('synth.detune', params.detune);
        }
        
        if (params.envelope) {
            Object.assign(this.envelope, params.envelope);
            for (const [key, value] of Object.entries(params.envelope)) {
                stateManager.setState(`synth.envelope.${key}`, value);
            }
        }
        
        eventBus.emit(EVENTS.AUDIO_PARAMETER_CHANGED, params);
        errorHandler.debug('Synthesis parameters updated', params);
    }

    /**
     * Load an envelope preset
     * @param {string} presetName - Preset name
     */
    loadEnvelopePreset(presetName) {
        const preset = this.presets[presetName];
        if (preset) {
            this.updateParameters({ envelope: preset });
            stateManager.setState('synth.envelope.preset', presetName);
            errorHandler.info(`Loaded envelope preset: ${presetName}`);
        } else {
            errorHandler.warn(`Unknown envelope preset: ${presetName}`);
        }
    }

    /**
     * Get available presets
     * @returns {Object} Available presets
     */
    getPresets() {
        return { ...this.presets };
    }

    /**
     * Get current synthesis parameters
     * @returns {Object} Current parameters
     */
    getParameters() {
        return {
            waveform: this.waveform,
            detune: this.detune,
            envelope: { ...this.envelope }
        };
    }

    /**
     * Get active voices count
     * @returns {number} Number of active voices
     */
    getActiveVoicesCount() {
        return Array.from(this.voices.values()).filter(voice => voice.isPlaying).length;
    }

    // Private methods

    generateNoteId(note) {
        return `${note}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    noteToFrequency(note) {
        // Convert note name to frequency using equal temperament
        const noteMap = {
            'C': -9, 'C#': -8, 'Db': -8, 'D': -7, 'D#': -6, 'Eb': -6,
            'E': -5, 'F': -4, 'F#': -3, 'Gb': -3, 'G': -2, 'G#': -1, 'Ab': -1,
            'A': 0, 'A#': 1, 'Bb': 1, 'B': 2
        };
        
        const match = note.match(/^([A-G][#b]?)(\d+)$/);
        if (!match) {
            errorHandler.warn(`Invalid note format: ${note}`);
            return 440; // Default to A4
        }
        
        const [, noteName, octaveStr] = match;
        const octave = parseInt(octaveStr);
        const semitone = noteMap[noteName];
        
        if (semitone === undefined) {
            errorHandler.warn(`Unknown note: ${noteName}`);
            return 440;
        }
        
        // Calculate frequency: A4 = 440Hz
        const semitonesFromA4 = (octave - 4) * 12 + semitone;
        return 440 * Math.pow(2, semitonesFromA4 / 12);
    }

    createPresets() {
        return {
            piano: { attack: 0.01, decay: 0.1, sustain: 0.3, release: 0.8 },
            organ: { attack: 0.01, decay: 0.0, sustain: 1.0, release: 0.1 },
            strings: { attack: 0.3, decay: 0.2, sustain: 0.8, release: 1.5 },
            brass: { attack: 0.1, decay: 0.1, sustain: 0.9, release: 0.5 },
            pad: { attack: 1.0, decay: 0.5, sustain: 0.7, release: 2.0 },
            pluck: { attack: 0.01, decay: 0.3, sustain: 0.0, release: 0.5 },
            bass: { attack: 0.01, decay: 0.1, sustain: 0.6, release: 0.3 }
        };
    }

    loadStateFromManager() {
        this.waveform = stateManager.getStateValue('synth.waveform');
        this.detune = stateManager.getStateValue('synth.detune');
        this.envelope = stateManager.getStateValue('synth.envelope');
    }

    setupEventListeners() {
        // Listen for parameter changes from UI
        stateManager.subscribe('synth.waveform', (waveform) => {
            this.waveform = waveform;
        });

        stateManager.subscribe('synth.detune', (detune) => {
            this.detune = detune;
        });

        // Listen for envelope changes
        ['attack', 'decay', 'sustain', 'release'].forEach(param => {
            stateManager.subscribe(`synth.envelope.${param}`, (value) => {
                this.envelope[param] = value;
            });
        });

        // Listen for preset changes
        stateManager.subscribe('synth.envelope.preset', (preset) => {
            if (preset && this.presets[preset]) {
                Object.assign(this.envelope, this.presets[preset]);
            }
        });
    }
}

// Create and export singleton instance
export const synthEngine = new SynthEngine();

