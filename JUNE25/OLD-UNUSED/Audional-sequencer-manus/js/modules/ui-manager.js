/**
 * Audional Sequencer - UI Manager
 * 
 * Handles user interface components, modals, tooltips, and interactions
 */

import { EVENTS } from '../utils/event-bus.js';
import { createElement, clearElement, addEventListenerWithCleanup, debounce, throttle } from '../utils/helpers.js';

export default class UIManager {
    constructor(stateStore, eventBus) {
        this.stateStore = stateStore;
        this.eventBus = eventBus;
        
        // UI elements cache
        this.elements = new Map();
        this.cleanupFunctions = [];
        
        // Modal system
        this.currentModal = null;
        this.modalStack = [];
        
        // Tooltip system
        this.tooltip = null;
        this.tooltipTimeout = null;
        
        // Clipboard for copy/paste
        this.clipboard = null;
        
        // Bind methods
        this.init = this.init.bind(this);
        this.generateUI = this.generateUI.bind(this);
        this.showModal = this.showModal.bind(this);
        this.hideModal = this.hideModal.bind(this);
        this.showTooltip = this.showTooltip.bind(this);
        this.hideTooltip = this.hideTooltip.bind(this);
        this.showError = this.showError.bind(this);
        this.destroy = this.destroy.bind(this);
        
        // Debounced functions
        this.debouncedUpdateUI = debounce(this.updateUI.bind(this), 16); // ~60fps
        this.debouncedSaveState = debounce(this.saveUIState.bind(this), 1000);
    }

    /**
     * Initialize the UI manager
     */
    async init() {
        try {
            console.log('🎨 Initializing UI Manager...');
            
            this.cacheElements();
            this.setupEventListeners();
            this.setupStateSubscriptions();
            this.setupKeyboardShortcuts();
            this.setupTooltipSystem();
            
            console.log('✅ UI Manager initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize UI Manager:', error);
            throw error;
        }
    }

    /**
     * Cache frequently used DOM elements
     */
    cacheElements() {
        this.elements.set('app', document.getElementById('app'));
        this.elements.set('loadingScreen', document.getElementById('loading-screen'));
        this.elements.set('modalContainer', document.getElementById('modal-container'));
        this.elements.set('tooltip', document.getElementById('tooltip'));
        this.elements.set('fileInput', document.getElementById('file-input'));
        this.elements.set('channelsContainer', document.getElementById('channels-container'));
        this.elements.set('stepsContainer', document.querySelector('.steps-container'));
        this.elements.set('playBtn', document.getElementById('play-btn'));
        this.elements.set('stopBtn', document.getElementById('stop-btn'));
        this.elements.set('bpmInput', document.getElementById('bpm-input'));
        this.elements.set('bpmDisplay', document.querySelector('.bpm-display'));
        this.elements.set('currentSequence', document.getElementById('current-sequence'));
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Master controls
        this.setupMasterControls();
        
        // Sequence navigation
        this.setupSequenceNavigation();
        
        // Project controls
        this.setupProjectControls();
        
        // Modal system
        this.setupModalSystem();
        
        // File handling
        this.setupFileHandling();
    }

    /**
     * Set up master control event listeners
     */
    setupMasterControls() {
        const playBtn = this.elements.get('playBtn');
        const stopBtn = this.elements.get('stopBtn');
        const bpmInput = this.elements.get('bpmInput');
        
        if (playBtn) {
            this.cleanupFunctions.push(
                addEventListenerWithCleanup(playBtn, 'click', () => {
                    const state = this.stateStore.getState();
                    if (state.isPlaying) {
                        this.getSequencer()?.pause();
                    } else {
                        this.getSequencer()?.play();
                    }
                })
            );
        }
        
        if (stopBtn) {
            this.cleanupFunctions.push(
                addEventListenerWithCleanup(stopBtn, 'click', () => {
                    this.getSequencer()?.stop();
                })
            );
        }
        
        if (bpmInput) {
            this.cleanupFunctions.push(
                addEventListenerWithCleanup(bpmInput, 'input', debounce((e) => {
                    const bpm = parseInt(e.target.value);
                    if (!isNaN(bpm) && bpm >= 1 && bpm <= 420) {
                        this.stateStore.setState({ bpm });
                    }
                }, 300))
            );
        }
    }

