// controls-ui.js - UI controls and parameter management (Part 1)
// Dependencies: EnvelopeManager, AudioSafety, EnhancedEffects, LoopManager

const EnhancedControls = {
    init() {
        window.EnvelopeManager?.init();
        window.AudioSafety?.init();

        const panel = document.getElementById('control-panel');
        if (panel) {
            panel.innerHTML = this.panelHTML();
            this.setupToggles(panel);
            this.setupEffects(panel);
            this.setupAudioSafety(panel);
            this.setupEnvelope(panel);
            this.setupOscillator(panel);
            this.updateAllDisplayValues();
        }

        window.EnhancedEffects?.init();
    },

    panelHTML() {
        // Helper for composing control groups
        const group = (title, id, content, expanded = false) =>
            `<div class="control-group">
            <div class="group-title-row" id="${id}_title_row">
                <input type="checkbox" id="${id}_toggle" class="group-toggle" ${expanded ? "checked" : ""} />
                <h3 style="margin:0;flex:1 1 auto;">${title}</h3>
            </div>
            <div id="${id}_content" class="group-content${expanded ? "" : " group-content-collapsed"}">
                ${content}
            </div>
        </div>`;

        // All control blocks
        return `<div class="control-panel">
        ${group('Audio Safety', 'audio', `
            <div class="control-row">
                <span class="control-label">Master Volume</span>
                <input type="range" id="masterVolume" min="0" max="1" step="0.01" value="0.7">
                <input type="number" id="masterVolumeInput" min="0" max="1" step="0.01" value="0.7" style="width:58px; margin-left:7px;">
                <span class="control-value" id="masterVolumeVal">70%</span>
            </div>
            <div class="control-row">
                <span class="control-label">Limiter Threshold</span>
                <input type="range" id="limiterThreshold" min="-20" max="0" step="0.1" value="-3">
                <input type="number" id="limiterThresholdInput" min="-20" max="0" step="0.1" value="-3" style="width:62px; margin-left:7px;">
                <span class="control-value" id="limiterThresholdVal">-3dB</span>
            </div>
            <div class="control-row">
                <span class="control-label" id="voiceCount">Voices: 0/16</span>
                <button id="emergencyStop" class="emergency-button">Emergency Stop</button>
            </div>
        `)}
        ${group('Envelope (ADSR)', 'env', `
            <div class="control-row"><span class="control-label">Preset</span>
            <select id="envelopePreset">
                <option value="">Custom</option>
                <option value="piano">Piano</option>
                <option value="organ">Organ</option>
                <option value="strings">Strings</option>
                <option value="brass">Brass</option>
                <option value="pad">Pad</option>
                <option value="pluck">Pluck</option>
                <option value="bass">Bass</option>
            </select></div>
            <div class="control-row"><span class="control-label">Attack</span>
            <input type="range" id="envelopeAttack" min="0.001" max="5" step="0.001" value="0.01">
            <input type="number" id="envelopeAttackInput" min="0.001" max="5" step="0.001" value="0.01" style="width:65px; margin-left:7px;">
            <span class="control-value" id="envelopeAttackVal">0.010</span></div>
            <div class="control-row"><span class="control-label">Decay</span>
            <input type="range" id="envelopeDecay" min="0.001" max="5" step="0.001" value="0.1">
            <input type="number" id="envelopeDecayInput" min="0.001" max="5" step="0.001" value="0.1" style="width:65px; margin-left:7px;">
            <span class="control-value" id="envelopeDecayVal">0.100</span></div>
            <div class="control-row"><span class="control-label">Sustain</span>
            <input type="range" id="envelopeSustain" min="0" max="1" step="0.01" value="0.7">
            <input type="number" id="envelopeSustainInput" min="0" max="1" step="0.01" value="0.7" style="width:58px; margin-left:7px;">
            <span class="control-value" id="envelopeSustainVal">0.70</span></div>
            <div class="control-row"><span class="control-label">Release</span>
            <input type="range" id="envelopeRelease" min="0.001" max="5" step="0.001" value="0.3">
            <input type="number" id="envelopeReleaseInput" min="0.001" max="5" step="0.001" value="0.3" style="width:65px; margin-left:7px;">
            <span class="control-value" id="envelopeReleaseVal">0.300</span></div>
        `)}
        ${group('Oscillator', 'osc', `
            <div class="control-row">
                <span class="control-label">Waveform</span>
                <select id="waveform"><option>sine</option><option>square</option><option>sawtooth</option><option>triangle</option></select>
            </div>
            <div class="control-row">
                <span class="control-label">Detune</span>
                <input type="range" id="detune" min="-50" max="50" value="0">
                <input type="number" id="detuneInput" min="-50" max="50" value="0" style="width:58px; margin-left:7px;">
                <span class="control-value" id="detuneVal">0</span>
            </div>
        `)}
        ${group('BPM', 'bpm', `<div class="control-row"><span class="control-label">BPM</span><input type="number" id="bpm" min="40" max="240" value="120"></div>`)}
    </div>`;
    },

    // Setup helpers
    setupToggles(panel) {
        for (const id of ['audio','env','osc','bpm']) {
            const toggle = panel.querySelector(`#${id}_toggle`);
            const content = panel.querySelector(`#${id}_content`);
            if (!toggle || !content) continue;
            content.classList.toggle('group-content-collapsed', !toggle.checked);
            toggle.addEventListener('change', () =>
                content.classList.toggle('group-content-collapsed', !toggle.checked)
            );
            panel.querySelector(`#${id}_title_row`)?.addEventListener('click', e => {
                if (e.target !== toggle) {
                    toggle.checked = !toggle.checked;
                    toggle.dispatchEvent(new Event('change'));
                }
            });
        }
    },

    setupEffects(panel) {
        // Basic effect setup - extended in controls-effects.js
        console.log('[EnhancedControls] Basic effects setup completed');
    },

    setupAudioSafety(panel) {
        // Master volume control
        this.setupSliderControl('masterVolume', 'masterVolumeInput', 'masterVolumeVal', 
            v => {
                window.AudioSafety?.setMasterVolume(v);
                return Math.round(v * 100) + '%';
            });

        // Limiter threshold control
        this.setupSliderControl('limiterThreshold', 'limiterThresholdInput', 'limiterThresholdVal',
            v => {
                window.AudioSafety?.setLimiterThreshold(v);
                return v + 'dB';
            });

        // Emergency stop button
        const emergencyBtn = document.getElementById('emergencyStop');
        if (emergencyBtn) {
            emergencyBtn.onclick = () => window.AudioSafety?.emergencyStop();
        }
    },

    setupEnvelope(panel) {
        // Envelope preset selector
        const presetSelect = document.getElementById('envelopePreset');
        if (presetSelect) {
            presetSelect.onchange = (e) => {
                if (e.target.value) {
                    window.EnvelopeManager?.loadPreset(e.target.value);
                }
            };
        }

        // ADSR controls
        this.setupSliderControl('envelopeAttack', 'envelopeAttackInput', 'envelopeAttackVal',
            v => {
                window.EnvelopeManager?.setParameter('attack', v);
                return v.toFixed(3);
            });

        this.setupSliderControl('envelopeDecay', 'envelopeDecayInput', 'envelopeDecayVal',
            v => {
                window.EnvelopeManager?.setParameter('decay', v);
                return v.toFixed(3);
            });

        this.setupSliderControl('envelopeSustain', 'envelopeSustainInput', 'envelopeSustainVal',
            v => {
                window.EnvelopeManager?.setParameter('sustain', v);
                return v.toFixed(2);
            });

        this.setupSliderControl('envelopeRelease', 'envelopeReleaseInput', 'envelopeReleaseVal',
            v => {
                window.EnvelopeManager?.setParameter('release', v);
                return v.toFixed(3);
            });
    },

    setupOscillator(panel) {
        // Waveform selector
        const waveformSelect = document.getElementById('waveform');
        if (waveformSelect) {
            waveformSelect.onchange = (e) => {
                if (window.synthApp?.synth) {
                    window.synthApp.synth.set({ oscillator: { type: e.target.value } });
                }
            };
        }

        // Detune control
        this.setupSliderControl('detune', 'detuneInput', 'detuneVal',
            v => {
                if (window.synthApp?.synth) {
                    window.synthApp.synth.set({ detune: v });
                }
                return v.toString();
            });
    },

    // Utility method for setting up slider controls
    setupSliderControl(sliderId, inputId, valueId, callback) {
        const slider = document.getElementById(sliderId);
        const input = document.getElementById(inputId);
        const valueDisplay = document.getElementById(valueId);

        const updateValue = (value) => {
            const result = callback(parseFloat(value));
            if (valueDisplay && result !== undefined) {
                valueDisplay.textContent = result;
            }
        };

        if (slider) {
            slider.oninput = (e) => {
                updateValue(e.target.value);
                if (input) input.value = e.target.value;
            };
        }

        if (input) {
            input.oninput = (e) => {
                updateValue(e.target.value);
                if (slider) slider.value = e.target.value;
            };
        }
    },

    updateAllDisplayValues() {
        // Update all display values to match current state
        const updateIfExists = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        };

        // Update audio safety displays
        if (window.AudioSafety) {
            const stats = window.AudioSafety.getAudioStats?.();
            if (stats) {
                updateIfExists('masterVolumeVal', Math.round(stats.masterVolume * 100) + '%');
                updateIfExists('limiterThresholdVal', stats.limiterThreshold + 'dB');
            }
        }

        // Update envelope displays
        if (window.EnvelopeManager) {
            const env = window.EnvelopeManager.getSettings?.();
            if (env) {
                updateIfExists('envelopeAttackVal', env.attack?.toFixed(3));
                updateIfExists('envelopeDecayVal', env.decay?.toFixed(3));
                updateIfExists('envelopeSustainVal', env.sustain?.toFixed(2));
                updateIfExists('envelopeReleaseVal', env.release?.toFixed(3));
            }
        }

        console.log('[EnhancedControls] All display values updated');
    }
};

