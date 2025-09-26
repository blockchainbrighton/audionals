/**
 * @file loop-ui.js
 * @description UI controls for the LoopManager. Refactored to accept a container element
 * and communicate via the central event bus.
 */

export class LoopUI {
    constructor(containerElement, eventBus) {
        console.log('[LoopUI] Initializing loop controls...');
        this.container = containerElement; // Accepts the direct element
        this.eventBus = eventBus;
        this.elements = {};

        if (!this.container) {
            console.error('[LoopUI] A valid container element was not provided.');
            return;
        }

        this.createUI();
        this.bindUIToEvents();
        this.listenToSystemEvents();
    }

    createUI() {
        // --- FIX: Build UI inside the provided container ---
        this.container.innerHTML = `
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
                    <!-- ... rest of your inner HTML for loop settings ... -->
                </div>
                <div id="quantizeSettingsSection" style="display:none">
                    <!-- ... rest of your inner HTML for quantize settings ... -->
                </div>
            </div>
        `;
        
        // --- FIX: Scope element lookups to the container ---
        const el = id => this.container.querySelector(`#${id}`);
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