    /**
     * Set up sequence navigation
     */
    setupSequenceNavigation() {
        const prevBtn = document.getElementById('prev-sequence');
        const nextBtn = document.getElementById('next-sequence');
        const copyBtn = document.getElementById('copy-sequence');
        const pasteBtn = document.getElementById('paste-sequence');
        const clearBtn = document.getElementById('clear-sequence');
        const continuousCheckbox = document.getElementById('continuous-playback');
        
        if (prevBtn) {
            this.cleanupFunctions.push(
                addEventListenerWithCleanup(prevBtn, 'click', () => {
                    const state = this.stateStore.getState();
                    const newSequence = Math.max(0, state.currentSequence - 1);
                    this.stateStore.setState({ currentSequence: newSequence });
                })
            );
        }
        
        if (nextBtn) {
            this.cleanupFunctions.push(
                addEventListenerWithCleanup(nextBtn, 'click', () => {
                    const state = this.stateStore.getState();
                    const newSequence = Math.min(63, state.currentSequence + 1);
                    this.stateStore.setState({ currentSequence: newSequence });
                })
            );
        }
        
        if (copyBtn) {
            this.cleanupFunctions.push(
                addEventListenerWithCleanup(copyBtn, 'click', () => {
                    const sequencer = this.getSequencer();
                    if (sequencer) {
                        this.clipboard = sequencer.copySequencePattern();
                    }
                })
            );
        }
        
        if (pasteBtn) {
            this.cleanupFunctions.push(
                addEventListenerWithCleanup(pasteBtn, 'click', () => {
                    const sequencer = this.getSequencer();
                    if (sequencer && this.clipboard) {
                        sequencer.pasteSequencePattern(this.clipboard);
                    }
                })
            );
        }
        
        if (clearBtn) {
            this.cleanupFunctions.push(
                addEventListenerWithCleanup(clearBtn, 'click', () => {
                    if (confirm('Clear all steps in current sequence?')) {
                        this.getSequencer()?.clearSequence();
                    }
                })
            );
        }
        
        if (continuousCheckbox) {
            this.cleanupFunctions.push(
                addEventListenerWithCleanup(continuousCheckbox, 'change', (e) => {
                    this.stateStore.setState({ continuousPlayback: e.target.checked });
                })
            );
        }
    }

    /**
     * Set up project controls
     */
    setupProjectControls() {
        const saveBtn = document.getElementById('save-btn');
        const loadBtn = document.getElementById('load-btn');
        const settingsBtn = document.getElementById('settings-btn');
        const helpBtn = document.getElementById('help-btn');
        
        if (saveBtn) {
            this.cleanupFunctions.push(
                addEventListenerWithCleanup(saveBtn, 'click', () => {
                    this.showSaveModal();
                })
            );
        }
        
        if (loadBtn) {
            this.cleanupFunctions.push(
                addEventListenerWithCleanup(loadBtn, 'click', () => {
                    this.showLoadModal();
                })
            );
        }
        
        if (settingsBtn) {
            this.cleanupFunctions.push(
                addEventListenerWithCleanup(settingsBtn, 'click', () => {
                    this.showSettingsModal();
                })
            );
        }
        
        if (helpBtn) {
            this.cleanupFunctions.push(
                addEventListenerWithCleanup(helpBtn, 'click', () => {
                    this.showHelpModal();
                })
            );
        }
    }

    /**
     * Set up modal system
     */
    setupModalSystem() {
        const modalContainer = this.elements.get('modalContainer');
        
        if (modalContainer) {
            // Close modal on backdrop click
            this.cleanupFunctions.push(
                addEventListenerWithCleanup(modalContainer, 'click', (e) => {
                    if (e.target.classList.contains('modal-backdrop')) {
                        this.hideModal();
                    }
                })
            );
            
            // Close modal on Escape key
            this.cleanupFunctions.push(
                addEventListenerWithCleanup(document, 'keydown', (e) => {
                    if (e.key === 'Escape' && this.currentModal) {
                        this.hideModal();
                    }
                })
            );
        }
    }

