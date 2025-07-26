/**
 * UIManager - Main UI management and coordination
 * Handles tab switching, modal dialogs, and overall UI state
 */
import { stateManager } from '../core/StateManager.js';
import { eventBus, EVENTS } from '../core/EventBus.js';
import { errorHandler } from '../core/ErrorHandler.js';
import { DOMUtils } from '../utils/DOMUtils.js';

export class UIManager {
    constructor() {
        this.activeTab = 'synthesizer';
        this.modals = new Map();
        this.isInitialized = false;
        this.updateThrottle = DOMUtils.throttle(this.updateUI.bind(this), 16); // 60fps
    }

    /**
     * Initialize the UI manager
     * @returns {Promise<boolean>} Success
     */
    async initialize() {
        if (this.isInitialized) {
            return true;
        }

        try {
            this.setupTabNavigation();
            this.setupModalSystem();
            this.setupStatusBar();
            this.setupEventListeners();
            this.loadUIState();
            
            this.isInitialized = true;
            errorHandler.info('UI Manager initialized');
            return true;
            
        } catch (error) {
            errorHandler.handleUIError(error, {
                operation: 'initialize',
                context: 'UIManager.initialize'
            });
            return false;
        }
    }

    /**
     * Setup tab navigation system
     */
    setupTabNavigation() {
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabContents = document.querySelectorAll('.tab-content');

        tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const tabId = button.dataset.tab;
                this.switchTab(tabId);
            });
        });

        // Keyboard shortcuts for tabs
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case '1':
                        e.preventDefault();
                        this.switchTab('synthesizer');
                        break;
                    case '2':
                        e.preventDefault();
                        this.switchTab('effects');
                        break;
                    case '3':
                        e.preventDefault();
                        this.switchTab('sequencer');
                        break;
                    case '4':
                        e.preventDefault();
                        this.switchTab('settings');
                        break;
                }
            }
        });
    }

    /**
     * Switch to a different tab
     * @param {string} tabId - Tab identifier
     */
    switchTab(tabId) {
        if (this.activeTab === tabId) return;

        const tabButtons = document.querySelectorAll('.tab-button');
        const tabContents = document.querySelectorAll('.tab-content');

        // Update button states
        tabButtons.forEach(button => {
            if (button.dataset.tab === tabId) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });

        // Update content visibility
        tabContents.forEach(content => {
            if (content.id === tabId) {
                content.classList.add('active');
            } else {
                content.classList.remove('active');
            }
        });

        this.activeTab = tabId;
        stateManager.setState('ui.activeTab', tabId);
        eventBus.emit(EVENTS.UI_TAB_CHANGED, { tabId });

        // Trigger tab-specific updates
        this.handleTabSwitch(tabId);

        errorHandler.debug(`Switched to tab: ${tabId}`);
    }

    /**
     * Handle tab-specific logic when switching
     * @param {string} tabId - Tab identifier
     */
    handleTabSwitch(tabId) {
        switch (tabId) {
            case 'synthesizer':
                // Refresh keyboard display
                eventBus.emit('ui:refresh-keyboard');
                break;
                
            case 'effects':
                // Update effects panels
                eventBus.emit('ui:refresh-effects');
                break;
                
            case 'sequencer':
                // Refresh piano roll
                eventBus.emit('ui:refresh-piano-roll');
                break;
                
            case 'settings':
                // Update settings panels
                eventBus.emit('ui:refresh-settings');
                break;
        }
    }

    /**
     * Setup modal dialog system
     */
    setupModalSystem() {
        const modalOverlay = document.getElementById('modal-overlay');
        
        if (modalOverlay) {
            modalOverlay.addEventListener('click', (e) => {
                if (e.target === modalOverlay) {
                    this.closeModal();
                }
            });
        }

        // ESC key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
        });
    }

    /**
     * Show a modal dialog
     * @param {string} title - Modal title
     * @param {string|HTMLElement} content - Modal content
     * @param {Object} options - Modal options
     */
    showModal(title, content, options = {}) {
        const { 
            width = 'auto', 
            height = 'auto', 
            closable = true,
            className = ''
        } = options;

        const modalOverlay = document.getElementById('modal-overlay');
        const modalContent = document.getElementById('modal-content');

        if (!modalOverlay || !modalContent) {
            errorHandler.warn('Modal elements not found');
            return;
        }

        // Create modal structure
        modalContent.innerHTML = '';
        modalContent.className = `modal-content ${className}`;
        
        if (width !== 'auto') modalContent.style.width = width;
        if (height !== 'auto') modalContent.style.height = height;

        // Header
        const header = DOMUtils.createElement('div', { className: 'modal-header' });
        const titleElement = DOMUtils.createElement('h3', { className: 'modal-title' }, title);
        header.appendChild(titleElement);

        if (closable) {
            const closeButton = DOMUtils.createElement('button', {
                className: 'modal-close',
                onclick: () => this.closeModal()
            }, '×');
            header.appendChild(closeButton);
        }

        // Body
        const body = DOMUtils.createElement('div', { className: 'modal-body' });
        if (typeof content === 'string') {
            body.innerHTML = content;
        } else if (content instanceof HTMLElement) {
            body.appendChild(content);
        }

        modalContent.appendChild(header);
        modalContent.appendChild(body);

        // Show modal
        modalOverlay.classList.remove('hidden');
        modalContent.focus();

        errorHandler.debug(`Modal opened: ${title}`);
    }

    /**
     * Close the current modal
     */
    closeModal() {
        const modalOverlay = document.getElementById('modal-overlay');
        if (modalOverlay) {
            modalOverlay.classList.add('hidden');
            errorHandler.debug('Modal closed');
        }
    }

    /**
     * Setup status bar updates
     */
    setupStatusBar() {
        // Audio status
        eventBus.on(EVENTS.AUDIO_CONTEXT_READY, () => {
            this.updateStatus('audio', 'ready', 'Audio: Ready');
        });

        // MIDI status
        eventBus.on(EVENTS.MIDI_CONNECTED, (device) => {
            this.updateStatus('midi', 'connected', `MIDI: ${device.name}`);
        });

        eventBus.on(EVENTS.MIDI_DISCONNECTED, () => {
            this.updateStatus('midi', 'disconnected', 'MIDI: Not connected');
        });

        // Performance monitoring
        eventBus.on('audio:performance-update', (stats) => {
            this.updateStatus('performance', 'active', `CPU: ${Math.round(stats.cpuUsage)}%`);
            this.updateVoiceCount(stats.voicesActive);
        });

        // Voice count updates
        stateManager.subscribe('audio.voiceCount', (count) => {
            this.updateVoiceCount(count);
        });
    }

    /**
     * Update status indicator
     * @param {string} type - Status type (audio, midi, performance)
     * @param {string} state - Status state (ready, connected, etc.)
     * @param {string} text - Status text
     */
    updateStatus(type, state, text) {
        const indicator = document.getElementById(`${type}-status`);
        const textElement = document.getElementById(`${type}-status-text`);

        if (indicator) {
            indicator.className = `status-indicator ${state}`;
        }

        if (textElement) {
            textElement.textContent = text;
        }
    }

    /**
     * Update voice count display
     * @param {number} activeVoices - Number of active voices
     */
    updateVoiceCount(activeVoices) {
        const voiceCountElement = document.getElementById('voice-count');
        const maxVoices = stateManager.getStateValue('audio.maxVoices') || 16;
        
        if (voiceCountElement) {
            voiceCountElement.textContent = `Voices: ${activeVoices}/${maxVoices}`;
            
            // Add warning class if approaching limit
            if (activeVoices >= maxVoices * 0.8) {
                voiceCountElement.classList.add('warning');
            } else {
                voiceCountElement.classList.remove('warning');
            }
        }
    }

    /**
     * Show a notification message
     * @param {string} message - Message text
     * @param {string} type - Message type (info, warning, error)
     * @param {number} duration - Display duration in ms
     */
    showNotification(message, type = 'info', duration = 3000) {
        const notification = DOMUtils.createElement('div', {
            className: `notification notification-${type}`
        });

        const messageElement = DOMUtils.createElement('span', {
            className: 'notification-message'
        }, message);

        const closeButton = DOMUtils.createElement('button', {
            className: 'notification-close',
            onclick: () => notification.remove()
        }, '×');

        notification.appendChild(messageElement);
        notification.appendChild(closeButton);

        // Add to page
        document.body.appendChild(notification);

        // Auto-remove after duration
        if (duration > 0) {
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, duration);
        }

        errorHandler.debug(`Notification shown: ${type} - ${message}`);
    }

    /**
     * Update UI elements (throttled)
     */
    updateUI() {
        // Update any dynamic UI elements here
        // This method is called at 60fps max
    }

    /**
     * Load UI state from state manager
     */
    loadUIState() {
        const activeTab = stateManager.getStateValue('ui.activeTab');
        if (activeTab && activeTab !== this.activeTab) {
            this.switchTab(activeTab);
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for state changes
        stateManager.subscribe('ui.activeTab', (tabId) => {
            if (tabId !== this.activeTab) {
                this.switchTab(tabId);
            }
        });

        // Listen for UI events
        eventBus.on('ui:show-notification', (data) => {
            this.showNotification(data.message, data.type, data.duration);
        });

        eventBus.on('ui:show-modal', (data) => {
            this.showModal(data.title, data.content, data.options);
        });

        eventBus.on('ui:close-modal', () => {
            this.closeModal();
        });

        // Window resize handling
        window.addEventListener('resize', DOMUtils.throttle(() => {
            eventBus.emit('ui:window-resize', {
                width: window.innerWidth,
                height: window.innerHeight
            });
        }, 100));

        // Visibility change handling
        document.addEventListener('visibilitychange', () => {
            eventBus.emit('ui:visibility-change', {
                hidden: document.hidden
            });
        });

        // Footer button handlers
        this.setupFooterButtons();
    }

    /**
     * Setup footer button handlers
     */
    setupFooterButtons() {
        const aboutButton = document.getElementById('about-button');
        const helpButton = document.getElementById('help-button');
        const debugButton = document.getElementById('debug-button');

        if (aboutButton) {
            aboutButton.addEventListener('click', () => {
                this.showAboutModal();
            });
        }

        if (helpButton) {
            helpButton.addEventListener('click', () => {
                this.showHelpModal();
            });
        }

        if (debugButton) {
            debugButton.addEventListener('click', () => {
                this.showDebugModal();
            });
        }
    }

    /**
     * Show about modal
     */
    showAboutModal() {
        const content = `
            <div class="about-content">
                <h4>Enhanced Web Synthesizer v7.0</h4>
                <p>Advanced polyphonic synthesizer with modular architecture</p>
                <ul>
                    <li>Modular audio processing engine</li>
                    <li>Advanced effects chain with LFO modulation</li>
                    <li>Real-time MIDI support</li>
                    <li>Piano roll sequencer</li>
                    <li>Preset management system</li>
                </ul>
                <p><strong>Built with:</strong> Web Audio API, ES6 Modules</p>
                <p><strong>Architecture:</strong> Event-driven, state-managed, dependency-injected</p>
            </div>
        `;
        this.showModal('About', content);
    }

    /**
     * Show help modal
     */
    showHelpModal() {
        const content = `
            <div class="help-content">
                <h4>Keyboard Shortcuts</h4>
                <ul>
                    <li><kbd>Ctrl+1</kbd> - Synthesizer tab</li>
                    <li><kbd>Ctrl+2</kbd> - Effects tab</li>
                    <li><kbd>Ctrl+3</kbd> - Sequencer tab</li>
                    <li><kbd>Ctrl+4</kbd> - Settings tab</li>
                    <li><kbd>Space</kbd> - Play/Stop</li>
                    <li><kbd>R</kbd> - Record</li>
                    <li><kbd>Esc</kbd> - Close modal</li>
                </ul>
                <h4>Mouse Controls</h4>
                <ul>
                    <li>Click keyboard keys to play notes</li>
                    <li>Drag sliders to adjust parameters</li>
                    <li>Click panel headers to expand/collapse</li>
                </ul>
            </div>
        `;
        this.showModal('Help', content);
    }

    /**
     * Show debug modal
     */
    showDebugModal() {
        const errorStats = errorHandler.getErrorStats();
        const performanceStats = stateManager.getStateValue('audio.performanceStats') || {};
        
        const content = `
            <div class="debug-content">
                <h4>System Status</h4>
                <table class="debug-table">
                    <tr><td>Audio Context State:</td><td>${window.debug?.audioEngine?.context?.state || 'Unknown'}</td></tr>
                    <tr><td>Sample Rate:</td><td>${window.debug?.audioEngine?.getSampleRate() || 'Unknown'} Hz</td></tr>
                    <tr><td>Active Voices:</td><td>${stateManager.getStateValue('audio.voiceCount') || 0}</td></tr>
                    <tr><td>Total Errors:</td><td>${errorStats.total}</td></tr>
                    <tr><td>Recent Errors:</td><td>${errorStats.recent}</td></tr>
                </table>
                <h4>Actions</h4>
                <button onclick="window.debug?.errorHandler?.clearErrors()" class="debug-button">Clear Errors</button>
                <button onclick="console.log(window.debug?.stateManager?.getState())" class="debug-button">Log State</button>
                <button onclick="window.debug?.errorHandler?.exportErrors()" class="debug-button">Export Errors</button>
            </div>
        `;
        this.showModal('Debug Information', content);
    }

    /**
     * Get current UI state
     * @returns {Object} UI state
     */
    getUIState() {
        return {
            activeTab: this.activeTab,
            isInitialized: this.isInitialized
        };
    }
}

