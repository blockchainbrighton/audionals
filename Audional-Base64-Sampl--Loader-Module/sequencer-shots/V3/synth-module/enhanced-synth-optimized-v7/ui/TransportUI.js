/**
 * TransportUI - Transport controls and sequencer interface
 * Handles play/stop/record controls, BPM, and sequence management
 */
import { stateManager } from '../core/StateManager.js';
import { eventBus, EVENTS } from '../core/EventBus.js';
import { errorHandler } from '../core/ErrorHandler.js';
import { DOMUtils } from '../utils/DOMUtils.js';

export class TransportUI {
    constructor() {
        this.isPlaying = false;
        this.isRecording = false;
        this.currentBPM = 120;
        this.transportButtons = new Map();
        this.isInitialized = false;
    }

    /**
     * Initialize the transport UI
     * @returns {Promise<boolean>} Success
     */
    async initialize() {
        if (this.isInitialized) {
            return true;
        }

        try {
            this.setupTransportControls();
            this.setupBPMControl();
            this.setupEventListeners();
            this.loadTransportState();
            
            this.isInitialized = true;
            errorHandler.info('Transport UI initialized');
            return true;
            
        } catch (error) {
            errorHandler.handleUIError(error, {
                operation: 'initialize',
                context: 'TransportUI.initialize'
            });
            return false;
        }
    }

    /**
     * Setup transport control buttons
     */
    setupTransportControls() {
        const transportContainer = document.getElementById('transport-controls');
        if (!transportContainer) {
            throw new Error('Transport controls container not found');
        }

        // Get button elements
        const playButton = document.getElementById('play-button');
        const stopButton = document.getElementById('stop-button');
        const recordButton = document.getElementById('record-button');
        const clearButton = document.getElementById('clear-button');

        if (!playButton || !stopButton || !recordButton || !clearButton) {
            throw new Error('Transport button elements not found');
        }

        // Store button references
        this.transportButtons.set('play', playButton);
        this.transportButtons.set('stop', stopButton);
        this.transportButtons.set('record', recordButton);
        this.transportButtons.set('clear', clearButton);

        // Setup button event listeners
        playButton.addEventListener('click', () => {
            this.handlePlayButton();
        });

        stopButton.addEventListener('click', () => {
            this.handleStopButton();
        });

        recordButton.addEventListener('click', () => {
            this.handleRecordButton();
        });

        clearButton.addEventListener('click', () => {
            this.handleClearButton();
        });

        // Update initial button states
        this.updateButtonStates();
    }

    /**
     * Setup BPM control
     */
    setupBPMControl() {
        const bpmInput = document.getElementById('bpm-input');
        if (!bpmInput) {
            errorHandler.warn('BPM input element not found');
            return;
        }

        bpmInput.value = this.currentBPM;

        bpmInput.addEventListener('input', (e) => {
            this.handleBPMChange(e.target.value);
        });

        bpmInput.addEventListener('change', (e) => {
            this.handleBPMChange(e.target.value);
        });
    }

    /**
     * Handle play button click
     */
    handlePlayButton() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    /**
     * Handle stop button click
     */
    handleStopButton() {
        this.stop();
    }

    /**
     * Handle record button click
     */
    handleRecordButton() {
        if (this.isRecording) {
            this.stopRecording();
        } else {
            this.startRecording();
        }
    }

    /**
     * Handle clear button click
     */
    handleClearButton() {
        this.clearSequence();
    }

    /**
     * Start playback
     */
    play() {
        if (this.isPlaying) return;

        this.isPlaying = true;
        stateManager.setState('transport.isPlaying', true);

        // Emit play event
        eventBus.emit(EVENTS.TRANSPORT_PLAY, {
            bpm: this.currentBPM,
            timestamp: Date.now()
        });

        this.updateButtonStates();
        errorHandler.debug('Transport: Play started');
    }