    /**
     * Set up file handling
     */
    setupFileHandling() {
        const fileInput = this.elements.get('fileInput');
        
        if (fileInput) {
            this.cleanupFunctions.push(
                addEventListenerWithCleanup(fileInput, 'change', (e) => {
                    const files = e.target.files;
                    if (files.length > 0) {
                        this.getSampleManager()?.handleFiles(files);
                    }
                    // Reset input
                    e.target.value = '';
                })
            );
        }
    }

    /**
     * Set up state subscriptions
     */
    setupStateSubscriptions() {
        // Playback state changes
        this.stateStore.subscribe('isPlaying', (isPlaying) => {
            this.updatePlayButton(isPlaying);
        });
        
        // BPM changes
        this.stateStore.subscribe('bpm', (bpm) => {
            this.updateBPMDisplay(bpm);
        });
        
        // Current sequence changes
        this.stateStore.subscribe('currentSequence', (sequence) => {
            this.updateSequenceDisplay(sequence);
        });
        
        // Current step changes
        this.stateStore.subscribe('currentStep', () => {
            this.debouncedUpdateUI();
        });
        
        // Theme changes
        this.stateStore.subscribe('currentTheme', (theme) => {
            document.documentElement.setAttribute('data-theme', theme);
        });
        
        // Modal state changes
        this.stateStore.subscribe('showModal', (showModal) => {
            if (!showModal && this.currentModal) {
                this.hideModal();
            }
        });
    }

    /**
     * Set up keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        this.cleanupFunctions.push(
            addEventListenerWithCleanup(document, 'keydown', (e) => {
                // Ignore if typing in input fields
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                    return;
                }
                
                switch (e.key) {
                    case ' ': // Spacebar - play/pause
                        e.preventDefault();
                        const state = this.stateStore.getState();
                        if (state.isPlaying) {
                            this.getSequencer()?.pause();
                        } else {
                            this.getSequencer()?.play();
                        }
                        break;
                        
                    case 'Escape': // Stop
                        this.getSequencer()?.stop();
                        break;
                        
                    case 'ArrowLeft': // Previous sequence
                        if (e.ctrlKey || e.metaKey) {
                            e.preventDefault();
                            const state = this.stateStore.getState();
                            const newSequence = Math.max(0, state.currentSequence - 1);
                            this.stateStore.setState({ currentSequence: newSequence });
                        }
                        break;
                        
                    case 'ArrowRight': // Next sequence
                        if (e.ctrlKey || e.metaKey) {
                            e.preventDefault();
                            const state = this.stateStore.getState();
                            const newSequence = Math.min(63, state.currentSequence + 1);
                            this.stateStore.setState({ currentSequence: newSequence });
                        }
                        break;
                        
                    case 'c': // Copy
                        if (e.ctrlKey || e.metaKey) {
                            e.preventDefault();
                            const sequencer = this.getSequencer();
                            if (sequencer) {
                                this.clipboard = sequencer.copySequencePattern();
                            }
                        }
                        break;
                        
                    case 'v': // Paste
                        if (e.ctrlKey || e.metaKey) {
                            e.preventDefault();
                            const sequencer = this.getSequencer();
                            if (sequencer && this.clipboard) {
                                sequencer.pasteSequencePattern(this.clipboard);
                            }
                        }
                        break;
                        
                    case 's': // Save
                        if (e.ctrlKey || e.metaKey) {
                            e.preventDefault();
                            this.showSaveModal();
                        }
                        break;
                        
                    case 'o': // Open
                        if (e.ctrlKey || e.metaKey) {
                            e.preventDefault();
                            this.showLoadModal();
                        }
                        break;
                }
            })
        );
    }

    /**
     * Set up tooltip system
     */
    setupTooltipSystem() {
        this.tooltip = this.elements.get('tooltip');
        
        // Add tooltip listeners to elements with data-tooltip
        this.cleanupFunctions.push(
            addEventListenerWithCleanup(document, 'mouseover', (e) => {
                const element = e.target.closest('[data-tooltip]');
                if (element) {
                    const text = element.getAttribute('data-tooltip');
                    this.showTooltip(text, e.clientX, e.clientY);
                }
            })
        );
        
        this.cleanupFunctions.push(
            addEventListenerWithCleanup(document, 'mouseout', (e) => {
                const element = e.target.closest('[data-tooltip]');
                if (element) {
                    this.hideTooltip();
                }
            })
        );
    }

