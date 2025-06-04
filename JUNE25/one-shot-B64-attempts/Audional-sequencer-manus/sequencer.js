/**
 * Audional Sequencer - Sequencer Module
 * 
 * Handles step sequencing, timing, and playback coordination
 */

import { EVENTS } from '../utils/event-bus.js';
import { getStepDuration, clamp } from '../utils/helpers.js';

export default class Sequencer {
    constructor(stateStore, eventBus) {
        this.stateStore = stateStore;
        this.eventBus = eventBus;
        
        // Timing and scheduling
        this.isPlaying = false;
        this.currentStep = 0;
        this.nextStepTime = 0;
        this.lookaheadTime = 25.0; // 25ms lookahead
        this.scheduleAheadTime = 0.1; // 100ms schedule ahead
        this.timerID = null;
        
        // Step scheduling
        this.stepQueue = [];
        this.lastStepDrawn = -1;
        
        // Performance optimization
        this.updateInterval = 16; // ~60fps for UI updates
        this.lastUIUpdate = 0;
        
        // Bind methods
        this.init = this.init.bind(this);
        this.play = this.play.bind(this);
        this.stop = this.stop.bind(this);
        this.pause = this.pause.bind(this);
        this.setBPM = this.setBPM.bind(this);
        this.nextStep = this.nextStep.bind(this);
        this.scheduler = this.scheduler.bind(this);
        this.scheduleStep = this.scheduleStep.bind(this);
        this.updateUI = this.updateUI.bind(this);
        this.destroy = this.destroy.bind(this);
    }

    /**
     * Initialize the sequencer
     */
    async init() {
        try {
            console.log('🎼 Initializing Sequencer...');
            
            this.setupEventListeners();
            this.setupStateSubscriptions();
            
            console.log('✅ Sequencer initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize Sequencer:', error);
            throw error;
        }
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Audio context events
        this.eventBus.on(EVENTS.AUDIO_CONTEXT_CREATED, (audioContext) => {
            this.audioContext = audioContext;
        });

        this.eventBus.on(EVENTS.AUDIO_CONTEXT_SUSPENDED, () => {
            if (this.isPlaying) {
                this.pause();
            }
        });

        this.eventBus.on(EVENTS.AUDIO_CONTEXT_RESUMED, () => {
            // Resume playback if it was playing before suspension
            const state = this.stateStore.getState();
            if (state.isPlaying && !this.isPlaying) {
                this.play();
            }
        });
    }

    /**
     * Set up state subscriptions
     */
    setupStateSubscriptions() {
        // BPM changes
        this.stateStore.subscribe('bpm', (bpm) => {
            this.setBPM(bpm);
        });

        // Sequence changes
        this.stateStore.subscribe('currentSequence', () => {
            // Reset to step 0 when sequence changes
            this.currentStep = 0;
            this.stateStore.setState({ currentStep: 0 });
        });
    }

    /**
     * Start playback
     */
    play() {
        if (!this.audioContext) {
            console.warn('Cannot start playback: Audio context not available');
            return;
        }

        if (this.isPlaying) {
            return; // Already playing
        }

        console.log('▶️ Starting playback');
        
        this.isPlaying = true;
        this.nextStepTime = this.audioContext.currentTime;
        
        // Start the scheduler
        this.scheduler();
        
        // Update state
        this.stateStore.setState({ isPlaying: true });
        this.eventBus.emit(EVENTS.PLAYBACK_STARTED);
    }

    /**
     * Stop playback
     */
    stop() {
        if (!this.isPlaying) {
            return; // Already stopped
        }

        console.log('⏹️ Stopping playback');
        
        this.isPlaying = false;
        
        // Clear timer
        if (this.timerID) {
            clearTimeout(this.timerID);
            this.timerID = null;
        }
        
        // Reset to beginning
        this.currentStep = 0;
        this.stepQueue = [];
        
        // Stop all sounds
        const audioEngine = this.getAudioEngine();
        if (audioEngine) {
            audioEngine.stopAllSounds();
        }
        
        // Update state
        this.stateStore.setState({ 
            isPlaying: false,
            currentStep: 0
        });
        
        this.eventBus.emit(EVENTS.PLAYBACK_STOPPED);
    }

    /**
     * Pause playback
     */
    pause() {
        if (!this.isPlaying) {
            return; // Already paused/stopped
        }

        console.log('⏸️ Pausing playback');
        
        this.isPlaying = false;
        
        // Clear timer
        if (this.timerID) {
            clearTimeout(this.timerID);
            this.timerID = null;
        }
        
        // Stop all sounds
        const audioEngine = this.getAudioEngine();
        if (audioEngine) {
            audioEngine.stopAllSounds();
        }
        
        // Update state
        this.stateStore.setState({ isPlaying: false });
        this.eventBus.emit(EVENTS.PLAYBACK_PAUSED);
    }

    /**
     * Set BPM
     * @param {number} bpm - Beats per minute
     */
    setBPM(bpm) {
        const clampedBPM = clamp(bpm, 1, 420);
        
        if (clampedBPM !== bpm) {
            console.warn(`BPM clamped from ${bpm} to ${clampedBPM}`);
        }
        
        this.stateStore.setState({ bpm: clampedBPM });
        this.eventBus.emit(EVENTS.BPM_CHANGED, clampedBPM);
    }