    /**
     * Pause playback
     */
    pause() {
        if (!this.isPlaying) return;

        this.isPlaying = false;
        stateManager.setState('transport.isPlaying', false);

        // Emit pause event
        eventBus.emit(EVENTS.TRANSPORT_PAUSE, {
            timestamp: Date.now()
        });

        this.updateButtonStates();
        errorHandler.debug('Transport: Playback paused');
    }

    /**
     * Stop playback
     */
    stop() {
        const wasPlaying = this.isPlaying;
        const wasRecording = this.isRecording;

        this.isPlaying = false;
        this.isRecording = false;
        
        stateManager.setState('transport.isPlaying', false);
        stateManager.setState('transport.isRecording', false);

        // Emit stop event
        eventBus.emit(EVENTS.TRANSPORT_STOP, {
            wasPlaying: wasPlaying,
            wasRecording: wasRecording,
            timestamp: Date.now()
        });

        // Stop all notes
        eventBus.emit(EVENTS.ALL_NOTES_OFF);

        this.updateButtonStates();
        errorHandler.debug('Transport: Stopped');
    }

    /**
     * Start recording
     */
    startRecording() {
        if (this.isRecording) return;

        this.isRecording = true;
        stateManager.setState('transport.isRecording', true);

        // Start playback if not already playing
        if (!this.isPlaying) {
            this.play();
        }

        // Emit record start event
        eventBus.emit(EVENTS.TRANSPORT_RECORD_START, {
            bpm: this.currentBPM,
            timestamp: Date.now()
        });

        this.updateButtonStates();
        errorHandler.debug('Transport: Recording started');
    }

    /**
     * Stop recording
     */
    stopRecording() {
        if (!this.isRecording) return;

        this.isRecording = false;
        stateManager.setState('transport.isRecording', false);

        // Emit record stop event
        eventBus.emit(EVENTS.TRANSPORT_RECORD_STOP, {
            timestamp: Date.now()
        });

        this.updateButtonStates();
        errorHandler.debug('Transport: Recording stopped');
    }

    /**
     * Clear sequence
     */
    clearSequence() {
        // Emit clear sequence event
        eventBus.emit(EVENTS.SEQUENCE_CLEAR, {
            timestamp: Date.now()
        });

        errorHandler.debug('Transport: Sequence cleared');
    }

    /**
     * Handle BPM change
     * @param {string|number} value - New BPM value
     */
    handleBPMChange(value) {
        const bpm = parseInt(value, 10);
        
        if (isNaN(bpm) || bpm < 60 || bpm > 200) {
            errorHandler.warn(`Invalid BPM value: ${value}`);
            return;
        }

        if (bpm === this.currentBPM) return;

        this.currentBPM = bpm;
        stateManager.setState('transport.bpm', bpm);

        // Emit BPM change event
        eventBus.emit(EVENTS.TRANSPORT_BPM_CHANGE, {
            bpm: bpm,
            timestamp: Date.now()
        });

        errorHandler.debug(`Transport: BPM changed to ${bpm}`);
    }

    /**
     * Update button visual states
     */
    updateButtonStates() {
        const playButton = this.transportButtons.get('play');
        const recordButton = this.transportButtons.get('record');

        if (playButton) {
            if (this.isPlaying) {
                playButton.classList.add('active');
                const icon = playButton.querySelector('.button-icon');
                const label = playButton.querySelector('.button-label');
                if (icon) icon.textContent = '⏸️';
                if (label) label.textContent = 'Pause';
            } else {
                playButton.classList.remove('active');
                const icon = playButton.querySelector('.button-icon');
                const label = playButton.querySelector('.button-label');
                if (icon) icon.textContent = '▶️';
                if (label) label.textContent = 'Play';
            }
        }

        if (recordButton) {
            if (this.isRecording) {
                recordButton.classList.add('active');
            } else {
                recordButton.classList.remove('active');
            }
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (this.isTypingInInput(e.target)) return;

            switch (e.code) {
                case 'Space':
                    e.preventDefault();
                    this.handlePlayButton();
                    break;
                case 'KeyR':
                    if (!e.ctrlKey && !e.metaKey) {
                        e.preventDefault();
                        this.handleRecordButton();
                    }
                    break;
                case 'Escape':
                    e.preventDefault();
                    this.stop();
                    break;
            }
        });