    /**
     * Generate the main UI
     */
    async generateUI() {
        console.log('🎨 Generating UI...');
        
        this.generateStepHeader();
        this.generateChannelStrips();
        this.updateUI();
        
        console.log('✅ UI generated successfully');
    }

    /**
     * Generate step header
     */
    generateStepHeader() {
        const stepsContainer = this.elements.get('stepsContainer');
        if (!stepsContainer) return;
        
        clearElement(stepsContainer);
        
        for (let i = 0; i < 64; i++) {
            const stepNumber = createElement('div', {
                className: `step-number ${(i % 4 === 0) ? 'beat' : ''}`,
                'data-step': i,
                'data-tooltip': `Step ${i + 1}`
            }, (i + 1).toString());
            
            stepsContainer.appendChild(stepNumber);
        }
    }

    /**
     * Generate channel strips
     */
    generateChannelStrips() {
        const channelsContainer = this.elements.get('channelsContainer');
        if (!channelsContainer) return;
        
        clearElement(channelsContainer);
        
        for (let channelIndex = 0; channelIndex < 16; channelIndex++) {
            const channelStrip = this.createChannelStrip(channelIndex);
            channelsContainer.appendChild(channelStrip);
        }
    }

    /**
     * Create a channel strip
     * @param {number} channelIndex - Channel index
     * @returns {Element} - Channel strip element
     */
    createChannelStrip(channelIndex) {
        const state = this.stateStore.getState();
        const channel = state.sequences[state.currentSequence].channels[channelIndex];
        
        // Channel strip container
        const channelStrip = createElement('div', {
            className: `channel-strip ${channel.muted ? 'muted' : ''} ${channel.solo ? 'solo' : ''}`,
            'data-channel': channelIndex
        });
        
        // Channel info section
        const channelInfo = createElement('div', { className: 'channel-info' });
        
        // Channel number
        const channelNumber = createElement('div', {
            className: 'channel-number'
        }, (channelIndex + 1).toString());
        
        // Channel name (editable)
        const channelName = createElement('input', {
            type: 'text',
            className: 'channel-name',
            value: channel.name,
            'data-tooltip': 'Click to rename channel'
        });
        
        channelName.addEventListener('change', (e) => {
            this.stateStore.setState({
                [`sequences.${state.currentSequence}.channels.${channelIndex}.name`]: e.target.value
            });
        });
        
        // Channel controls
        const channelControls = createElement('div', { className: 'channel-controls' });
        
        // Mute button
        const muteBtn = createElement('button', {
            className: `channel-btn mute-btn ${channel.muted ? 'active' : ''}`,
            'data-tooltip': 'Mute channel'
        }, 'M');
        
        muteBtn.addEventListener('click', () => {
            this.stateStore.setState({
                [`sequences.${state.currentSequence}.channels.${channelIndex}.muted`]: !channel.muted
            });
        });
        
        // Solo button
        const soloBtn = createElement('button', {
            className: `channel-btn solo-btn ${channel.solo ? 'active' : ''}`,
            'data-tooltip': 'Solo channel'
        }, 'S');
        
        soloBtn.addEventListener('click', () => {
            this.stateStore.setState({
                [`sequences.${state.currentSequence}.channels.${channelIndex}.solo`]: !channel.solo
            });
        });
        
        // Settings button
        const settingsBtn = createElement('button', {
            className: 'channel-btn settings-btn',
            'data-tooltip': 'Channel settings'
        }, '⚙');
        
        settingsBtn.addEventListener('click', () => {
            this.showChannelSettingsModal(channelIndex);
        });
        
        channelControls.appendChild(muteBtn);
        channelControls.appendChild(soloBtn);
        channelControls.appendChild(settingsBtn);
        
        channelInfo.appendChild(channelNumber);
        channelInfo.appendChild(channelName);
        channelInfo.appendChild(channelControls);
        
        // Steps grid
        const stepsGrid = createElement('div', { className: 'steps-grid' });
        
        for (let stepIndex = 0; stepIndex < 64; stepIndex++) {
            const stepButton = createElement('button', {
                className: `step-button ${channel.steps[stepIndex] ? 'active' : ''} ${(stepIndex % 4 === 0) ? 'beat' : ''}`,
                'data-channel': channelIndex,
                'data-step': stepIndex,
                'data-tooltip': `Channel ${channelIndex + 1}, Step ${stepIndex + 1}`
            });
            
            stepButton.addEventListener('click', () => {
                this.getSequencer()?.toggleStep(channelIndex, stepIndex);
            });
            
            stepsGrid.appendChild(stepButton);
        }
        
        channelStrip.appendChild(channelInfo);
        channelStrip.appendChild(stepsGrid);
        
        return channelStrip;
    }

