// modules/loop-ui.js
import { LoopManager } from './loop.js';

export const LoopUI = {
    elements: {},

    init() {
        console.log('[LoopUI] Initializing loop controls...');
        this.createUI();
        this.bindEvents();
        this.updateUI();
    },

    createUI() {
        const el = id => document.getElementById(id);
        const container = el('loop-controls');
        if (!container) return console.error('[LoopUI] Loop controls container not found');

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
                    <div class="loop-section">
                        <h4 class="loop-section-title">Loop Settings</h4>
                        <div class="loop-settings-controls">
                            <div class="loop-setting-control">
                                <label for="maxLoops">Max Loops:</label>
                                <select id="maxLoops" class="loop-select">
                                    <option value="-1">Infinite</option>
                                    <option value="1">1</option>
                                    <option value="2">2</option>
                                    <option value="4">4</option>
                                    <option value="8">8</option>
                                    <option value="16">16</option>
                                </select>
                            </div>
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
                            <div class="swing-control">
                                <label for="swingAmount">Swing:</label>
                                <input type="range" id="swingAmount" min="0" max="100" value="0" class="loop-slider">
                                <span id="swingValue" class="loop-value">0%</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="loop-section">
                    <h4 class="loop-section-title">Tempo Conversion</h4>
                    <div class="tempo-controls">
                        <div class="tempo-control">
                            <label for="originalTempo">Original BPM:</label>
                            <input type="number" id="originalTempo" min="60" max="200" value="120" class="loop-input">
                        </div>
                        <div class="tempo-control">
                            <label for="targetTempo">Target BPM:</label>
                            <input type="number" id="targetTempo" min="60" max="200" value="120" class="loop-input">
                        </div>
                        <div class="tempo-ratio">
                            <span id="tempoRatio">Ratio: 1.00x</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        this.elements = {
            loopEnabled: el('loopEnabled'),
            loopStatus: el('loopStatus'),
            loopStart: el('loopStart'),
            loopEnd: el('loopEnd'),
            autoDetectBounds: el('autoDetectBounds'),
            maxLoops: el('maxLoops'),
            quantizeEnabled: el('quantizeEnabled'),
            quantizeGrid: el('quantizeGrid'),
            swingAmount: el('swingAmount'),
            swingValue: el('swingValue'),
            originalTempo: el('originalTempo'),
            targetTempo: el('targetTempo'),
            tempoRatio: el('tempoRatio'),
            loopSettingsSection: el('loopSettingsSection'),
            quantizeSettingsSection: el('quantizeSettingsSection')
        };
    },

    bindEvents() {
        const els = this.elements;
        this._on(els.loopEnabled, 'change', e => {
            LoopManager.setLoopEnabled(e.target.checked);
            this._toggleSection(els.loopSettingsSection, e.target.checked);
            this.updateLoopStatus();
        });
        this._on(els.quantizeEnabled, 'change', e => {
            LoopManager.setQuantization(e.target.checked, LoopManager.quantizeGrid);
            this._toggleSection(els.quantizeSettingsSection, e.target.checked);
        });
        this._on(els.loopStart, 'change', e => LoopManager.setLoopBounds(+e.target.value, +els.loopEnd.value));
        this._on(els.loopEnd, 'change', e => LoopManager.setLoopBounds(+els.loopStart.value, +e.target.value));
        this._on(els.autoDetectBounds, 'click', () => {
            const b = LoopManager.autoDetectLoopBounds();
            els.loopStart.value = b.start.toFixed(1);
            els.loopEnd.value = b.end.toFixed(1);
        });
        this._on(els.maxLoops, 'change', e => LoopManager.setMaxLoops(+e.target.value));
        this._on(els.quantizeGrid, 'change', e => LoopManager.setQuantizationGrid(e.target.value));
        this._on(els.swingAmount, 'input', e => {
            const v = +e.target.value;
            LoopManager.setSwing(v / 100);
            els.swingValue.textContent = `${v}%`;
        });
        this._on(els.originalTempo, 'change', () => this.updateTempoConversion());
        this._on(els.targetTempo, 'change', () => this.updateTempoConversion());
    },

    _on(el, ev, fn) { el && el.addEventListener(ev, fn); },
    _toggleSection(el, show) { el && (el.style.display = show ? '' : 'none'); },

    updateTempoConversion() {
        const { originalTempo, targetTempo, tempoRatio } = this.elements;
        const orig = +originalTempo.value, tgt = +targetTempo.value;
        LoopManager.setTempoConversion(orig, tgt);
        tempoRatio.textContent = `Ratio: ${(tgt / orig).toFixed(2)}x`;
    },

    updateLoopStatus() {
        const { loopStatus } = this.elements, s = LoopManager.getLoopStatus();
        if (s.enabled) {
            loopStatus.textContent = s.active ? `Loop: Active (${s.duration.toFixed(1)}s)` : `Loop: Ready (${s.duration.toFixed(1)}s)`;
            loopStatus.className = `loop-status ${s.active ? 'active' : 'ready'}`;
        } else {
            loopStatus.textContent = 'Loop: Disabled';
            loopStatus.className = 'loop-status disabled';
        }
    },

    updateUI() {
        const e = this.elements, m = LoopManager;
        e.loopEnabled.checked = m.isLoopEnabled;
        this._toggleSection(e.loopSettingsSection, m.isLoopEnabled);
        e.quantizeEnabled.checked = m.quantizeEnabled;
        this._toggleSection(e.quantizeSettingsSection, m.quantizeEnabled);
        e.loopStart.value = m.loopStart.toFixed(1);
        e.loopEnd.value = m.loopEnd.toFixed(1);
        e.maxLoops.value = m.maxLoops.toString();
        e.quantizeGrid.value = m.getQuantizeGridKey();
        e.swingAmount.value = (m.swingAmount * 100).toString();
        e.swingValue.textContent = (m.swingAmount * 100).toFixed(0) + '%';
        e.originalTempo.value = m.originalTempo.toString();
        e.targetTempo.value = m.targetTempo.toString();
        this.updateLoopStatus();
        this.updateTempoConversion();
    },

    onPlaybackStateChange() { this.updateLoopStatus(); }
};
