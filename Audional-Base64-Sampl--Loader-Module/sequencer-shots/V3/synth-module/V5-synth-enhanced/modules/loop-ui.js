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
                <h3 class="loop-title">Loop Controls</h3>
                
                <div class="loop-section">
                    <div class="loop-toggle-section">
                        <label class="loop-checkbox-label">
                            <input type="checkbox" id="loopEnabled" class="loop-checkbox">
                            <span class="loop-checkbox-text">Enable Loop</span>
                        </label>
                        <div class="loop-status" id="loopStatus">Loop: Disabled</div>
                    </div>
                </div>
                
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
                
                <div class="loop-section">
                    <h4 class="loop-section-title">Quantization</h4>
                    <div class="quantize-controls">
                        <label class="loop-checkbox-label">
                            <input type="checkbox" id="quantizeEnabled" class="loop-checkbox">
                            <span class="loop-checkbox-text">Enable Quantization</span>
                        </label>
                        <div class="quantize-grid-control">
                            <label for="quantizeGrid">Grid:</label>
                            <select id="quantizeGrid" class="loop-select">
                                <option value="whole">Whole Note</option>
                                <option value="half">Half Note</option>
                                <option value="quarter" selected>Quarter Note</option>
                                <option value="eighth">Eighth Note</option>
                                <option value="sixteenth">Sixteenth Note</option>
                                <option value="thirtysecond">Thirty-second Note</option>
                            </select>
                        </div>
                        <div class="swing-control">
                            <label for="swingAmount">Swing:</label>
                            <input type="range" id="swingAmount" min="0" max="100" value="0" class="loop-slider">
                            <span id="swingValue" class="loop-value">0%</span>
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
            tempoRatio: document.getElementById('tempoRatio')
        };
    },
    
    bindEvents() {
        // Loop enable/disable
        this.elements.loopEnabled.addEventListener('change', (e) => {
            LoopManager.setLoopEnabled(e.target.checked);
            this.updateLoopStatus();
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
        
        // Quantization
        this.elements.quantizeEnabled.addEventListener('change', (e) => {
            LoopManager.setQuantization(e.target.checked, LoopManager.quantizeGrid);
        });
        
        this.elements.quantizeGrid.addEventListener('change', (e) => {
            LoopManager.setQuantizationGrid(e.target.value);
        });
        
        // Swing
        this.elements.swingAmount.addEventListener('input', (e) => {
            const swingAmount = parseInt(e.target.value) / 100;
            LoopManager.setSwing(swingAmount);
            this.elements.swingValue.textContent = e.target.value + '%';
        });
        
        // Tempo conversion
        this.elements.originalTempo.addEventListener('change', (e) => {
            this.updateTempoConversion();
        });
        
        this.elements.targetTempo.addEventListener('change', (e) => {
            this.updateTempoConversion();
        });
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
    
    updateUI() {
        // Update UI elements to reflect current LoopManager state
        this.elements.loopEnabled.checked = LoopManager.isLoopEnabled;
        this.elements.loopStart.value = LoopManager.loopStart.toFixed(1);
        this.elements.loopEnd.value = LoopManager.loopEnd.toFixed(1);
        this.elements.maxLoops.value = LoopManager.maxLoops.toString();
        this.elements.quantizeEnabled.checked = LoopManager.quantizeEnabled;
        this.elements.swingAmount.value = (LoopManager.swingAmount * 100).toString();
        this.elements.swingValue.textContent = (LoopManager.swingAmount * 100).toFixed(0) + '%';
        this.elements.originalTempo.value = LoopManager.originalTempo.toString();
        this.elements.targetTempo.value = LoopManager.targetTempo.toString();
        
        this.updateLoopStatus();
        this.updateTempoConversion();
    },
    
    // Method to be called when playback state changes
    onPlaybackStateChange() {
        this.updateLoopStatus();
    }
};