    /**
     * Update UI elements
     */
    updateUI() {
        this.updateChannelStrips();
        this.updateStepButtons();
    }

    /**
     * Update channel strips
     */
    updateChannelStrips() {
        const state = this.stateStore.getState();
        const currentSequence = state.sequences[state.currentSequence];
        
        document.querySelectorAll('.channel-strip').forEach((strip, channelIndex) => {
            const channel = currentSequence.channels[channelIndex];
            
            // Update mute/solo classes
            strip.classList.toggle('muted', channel.muted);
            strip.classList.toggle('solo', channel.solo);
            
            // Update channel name
            const nameInput = strip.querySelector('.channel-name');
            if (nameInput && nameInput.value !== channel.name) {
                nameInput.value = channel.name;
            }
            
            // Update button states
            const muteBtn = strip.querySelector('.mute-btn');
            const soloBtn = strip.querySelector('.solo-btn');
            
            if (muteBtn) {
                muteBtn.classList.toggle('active', channel.muted);
            }
            
            if (soloBtn) {
                soloBtn.classList.toggle('active', channel.solo);
            }
        });
    }

    /**
     * Update step buttons
     */
    updateStepButtons() {
        const state = this.stateStore.getState();
        const currentSequence = state.sequences[state.currentSequence];
        
        document.querySelectorAll('.step-button').forEach((button) => {
            const channelIndex = parseInt(button.getAttribute('data-channel'));
            const stepIndex = parseInt(button.getAttribute('data-step'));
            
            if (currentSequence.channels[channelIndex]) {
                const isActive = currentSequence.channels[channelIndex].steps[stepIndex];
                button.classList.toggle('active', isActive);
            }
        });
    }

    /**
     * Update play button state
     * @param {boolean} isPlaying - Whether playback is active
     */
    updatePlayButton(isPlaying) {
        const playBtn = this.elements.get('playBtn');
        if (playBtn) {
            playBtn.classList.toggle('active', isPlaying);
            const btnText = playBtn.querySelector('.btn-text');
            const btnIcon = playBtn.querySelector('.btn-icon');
            
            if (btnText) {
                btnText.textContent = isPlaying ? 'Pause' : 'Play';
            }
            
            if (btnIcon) {
                btnIcon.textContent = isPlaying ? '⏸' : '▶';
            }
        }
    }

    /**
     * Update BPM display
     * @param {number} bpm - BPM value
     */
    updateBPMDisplay(bpm) {
        const bpmInput = this.elements.get('bpmInput');
        const bpmDisplay = this.elements.get('bpmDisplay');
        
        if (bpmInput && bpmInput.value !== bpm.toString()) {
            bpmInput.value = bpm;
        }
        
        if (bpmDisplay) {
            bpmDisplay.textContent = bpm;
        }
    }

