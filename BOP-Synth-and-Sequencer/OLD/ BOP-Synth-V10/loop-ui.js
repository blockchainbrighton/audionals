/**
 * @file loop-ui.js
 * @description UI controls for the LoopManager. Refactored to be a class
 * that communicates via the central event bus.
 */

export class LoopUI {
    constructor(eventBus) {
        console.log('[LoopUI] Initializing loop controls...');
        this.eventBus = eventBus;
        this.elements = {};

        this.createUI();
        this.bindUIToEvents();
        this.listenToSystemEvents();
    }

    createUI() {
        const el = id => document.getElementById(id);
        const container = el('loop-controls');
        if (!container) {
            console.error('[LoopUI] Loop controls container not found');
            return;
        }

        // The original HTML structure is used here.
        container.innerHTML = `
            <div class="loop-panel">
                <div class="loop-section" style="display:flex;gap:32px;">
                    <div class="loop-toggle-section">
                        <label class="loop-checkbox-label">
                            <input type="checkbox" id="loopEnabled" class="loop-checkbox">
                            <span class="loop-checkbox-text">Enable Loop</span>
                        </label>
                        <div class="loop-status" id="loopStatus">Loop: Disabled</div>
                    </div>
                    <div class="quantize-toggle-section">
                        <label class="loop-checkbox-label">
                            <input type="checkbox" id="quantizeEnabled" class="loop-checkbox">
                            <span class="loop-checkbox-text">Enable Quantization</span>
                        </label>
                    </div>
                </div>
                <div id="loopSettingsSection" style="display:none">
                    <div class="loop-section">
                        <h4 class="loop-section-title">Loop Boundaries</h4>
                        <div class="loop-bounds-controls">
                            <div class="loop-bound-control">
                                <label for="loopStart">Start (s):</label>
                                <input type="number" id="loopStart" min="0" step="0.1" value="0" class="loop-input">
                            </div>
                            <div class="loop-bound-control">
                                <label for="loopEnd">End (s):</label>
                                <input type="number" id="loopEnd" min="0" step="0.1" value="4" class="loop-input">
                            </div>
                            <button id="autoDetectBounds" class="loop-button">Auto-Detect</button>
                        </div>
                    </div>
                </div>
                <div id="quantizeSettingsSection" style="display:none">
                    <div class="loop-section">
                        <h4 class="loop-section-title">Quantization Settings</h4>
                        <div class="quantize-controls">
                            <div class="quantize-grid-control">
                                <label for="quantizeGrid">Grid:</label>
                                <select id="quantizeGrid" class="loop-select">
                                    <option value="whole">Whole Note</option>
                                    <option value="half">Half Note</option>
                                    <option value="quarter">Quarter Note</option>
                                    <option value="eighth">Eighth Note</option>
                                    <option value="sixteenth">Sixteenth Note</option>
                                    <option value="thirtysecond" selected>Thirty-second Note</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Cache DOM elements for reuse
        this.elements = {
            loopEnabled: el('loopEnabled'),
            loopStatus: el('loopStatus'),
            loopStart: el('loopStart'),
            loopEnd: el('loopEnd'),
            autoDetectBounds: el('autoDetectBounds'),
            quantizeEnabled: el('quantizeEnabled'),
            quantizeGrid: el('quantizeGrid'),
            loopSettingsSection: el('loopSettingsSection'),
            quantizeSettingsSection: el('quantizeSettingsSection')
        };
    }

    /**
     * Binds UI element interactions to dispatch events on the event bus.
     * This decouples the UI from the logic modules.
     */
    bindUIToEvents() {
        const els = this.elements;
        const dispatch = (name, detail) => this.eventBus.dispatchEvent(new CustomEvent(name, { detail }));

        this._on(els.loopEnabled, 'change', () => dispatch('loop-toggle'));
        this._on(els.quantizeEnabled, 'change', e => dispatch('quantize-toggle', { enabled: e.target.checked }));
        this._on(els.autoDetectBounds, 'click', () => dispatch('loop-auto-detect'));
        
        const updateBounds = () => dispatch('loop-bounds-set', { start: +els.loopStart.value, end: +els.loopEnd.value });
        this._on(els.loopStart, 'change', updateBounds);
        this._on(els.loopEnd, 'change', updateBounds);
        
        this._on(els.quantizeGrid, 'change', e => {
            const gridKey = e.target.value;
            // The logic for converting key to value should be in LoopManager
            dispatch('quantize-grid-set', { gridKey });
        });
    }

    /**
     * Listens for state change events from the system to keep the UI in sync.
     */
    listenToSystemEvents() {
        // LoopManager will dispatch this event with its current status
        this.eventBus.addEventListener('loop-state-update', e => this.updateUI(e.detail));
    }
    
    /**
     * Centralized function to update all UI elements from a state object.
     * @param {object} status - The complete status object from LoopManager.
     */
    updateUI(status) {
        if (!status) return;
        const { elements: els } = this;
        
        els.loopEnabled.checked = status.enabled;
        els.quantizeEnabled.checked = status.quantizeEnabled;
        
        this._toggleSection(els.loopSettingsSection, status.enabled);
        this._toggleSection(els.quantizeSettingsSection, status.quantizeEnabled);

        els.loopStart.value = status.start.toFixed(1);
        els.loopEnd.value = status.end.toFixed(1);

        if (status.enabled) {
            const stateText = status.active ? 'Active' : 'Ready';
            els.loopStatus.textContent = `Loop: ${stateText} (${status.duration.toFixed(1)}s)`;
            els.loopStatus.className = `loop-status ${status.active ? 'active' : 'ready'}`;
        } else {
            els.loopStatus.textContent = 'Loop: Disabled';
            els.loopStatus.className = 'loop-status disabled';
        }
        
        // Ensure the dropdown reflects the actual state
        const gridKey = this.getQuantizeGridKey(status.quantizeGridValue);
        if (els.quantizeGrid.value !== gridKey) {
            els.quantizeGrid.value = gridKey;
        }
    }
    
    // Helper methods
    _on(el, ev, fn) { if (el) el.addEventListener(ev, fn); }
    _toggleSection(el, show) { if (el) el.style.display = show ? '' : 'none'; }
    getQuantizeGridKey(value) {
        const keyMap = { 4: 'whole', 2: 'half', 1: 'quarter', 0.5: 'eighth', 0.25: 'sixteenth', 0.125: 'thirtysecond' };
        return keyMap[value] || 'thirtysecond';
    }
}