    /**
     * Move to next step
     */
    nextStep() {
        const state = this.stateStore.getState();
        const totalSteps = 64;
        
        this.currentStep = (this.currentStep + 1) % totalSteps;
        
        // Check for sequence change in continuous mode
        if (this.currentStep === 0 && state.continuousPlayback) {
            const nextSequence = (state.currentSequence + 1) % state.sequences.length;
            this.stateStore.setState({ currentSequence: nextSequence });
        }
        
        this.stateStore.setState({ currentStep: this.currentStep });
        this.eventBus.emit(EVENTS.STEP_CHANGED, this.currentStep);
    }

    /**
     * Main scheduler function (lookahead scheduling)
     */
    scheduler() {
        if (!this.isPlaying || !this.audioContext) {
            return;
        }

        // Schedule steps that need to be played
        while (this.nextStepTime < this.audioContext.currentTime + this.scheduleAheadTime) {
            this.scheduleStep(this.currentStep, this.nextStepTime);
            this.nextStep();
            
            // Calculate next step time
            const state = this.stateStore.getState();
            const stepDuration = getStepDuration(state.bpm, 4); // 16th notes
            this.nextStepTime += stepDuration;
        }
        
        // Update UI at 60fps
        const now = performance.now();
        if (now - this.lastUIUpdate >= this.updateInterval) {
            this.updateUI();
            this.lastUIUpdate = now;
        }
        
        // Schedule next scheduler call
        this.timerID = setTimeout(this.scheduler, this.lookaheadTime);
    }

    /**
     * Schedule a step for playback
     * @param {number} stepIndex - Step index (0-63)
     * @param {number} time - Audio context time to play
     */
    scheduleStep(stepIndex, time) {
        const state = this.stateStore.getState();
        const currentSequence = state.sequences[state.currentSequence];
        
        if (!currentSequence) {
            return;
        }

        const audioEngine = this.getAudioEngine();
        if (!audioEngine) {
            return;
        }

        // Check each channel for active steps
        currentSequence.channels.forEach((channel, channelIndex) => {
            if (!channel.steps[stepIndex] || channel.muted) {
                return; // Step not active or channel muted
            }

            // Check solo mode
            const hasSoloChannels = currentSequence.channels.some(ch => ch.solo);
            if (hasSoloChannels && !channel.solo) {
                return; // Other channels are soloed
            }

            // Get audio buffer
            const buffer = channel.sampleBuffer;
            if (!buffer) {
                return; // No sample loaded
            }

            // Calculate playback parameters
            const startTime = time - audioEngine.getCurrentTime();
            const volume = channel.volume;
            const pitch = channel.pitch;
            const trimStart = channel.trimStart;
            const trimEnd = channel.trimEnd;
            const reverse = channel.reverse;

            // Play the sound
            try {
                audioEngine.playSound({
                    buffer: reverse ? this.getReverseBuffer(channel.sampleUrl) : buffer,
                    volume,
                    pitch,
                    startTime: Math.max(0, startTime),
                    trimStart,
                    trimEnd,
                    channelId: channelIndex
                });
            } catch (error) {
                console.error(`Error playing step ${stepIndex} on channel ${channelIndex}:`, error);
            }
        });

        // Add to step queue for UI updates
        this.stepQueue.push({
            step: stepIndex,
            time: time
        });
    }

    /**
     * Get reverse buffer for a sample URL
     * @param {string} url - Sample URL
     * @returns {AudioBuffer|null} - Reverse buffer
     */
    getReverseBuffer(url) {
        const audioEngine = this.getAudioEngine();
        if (audioEngine && audioEngine.reverseBufferCache.has(url)) {
            return audioEngine.reverseBufferCache.get(url);
        }
        return null;
    }

    /**
     * Update UI elements
     */
    updateUI() {
        // Remove old steps from queue
        const currentTime = this.audioContext.currentTime;
        this.stepQueue = this.stepQueue.filter(item => item.time > currentTime - 0.1);
        
        // Update step indicators in UI
        if (this.currentStep !== this.lastStepDrawn) {
            this.updateStepIndicators();
            this.lastStepDrawn = this.currentStep;
        }
    }

    /**
     * Update step indicators in the UI
     */
    updateStepIndicators() {
        // Remove previous current step indicators
        document.querySelectorAll('.step-number.current').forEach(el => {
            el.classList.remove('current');
        });
        
        document.querySelectorAll('.step-button.current').forEach(el => {
            el.classList.remove('current');
        });
        
        // Add current step indicators
        const stepHeaders = document.querySelectorAll('.step-number');
        const stepButtons = document.querySelectorAll('.step-button');
        
        if (stepHeaders[this.currentStep]) {
            stepHeaders[this.currentStep].classList.add('current');
        }
        
        // Update all step buttons for current step
        stepButtons.forEach((button, index) => {
            if (index % 64 === this.currentStep) {
                button.classList.add('current');
            }
        });
    }