    /**
     * Update sequence display
     * @param {number} sequence - Sequence number
     */
    updateSequenceDisplay(sequence) {
        const currentSequence = this.elements.get('currentSequence');
        if (currentSequence) {
            currentSequence.textContent = sequence + 1;
        }
        
        // Regenerate channel strips for new sequence
        this.generateChannelStrips();
    }

    /**
     * Show modal
     * @param {string} type - Modal type
     * @param {Object} data - Modal data
     */
    showModal(type, data = {}) {
        const modalContainer = this.elements.get('modalContainer');
        if (!modalContainer) return;
        
        // Hide current modal if exists
        if (this.currentModal) {
            this.hideModal();
        }
        
        this.currentModal = { type, data };
        
        // Generate modal content based on type
        let modalContent;
        switch (type) {
            case 'channelSettings':
                modalContent = this.createChannelSettingsModal(data.channelIndex);
                break;
            case 'save':
                modalContent = this.createSaveModal();
                break;
            case 'load':
                modalContent = this.createLoadModal();
                break;
            case 'settings':
                modalContent = this.createSettingsModal();
                break;
            case 'help':
                modalContent = this.createHelpModal();
                break;
            case 'error':
                modalContent = this.createErrorModal(data.message, data.context);
                break;
            default:
                console.warn(`Unknown modal type: ${type}`);
                return;
        }
        
        // Insert modal content
        const modalContentEl = modalContainer.querySelector('.modal-content');
        clearElement(modalContentEl);
        modalContentEl.appendChild(modalContent);
        
        // Show modal
        modalContainer.classList.remove('hidden');
        
        // Update state
        this.stateStore.setState({ 
            showModal: true, 
            modalType: type, 
            modalData: data 
        });
        
        this.eventBus.emit(EVENTS.MODAL_OPENED, { type, data });
    }

    /**
     * Hide modal
     */
    hideModal() {
        const modalContainer = this.elements.get('modalContainer');
        if (!modalContainer) return;
        
        modalContainer.classList.add('hidden');
        this.currentModal = null;
        
        // Update state
        this.stateStore.setState({ 
            showModal: false, 
            modalType: null, 
            modalData: null 
        });
        
        this.eventBus.emit(EVENTS.MODAL_CLOSED);
    }

    /**
     * Show tooltip
     * @param {string} text - Tooltip text
     * @param {number} x - X position
     * @param {number} y - Y position
     */
    showTooltip(text, x, y) {
        if (!this.tooltip) return;
        
        clearTimeout(this.tooltipTimeout);
        
        this.tooltipTimeout = setTimeout(() => {
            const tooltipContent = this.tooltip.querySelector('.tooltip-content');
            if (tooltipContent) {
                tooltipContent.textContent = text;
            }
            
            this.tooltip.style.left = `${x + 10}px`;
            this.tooltip.style.top = `${y - 30}px`;
            this.tooltip.classList.remove('hidden');
            
            this.eventBus.emit(EVENTS.TOOLTIP_SHOW, { text, x, y });
        }, 500); // 500ms delay
    }

    /**
     * Hide tooltip
     */
    hideTooltip() {
        clearTimeout(this.tooltipTimeout);
        
        if (this.tooltip) {
            this.tooltip.classList.add('hidden');
        }
        
        this.eventBus.emit(EVENTS.TOOLTIP_HIDE);
    }

    /**
     * Show error message
     * @param {string} message - Error message
     * @param {string} context - Error context
     */
    showError(message, context = 'Error') {
        this.showModal('error', { message, context });
    }

    /**
     * Show channel settings modal
     * @param {number} channelIndex - Channel index
     */
    showChannelSettingsModal(channelIndex) {
        this.showModal('channelSettings', { channelIndex });
    }

    /**
     * Show save modal
     */
    showSaveModal() {
        this.showModal('save');
    }

    /**
     * Show load modal
     */
    showLoadModal() {
        this.showModal('load');
    }

    /**
     * Show settings modal
     */
    showSettingsModal() {
        this.showModal('settings');
    }

