/**
 * @file loop-ui.js
 * @description UI controls for the LoopManager. Accepts a container element
 * and communicates via the central event bus.
 */

export class LoopUI {
    constructor(containerElement, eventBus) {
        console.log('[LoopUI] Initializing loop controls...');
        this.container = containerElement;
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
        // Provide full controls for both loop and quantize sections
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
                <div id="loopSettingsSection" style="display:none; margin-top:16px;">
                    <label>
                        Start:
                        <input type="number" id="loopStart" min="0" step="0.01" value="0" style="width: 60px;">
                    </label>
                    <label>
                        End:
                        <input type="number" id="loopEnd" min="0" step="0.01" value="4" style="width: 60px;">
                    </label>
                    <button id="autoDetectBounds" type="button">Auto-Detect</button>
                </div>
                <div id="quantizeSettingsSection" style="display:none; margin-top:16px;">
                    <label>
                        Quantize Grid:
                        <select id="quantizeGrid">
                            <option value="whole">Whole Note (1)</option>
                            <option value="half">Half Note (1/2)</option>
                            <option value="quarter">Quarter Note (1/4)</option>
                            <option value="eighth">Eighth Note (1/8)</option>
                            <option value="sixteenth">Sixteenth Note (1/16)</option>
                            <option value="thirtysecond">Thirty-Second (1/32)</option>
                        </select>
                    </label>
                </div>
            </div>
        `;

        // Only query for controls now guaranteed in the DOM
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

    bindUIToEvents() {
        const els = this.elements;
        const dispatch = (name, detail) => this.eventBus.dispatchEvent(new CustomEvent(name, { detail }));
    
        // FIX: Dispatch the correct event 'loop-toggle-enabled' and include the checkbox state.
        if (els.loopEnabled) {
            this._on(els.loopEnabled, 'change', e => dispatch('loop-toggle-enabled', { enabled: e.target.checked }));
        }
    
        if (els.quantizeEnabled) this._on(els.quantizeEnabled, 'change', e => dispatch('quantize-toggle', { enabled: e.target.checked }));
        
        if (els.autoDetectBounds) this._on(els.autoDetectBounds, 'click', () => dispatch('loop-auto-detect'));
        
        // Only send when changed, for both fields
        const updateBounds = () => {
            if (!isNaN(+els.loopStart.value) && !isNaN(+els.loopEnd.value)) {
                dispatch('loop-bounds-set', { start: +els.loopStart.value, end: +els.loopEnd.value });
            }
        };
        if (els.loopStart) this._on(els.loopStart, 'change', updateBounds);
        if (els.loopEnd) this._on(els.loopEnd, 'change', updateBounds);
    
        if (els.quantizeGrid) this._on(els.quantizeGrid, 'change', e => {
            dispatch('quantize-grid-set', { gridKey: e.target.value });
        });
    }

    listenToSystemEvents() {
        this.eventBus.addEventListener('loop-state-update', e => this.updateUI(e.detail));
    }

    updateUI(status) {
        if (!status) return;
        const { elements: els } = this;
        
        if (els.loopEnabled) els.loopEnabled.checked = !!status.enabled;
        if (els.quantizeEnabled) els.quantizeEnabled.checked = !!status.quantizeEnabled;

        this._toggleSection(els.loopSettingsSection, status.enabled);
        this._toggleSection(els.quantizeSettingsSection, status.quantizeEnabled);

        if (els.loopStart && !isNaN(status.start)) els.loopStart.value = status.start.toFixed(2);
        if (els.loopEnd && !isNaN(status.end)) els.loopEnd.value = status.end.toFixed(2);

        if (els.loopStatus) {
            if (status.enabled) {
                const stateText = status.active ? 'Active' : 'Ready';
                els.loopStatus.textContent = `Loop: ${stateText} (${(status.duration ?? 0).toFixed(2)}s)`;
                els.loopStatus.className = `loop-status ${status.active ? 'active' : 'ready'}`;
            } else {
                els.loopStatus.textContent = 'Loop: Disabled';
                els.loopStatus.className = 'loop-status disabled';
            }
        }

        if (els.quantizeGrid) {
            const gridKey = this.getQuantizeGridKey(status.quantizeGridValue);
            if (els.quantizeGrid.value !== gridKey) els.quantizeGrid.value = gridKey;
        }
    }

    // --- Helpers ---
    _on(el, ev, fn) { if (el) el.addEventListener(ev, fn); }
    _toggleSection(el, show) { if (el) el.style.display = show ? '' : 'none'; }
    getQuantizeGridKey(value) {
        const keyMap = { 4: 'whole', 2: 'half', 1: 'quarter', 0.5: 'eighth', 0.25: 'sixteenth', 0.125: 'thirtysecond' };
        return keyMap[value] || 'thirtysecond';
    }
}

