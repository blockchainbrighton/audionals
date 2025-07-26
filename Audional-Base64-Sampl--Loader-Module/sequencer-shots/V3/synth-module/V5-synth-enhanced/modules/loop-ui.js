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
        const container = document.getElementById('loop-controls');
        if (!container) {
            console.error('[LoopUI] Loop controls container not found');
            return;
        }
        container.innerHTML = `
            <div class="loop-panel">
                <div class="loop-section" style="display: flex; gap: 32px;">
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
                        <select id="quantizeGrid" class="loop-select" style="margin-left:12px;width:auto;">
                            <option value="1">Whole Note</option>
                            <option value="0.5">Half Note</option>
                            <option value="0.25">Quarter Note</option>
                            <option value="0.125">Eighth Note</option>
                            <option value="0.0625">Sixteenth Note</option>
                            <option value="0.03125">Thirty-second Note</option>
                        </select>
                    </div>
                </div>
                <!-- ... rest unchanged ... -->
        `;

        // Store element references
        this.elements = {
            loopEnabled: document.getElementById('loopEnabled'),
            loopStatus: document.getElementById('loopStatus'),
            loopStart: document.getElementById('loopStart'),
            loopEnd: document.getElementById('loopEnd'),
            autoDetectBounds: document.getElementById('autoDetectBounds'),
            maxLoops: document.getElementById('maxLoops'),
            quantizeEnabled: document.getElementById('quantizeEnabled'),
            quantizeGrid: document.getElementById('quantizeGrid'),
            swingAmount: document.getElementById('swingAmount'),
            swingValue: document.getElementById('swingValue'),
            originalTempo: document.getElementById('originalTempo'),
            targetTempo: document.getElementById('targetTempo'),
            tempoRatio: document.getElementById('tempoRatio'),
            loopSettingsSection: document.getElementById('loopSettingsSection'),
            quantizeSettingsSection: document.getElementById('quantizeSettingsSection')
        };

        // Ensure quantize grid dropdown is set to 1/32 by default on first render
        this.elements.quantizeGrid.value = "0.03125";
    },

    bindEvents() {
        // Loop enable/disable
        this.elements.loopEnabled.addEventListener('change', (e) => {
            LoopManager.setLoopEnabled(e.target.checked);
            this.toggleLoopSettingsSection(e.target.checked);
            this.updateLoopStatus();
        });

        // Quantize enable/disable (checkbox controls both state and grid value)
        this.elements.quantizeEnabled.addEventListener('change', (e) => {
            if (e.target.checked) {
                LoopManager.setQuantization(true, 0.03125); // 1/32 default
            } else {
                LoopManager.setQuantization(false, null);
            }
            this.updateQuantUI();
        });

        // Quantize grid dropdown (only active when quantize enabled)
        this.elements.quantizeGrid.addEventListener('change', (e) => {
            if (this.elements.quantizeEnabled.checked) {
                LoopManager.setQuantization(true, Number(e.target.value));
            }
            this.updateQuantUI();
        });

        // Loop boundaries
        this.elements.loopStart.addEventListener('change', (e) => {
            const start = parseFloat(e.target.value);
            const end = parseFloat(this.elements.loopEnd.value);
            LoopManager.setLoopBounds(start, end);
        });
        this.elements.loopEnd.addEventListener('change', (e) => {
            const start = parseFloat(this.elements.loopStart.value);
            const end = parseFloat(e.target.value);
            LoopManager.setLoopBounds(start, end);
        });

        // Auto-detect bounds
        this.elements.autoDetectBounds.addEventListener('click', () => {
            const bounds = LoopManager.autoDetectLoopBounds();
            this.elements.loopStart.value = bounds.start.toFixed(1);
            this.elements.loopEnd.value = bounds.end.toFixed(1);
        });

        // Max loops
        this.elements.maxLoops.addEventListener('change', (e) => {
            const maxLoops = parseInt(e.target.value);
            LoopManager.setMaxLoops(maxLoops);
        });

        // Swing (quantize settings section)
        this.elements.swingAmount.addEventListener('input', (e) => {
            const swingAmount = parseInt(e.target.value) / 100;
            LoopManager.setSwing(swingAmount);
            this.elements.swingValue.textContent = e.target.value + '%';
        });

        // Tempo conversion
        this.elements.originalTempo.addEventListener('change', () => this.updateTempoConversion());
        this.elements.targetTempo.addEventListener('change', () => this.updateTempoConversion());
    },

    toggleLoopSettingsSection(show) {
        if (this.elements.loopSettingsSection) {
            this.elements.loopSettingsSection.style.display = show ? '' : 'none';
        }
    },
    toggleQuantizeSettingsSection(show) {
        if (this.elements.quantizeSettingsSection) {
            this.elements.quantizeSettingsSection.style.display = show ? '' : 'none';
        }
    },

    updateTempoConversion() {
        const originalTempo = parseFloat(this.elements.originalTempo.value);
        const targetTempo = parseFloat(this.elements.targetTempo.value);
        LoopManager.setTempoConversion(originalTempo, targetTempo);
        const ratio = targetTempo / originalTempo;
        this.elements.tempoRatio.textContent = `Ratio: ${ratio.toFixed(2)}x`;
    },

    updateLoopStatus() {
        const status = LoopManager.getLoopStatus();
        if (status.enabled) {
            if (status.active) {
                this.elements.loopStatus.textContent = `Loop: Active (${status.duration.toFixed(1)}s)`;
                this.elements.loopStatus.className = 'loop-status active';
            } else {
                this.elements.loopStatus.textContent = `Loop: Ready (${status.duration.toFixed(1)}s)`;
                this.elements.loopStatus.className = 'loop-status ready';
            }
        } else {
            this.elements.loopStatus.textContent = 'Loop: Disabled';
            this.elements.loopStatus.className = 'loop-status disabled';
        }
    },

    updateQuantUI() {
        // Always reflect LoopManager's quant state (source of truth)
        this.elements.quantizeEnabled.checked = !!LoopManager.quantizeEnabled;
        this.elements.quantizeGrid.disabled = !LoopManager.quantizeEnabled;
        this.elements.quantizeGrid.value = String(
            LoopManager.quantizeGrid != null ? LoopManager.quantizeGrid : 0.03125
        );
        this.toggleQuantizeSettingsSection(LoopManager.quantizeEnabled);
    },

    updateUI() {
        // Sync toggles
        this.elements.loopEnabled.checked = LoopManager.isLoopEnabled;
        this.toggleLoopSettingsSection(LoopManager.isLoopEnabled);

        // Quantization UI always reflects LoopManager state
        this.updateQuantUI();

        // Loop
        this.elements.loopStart.value = LoopManager.loopStart.toFixed(1);
        this.elements.loopEnd.value = LoopManager.loopEnd.toFixed(1);
        this.elements.maxLoops.value = LoopManager.maxLoops.toString();

        // Swing
        this.elements.swingAmount.value = (LoopManager.swingAmount * 100).toString();
        this.elements.swingValue.textContent = (LoopManager.swingAmount * 100).toFixed(0) + '%';

        // Tempo
        this.elements.originalTempo.value = LoopManager.originalTempo.toString();
        this.elements.targetTempo.value = LoopManager.targetTempo.toString();
        this.updateLoopStatus();
        this.updateTempoConversion();
    },

    // Call when playback state changes
    onPlaybackStateChange() {
        this.updateLoopStatus();
    }
};