    /**
     * Toggle step on/off
     * @param {number} channelIndex - Channel index
     * @param {number} stepIndex - Step index
     */
    toggleStep(channelIndex, stepIndex) {
        const state = this.stateStore.getState();
        const currentSequence = state.sequences[state.currentSequence];
        
        if (!currentSequence || !currentSequence.channels[channelIndex]) {
            return;
        }

        const channel = currentSequence.channels[channelIndex];
        const newStepValue = !channel.steps[stepIndex];
        
        // Update state
        const updates = {
            [`sequences.${state.currentSequence}.channels.${channelIndex}.steps.${stepIndex}`]: newStepValue
        };
        
        this.stateStore.setState(updates);
        this.eventBus.emit(EVENTS.STEP_TOGGLED, {
            channelIndex,
            stepIndex,
            active: newStepValue
        });
    }

    /**
     * Clear all steps in current sequence
     */
    clearSequence() {
        const state = this.stateStore.getState();
        const currentSequence = state.currentSequence;
        
        const updates = {};
        for (let channelIndex = 0; channelIndex < 16; channelIndex++) {
            for (let stepIndex = 0; stepIndex < 64; stepIndex++) {
                updates[`sequences.${currentSequence}.channels.${channelIndex}.steps.${stepIndex}`] = false;
            }
        }
        
        this.stateStore.setState(updates);
        this.eventBus.emit(EVENTS.PATTERN_CLEARED, { sequence: currentSequence });
    }

    /**
     * Copy current sequence pattern
     * @returns {Object} - Copied pattern data
     */
    copySequencePattern() {
        const state = this.stateStore.getState();
        const currentSequence = state.sequences[state.currentSequence];
        
        if (!currentSequence) {
            return null;
        }

        const pattern = {
            channels: currentSequence.channels.map(channel => ({
                steps: [...channel.steps],
                volume: channel.volume,
                pitch: channel.pitch,
                reverse: channel.reverse
            }))
        };
        
        this.eventBus.emit(EVENTS.PATTERN_COPIED, { pattern });
        return pattern;
    }

    /**
     * Paste pattern to current sequence
     * @param {Object} pattern - Pattern data to paste
     */
    pasteSequencePattern(pattern) {
        if (!pattern || !pattern.channels) {
            return;
        }

        const state = this.stateStore.getState();
        const currentSequence = state.currentSequence;
        
        const updates = {};
        
        pattern.channels.forEach((channelPattern, channelIndex) => {
            if (channelIndex < 16) {
                // Paste steps
                channelPattern.steps.forEach((step, stepIndex) => {
                    if (stepIndex < 64) {
                        updates[`sequences.${currentSequence}.channels.${channelIndex}.steps.${stepIndex}`] = step;
                    }
                });
                
                // Paste channel settings
                if (channelPattern.volume !== undefined) {
                    updates[`sequences.${currentSequence}.channels.${channelIndex}.volume`] = channelPattern.volume;
                }
                if (channelPattern.pitch !== undefined) {
                    updates[`sequences.${currentSequence}.channels.${channelIndex}.pitch`] = channelPattern.pitch;
                }
                if (channelPattern.reverse !== undefined) {
                    updates[`sequences.${currentSequence}.channels.${channelIndex}.reverse`] = channelPattern.reverse;
                }
            }
        });
        
        this.stateStore.setState(updates);
        this.eventBus.emit(EVENTS.PATTERN_PASTED, { sequence: currentSequence, pattern });
    }

    /**
     * Get audio engine instance
     * @returns {AudioEngine|null} - Audio engine instance
     */
    getAudioEngine() {
        // This would be injected or accessed through a module registry
        // For now, we'll access it through the global app instance
        if (window.AudionalSequencer) {
            return window.AudionalSequencer.getModule('audioEngine');
        }
        return null;
    }

    /**
     * Get current playback position info
     * @returns {Object} - Playback position info
     */
    getPlaybackInfo() {
        const state = this.stateStore.getState();
        const stepDuration = getStepDuration(state.bpm, 4);
        const totalDuration = stepDuration * 64;
        const currentTime = this.currentStep * stepDuration;
        
        return {
            currentStep: this.currentStep,
            totalSteps: 64,
            currentTime,
            totalDuration,
            progress: this.currentStep / 64,
            bpm: state.bpm,
            isPlaying: this.isPlaying
        };
    }

    /**
     * Jump to specific step
     * @param {number} stepIndex - Step to jump to (0-63)
     */
    jumpToStep(stepIndex) {
        const clampedStep = clamp(stepIndex, 0, 63);
        this.currentStep = clampedStep;
        this.stateStore.setState({ currentStep: clampedStep });
        this.eventBus.emit(EVENTS.STEP_CHANGED, clampedStep);
    }

    /**
     * Destroy sequencer and clean up
     */
    destroy() {
        console.log('🧹 Destroying Sequencer...');
        
        // Stop playback
        this.stop();
        
        // Clear any remaining timers
        if (this.timerID) {
            clearTimeout(this.timerID);
            this.timerID = null;
        }
        
        // Clear step queue
        this.stepQueue = [];
        
        console.log('✅ Sequencer destroyed');
    }
}

