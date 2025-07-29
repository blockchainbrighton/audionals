/**
 * @file Transport.js
 * @description Transport UI component for the BOP Synthesizer.
 * Refactored to use event-driven communication instead of direct module calls.
 */

export class Transport {
    constructor(transportSelector, eventBus) {
        this.transportSelector = transportSelector;
        this.eventBus = eventBus;
        
        this.buttons = {};
        this.transportElement = null;
        
        this.init();
    }
    
    init() {
        console.log('[Transport] Transport controls initializing...');

        this.transportElement = document.querySelector(this.transportSelector);
        if (!this.transportElement) {
            console.error(`[Transport] Container element ${this.transportSelector} not found.`);
            return;
        }

        this.createButtons();
        this.setupEventListeners();
        this.wireUpButtonEvents();
        
        console.log('[Transport] Transport controls initialized.');
    }
    
    createButtons() {
        // Create the buttons in the DOM - including save/load buttons
        this.transportElement.innerHTML = `
            <button id="recordBtn" class="transport-button record-btn"><span>●</span>Record</button>
            <button id="stopBtn" class="transport-button stop-btn" disabled><span>■</span>Stop</button>
            <button id="playBtn" class="transport-button play-btn" disabled><span>▶</span>Play</button>
            <button id="clearBtn" class="transport-button clear-btn"><span>🗑</span>Clear</button>
            <button id="saveBtn" class="transport-button save-button"><span>💾</span>Save State</button>
            <button id="loadBtn" class="transport-button load-button"><span>📁</span>Load State</button>
            <input type="file" id="loadFileInput" accept=".synthstate,.json" style="display: none;">
            <div id="saveLoadStatus" class="save-load-status" style="display: none;"></div>
        `;

        // Get references to the newly created buttons
        this.buttons = {
            record: document.getElementById('recordBtn'),
            stop: document.getElementById('stopBtn'),
            play: document.getElementById('playBtn'),
            clear: document.getElementById('clearBtn'),
            save: document.getElementById('saveBtn'),
            load: document.getElementById('loadBtn')
        };
    }
    
    setupEventListeners() {
        // Listen for transport state updates
        this.eventBus.addEventListener('transport-state-update', (e) => {
            const { isRecording, isArmed, isPlaying, hasSequence } = e.detail;
            this.updateButtonStates(isRecording, isArmed, isPlaying, hasSequence);
        });
        
        // Listen for recording state changes
        this.eventBus.addEventListener('recording-state-changed', (e) => {
            const { isRecording, isArmed, isPlaying, hasSequence } = e.detail;
            this.updateButtonStates(isRecording, isArmed, isPlaying, hasSequence);
        });
    }
    
    wireUpButtonEvents() {
        const { record, stop, play, clear, save, load } = this.buttons;
        
        if (record) {
            record.onclick = () => {
                this.eventBus.dispatchEvent(new CustomEvent('transport-record'));
            };
        }
        
        if (stop) {
            stop.onclick = () => {
                this.eventBus.dispatchEvent(new CustomEvent('transport-stop'));
            };
        }
        
        if (play) {
            play.onclick = () => {
                this.eventBus.dispatchEvent(new CustomEvent('transport-play'));
            };
        }
        
        if (clear) {
            clear.onclick = () => {
                this.eventBus.dispatchEvent(new CustomEvent('transport-clear'));
            };
        }
        
        // Wire up save/load buttons
        if (save) {
            save.onclick = () => {
                this.eventBus.dispatchEvent(new CustomEvent('save-project'));
            };
        }
        
        if (load) {
            load.onclick = () => {
                this.eventBus.dispatchEvent(new CustomEvent('load-project-trigger'));
            };
        }
        
        // Wire up file input for loading
        const loadFileInput = document.getElementById('loadFileInput');
        if (loadFileInput) {
            loadFileInput.addEventListener('change', (e) => {
                const file = e.target.files?.[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = (event) => {
                    this.eventBus.dispatchEvent(new CustomEvent('load-project', {
                        detail: { data: event.target.result }
                    }));
                };
                reader.onerror = () => {
                    this.eventBus.dispatchEvent(new CustomEvent('status-update', {
                        detail: { message: 'Failed to read file', type: 'error' }
                    }));
                };
                reader.readAsText(file);
                e.target.value = '';
            });
        }
        
        // Global keyboard shortcuts for save/load
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && !e.repeat) {
                if (e.key === 's') { 
                    e.preventDefault(); 
                    this.eventBus.dispatchEvent(new CustomEvent('save-project'));
                }
                if (e.key === 'o') { 
                    e.preventDefault(); 
                    this.eventBus.dispatchEvent(new CustomEvent('load-project-trigger'));
                }
            }
        });
    }
    
    /**
     * Trigger file load dialog
     */
    triggerLoad() {
        const loadFileInput = document.getElementById('loadFileInput');
        if (loadFileInput) {
            loadFileInput.click();
        }
    }
    
    /**
     * Update button states based on current transport state
     */
    updateButtonStates(isRecording = false, isArmed = false, isPlaying = false, hasSequence = false) {
        const { record, play, stop, clear } = this.buttons;
        if (!record) return; // Exit if buttons aren't created yet

        let statusText = 'Inactive';
        
        // --- Button State Logic ---
        if (play) play.disabled = !hasSequence || isRecording || isPlaying;
        if (clear) clear.disabled = !hasSequence || isRecording;
        if (stop) stop.disabled = !isPlaying && !isRecording;
        if (record) record.disabled = isPlaying; // Can't arm/record while playing

        // --- Record Button Style & Status Text ---
        if (record) {
            record.classList.remove('armed');
            if (isRecording) {
                statusText = 'Recording...';
                record.classList.add('armed');
            } else if (isPlaying) {
                statusText = 'Playing...';
            } else if (isArmed) {
                statusText = 'Armed';
                record.classList.add('armed');
            } else if (hasSequence) {
                statusText = 'Stopped';
            }
        }
        
        // Update the status indicator in the status bar
        this.updateStatusIndicators(statusText, isRecording, isPlaying);
        
        console.log(`[Transport] Button states updated: Recording=${isRecording}, Armed=${isArmed}, Playing=${isPlaying}, HasSequence=${hasSequence}`);
    }
    
    /**
     * Update status indicators
     */
    updateStatusIndicators(statusText, isRecording, isPlaying) {
        const recStatEl = document.getElementById('recStat');
        const recIndEl = document.getElementById('recInd');
        
        if (recStatEl) {
            recStatEl.textContent = 'Status: ' + statusText;
        }
        
        if (recIndEl) {
            recIndEl.classList.toggle('active', isRecording || isPlaying);
        }
        
        // Emit status update event
        this.eventBus.dispatchEvent(new CustomEvent('status-update', {
            detail: { message: `Status: ${statusText}`, type: 'info' }
        }));
    }
    
    /**
     * Get current button states (for debugging/testing)
     */
    getButtonStates() {
        const { record, play, stop, clear } = this.buttons;
        return {
            record: { disabled: record?.disabled, armed: record?.classList.contains('armed') },
            play: { disabled: play?.disabled },
            stop: { disabled: stop?.disabled },
            clear: { disabled: clear?.disabled }
        };
    }
    
    /**
     * Cleanup method
     */
    destroy() {
        if (this.transportElement) {
            this.transportElement.innerHTML = '';
        }
        this.buttons = {};
        // Event listeners will be cleaned up when eventBus is destroyed
    }
}

export default Transport;