// Loop UI Controls
const LoopUI = {
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
            window.LoopManager?.setLoopEnabled(e.target.checked);
            this._toggleSection(els.loopSettingsSection, e.target.checked);
            this.updateLoopStatus();
        });
        this._on(els.quantizeEnabled, 'change', e => {
            window.LoopManager?.setQuantization(e.target.checked, window.LoopManager?.quantizeGrid);
            this._toggleSection(els.quantizeSettingsSection, e.target.checked);
        });
        this._on(els.loopStart, 'change', e => window.LoopManager?.setLoopBounds(+e.target.value, +els.loopEnd.value));
        this._on(els.loopEnd, 'change', e => window.LoopManager?.setLoopBounds(+els.loopStart.value, +e.target.value));
        this._on(els.autoDetectBounds, 'click', () => {
            const b = window.LoopManager?.autoDetectLoopBounds();
            if (b) {
                els.loopStart.value = b.start.toFixed(1);
                els.loopEnd.value = b.end.toFixed(1);
            }
        });
        this._on(els.maxLoops, 'change', e => window.LoopManager?.setMaxLoops(+e.target.value));
        this._on(els.quantizeGrid, 'change', e => window.LoopManager?.setQuantizationGrid(e.target.value));
        this._on(els.swingAmount, 'input', e => {
            const v = +e.target.value;
            window.LoopManager?.setSwing(v / 100);
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
        window.LoopManager?.setTempoConversion(orig, tgt);
        tempoRatio.textContent = `Ratio: ${(tgt / orig).toFixed(2)}x`;
    },

    updateLoopStatus() {
        const { loopStatus } = this.elements;
        const s = window.LoopManager?.getLoopStatus();
        if (!s) return;
        
        if (s.enabled) {
            loopStatus.textContent = s.active ? `Loop: Active (${s.duration.toFixed(1)}s)` : `Loop: Ready (${s.duration.toFixed(1)}s)`;
            loopStatus.className = `loop-status ${s.active ? 'active' : 'ready'}`;
        } else {
            loopStatus.textContent = 'Loop: Disabled';
            loopStatus.className = 'loop-status disabled';
        }
    },

    updateUI() {
        const e = this.elements, m = window.LoopManager;
        if (!m) return;
        
        e.loopEnabled.checked = m.isLoopEnabled;
        this._toggleSection(e.loopSettingsSection, m.isLoopEnabled);
        e.quantizeEnabled.checked = m.quantizeEnabled;
        this._toggleSection(e.quantizeSettingsSection, m.quantizeEnabled);
        e.loopStart.value = m.loopStart.toFixed(1);
        e.loopEnd.value = m.loopEnd.toFixed(1);
        e.maxLoops.value = m.maxLoops.toString();
        e.quantizeGrid.value = m.getQuantizeGridKey?.() || 'thirtysecond';
        e.swingAmount.value = (m.swingAmount * 100).toString();
        e.swingValue.textContent = (m.swingAmount * 100).toFixed(0) + '%';
        e.originalTempo.value = m.originalTempo.toString();
        e.targetTempo.value = m.targetTempo.toString();
        this.updateLoopStatus();
        this.updateTempoConversion();
    },

    onPlaybackStateChange() { this.updateLoopStatus(); }
};

// Export modules for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EnhancedControls, LoopUI };
} else {
    window.EnhancedControls = EnhancedControls;
    window.LoopUI = LoopUI;
}