    /**
     * Show help modal
     */
    showHelpModal() {
        this.showModal('help');
    }

    /**
     * Create channel settings modal content
     * @param {number} channelIndex - Channel index
     * @returns {Element} - Modal content element
     */
    createChannelSettingsModal(channelIndex) {
        const state = this.stateStore.getState();
        const channel = state.sequences[state.currentSequence].channels[channelIndex];
        
        return createElement('div', { className: 'modal-dialog channel-settings' }, 
            createElement('div', { className: 'modal-header' },
                createElement('h2', {}, `Channel ${channelIndex + 1} Settings`),
                createElement('button', { 
                    className: 'modal-close',
                    onclick: () => this.hideModal()
                }, '×')
            ),
            createElement('div', { className: 'modal-body' },
                // Volume control
                createElement('div', { className: 'control-group' },
                    createElement('label', {}, 'Volume'),
                    createElement('input', {
                        type: 'range',
                        min: '0',
                        max: '1',
                        step: '0.01',
                        value: channel.volume,
                        oninput: (e) => {
                            this.stateStore.setState({
                                [`sequences.${state.currentSequence}.channels.${channelIndex}.volume`]: parseFloat(e.target.value)
                            });
                        }
                    })
                ),
                // Pitch control
                createElement('div', { className: 'control-group' },
                    createElement('label', {}, 'Pitch'),
                    createElement('input', {
                        type: 'range',
                        min: '0.25',
                        max: '4',
                        step: '0.01',
                        value: channel.pitch,
                        oninput: (e) => {
                            this.stateStore.setState({
                                [`sequences.${state.currentSequence}.channels.${channelIndex}.pitch`]: parseFloat(e.target.value)
                            });
                        }
                    })
                ),
                // Sample loading
                createElement('div', { className: 'control-group' },
                    createElement('label', {}, 'Sample'),
                    createElement('button', {
                        onclick: () => {
                            const fileInput = this.elements.get('fileInput');
                            if (fileInput) {
                                fileInput.click();
                            }
                        }
                    }, 'Load Sample')
                )
            )
        );
    }

    /**
     * Create error modal content
     * @param {string} message - Error message
     * @param {string} context - Error context
     * @returns {Element} - Modal content element
     */
    createErrorModal(message, context) {
        return createElement('div', { className: 'modal-dialog error-modal' },
            createElement('div', { className: 'modal-header' },
                createElement('h2', {}, context),
                createElement('button', { 
                    className: 'modal-close',
                    onclick: () => this.hideModal()
                }, '×')
            ),
            createElement('div', { className: 'modal-body' },
                createElement('p', {}, message)
            ),
            createElement('div', { className: 'modal-footer' },
                createElement('button', {
                    className: 'btn btn-primary',
                    onclick: () => this.hideModal()
                }, 'OK')
            )
        );
    }

    /**
     * Save UI state
     */
    saveUIState() {
        // Save UI-specific state like theme, layout preferences, etc.
        this.debouncedSaveState();
    }

    /**
     * Get sequencer instance
     * @returns {Sequencer|null} - Sequencer instance
     */
    getSequencer() {
        if (window.AudionalSequencer) {
            return window.AudionalSequencer.getModule('sequencer');
        }
        return null;
    }

    /**
     * Get sample manager instance
     * @returns {SampleManager|null} - Sample manager instance
     */
    getSampleManager() {
        if (window.AudionalSequencer) {
            return window.AudionalSequencer.getModule('SampleManager');
        }
        return null;
    }

    /**
     * Destroy UI manager and clean up
     */
    destroy() {
        console.log('🧹 Destroying UI Manager...');
        
        // Clean up event listeners
        this.cleanupFunctions.forEach(cleanup => {
            try {
                cleanup();
            } catch (error) {
                console.error('Error during UI cleanup:', error);
            }
        });
        
        // Clear timeouts
        clearTimeout(this.tooltipTimeout);
        
        // Hide modal
        this.hideModal();
        
        // Clear clipboard
        this.clipboard = null;
        
        console.log('✅ UI Manager destroyed');
    }
}