        // Listen for state changes
        stateManager.subscribe('transport.isPlaying', (isPlaying) => {
            if (isPlaying !== this.isPlaying) {
                this.isPlaying = isPlaying;
                this.updateButtonStates();
            }
        });

        stateManager.subscribe('transport.isRecording', (isRecording) => {
            if (isRecording !== this.isRecording) {
                this.isRecording = isRecording;
                this.updateButtonStates();
            }
        });

        stateManager.subscribe('transport.bpm', (bpm) => {
            if (bpm !== this.currentBPM) {
                this.currentBPM = bpm;
                const bpmInput = document.getElementById('bpm-input');
                if (bpmInput) {
                    bpmInput.value = bpm;
                }
            }
        });

        // Listen for external transport events
        eventBus.on('transport:play', () => {
            if (!this.isPlaying) {
                this.play();
            }
        });

        eventBus.on('transport:stop', () => {
            if (this.isPlaying || this.isRecording) {
                this.stop();
            }
        });

        eventBus.on('transport:record', () => {
            if (!this.isRecording) {
                this.startRecording();
            } else {
                this.stopRecording();
            }
        });

        // Listen for MIDI transport events
        eventBus.on(EVENTS.MIDI_TRANSPORT, (data) => {
            switch (data.command) {
                case 'play':
                    this.play();
                    break;
                case 'stop':
                    this.stop();
                    break;
                case 'record':
                    this.handleRecordButton();
                    break;
            }
        });
    }

    /**
     * Check if user is typing in an input field
     * @param {Element} target - Event target
     * @returns {boolean} Is typing in input
     */
    isTypingInInput(target) {
        const inputTypes = ['INPUT', 'TEXTAREA', 'SELECT'];
        return inputTypes.includes(target.tagName) || target.contentEditable === 'true';
    }

    /**
     * Load transport state from state manager
     */
    loadTransportState() {
        const isPlaying = stateManager.getStateValue('transport.isPlaying');
        const isRecording = stateManager.getStateValue('transport.isRecording');
        const bpm = stateManager.getStateValue('transport.bpm');

        if (isPlaying !== undefined) {
            this.isPlaying = isPlaying;
        }

        if (isRecording !== undefined) {
            this.isRecording = isRecording;
        }

        if (bpm !== undefined) {
            this.currentBPM = bpm;
            const bpmInput = document.getElementById('bpm-input');
            if (bpmInput) {
                bpmInput.value = bpm;
            }
        }

        this.updateButtonStates();
    }

    /**
     * Get current transport state
     * @returns {Object} Transport state
     */
    getTransportState() {
        return {
            isPlaying: this.isPlaying,
            isRecording: this.isRecording,
            currentBPM: this.currentBPM,
            isInitialized: this.isInitialized
        };
    }

    /**
     * Set transport state
     * @param {Object} state - Transport state
     */
    setTransportState(state) {
        if (state.isPlaying !== undefined && state.isPlaying !== this.isPlaying) {
            if (state.isPlaying) {
                this.play();
            } else {
                this.pause();
            }
        }

        if (state.isRecording !== undefined && state.isRecording !== this.isRecording) {
            if (state.isRecording) {
                this.startRecording();
            } else {
                this.stopRecording();
            }
        }

        if (state.currentBPM !== undefined && state.currentBPM !== this.currentBPM) {
            this.handleBPMChange(state.currentBPM);
        }
    }

    /**
     * Cleanup transport UI
     */
    cleanup() {
        // Stop any active playback/recording
        this.stop();

        // Clear button references
        this.transportButtons.clear();

        this.isInitialized = false;
        errorHandler.info('Transport UI cleaned up');
    }
}

