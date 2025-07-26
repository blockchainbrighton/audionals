// modules/enhanced-controls.js
import { EnhancedEffects } from './enhanced-effects.js';
import { EnvelopeManager, AudioSafety } from './envelope.js';

export const EnhancedControls = {
    init() {
        EnvelopeManager.init();
        AudioSafety.init();

        const panel = document.getElementById('control-panel');
        panel.innerHTML = `
            <div class="control-panel">
                ${this.groupBlock('Audio Safety', 'audio', false, `
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
                ${this.groupBlock('Envelope (ADSR)', 'env', false, `
                    <div class="control-row">
                        <span class="control-label">Preset</span>
                        <select id="envelopePreset">
                            <option value="">Custom</option>
                            <option value="piano">Piano</option>
                            <option value="organ">Organ</option>
                            <option value="strings">Strings</option>
                            <option value="brass">Brass</option>
                            <option value="pad">Pad</option>
                            <option value="pluck">Pluck</option>
                            <option value="bass">Bass</option>
                        </select>
                    </div>
                    <div class="control-row">
                        <span class="control-label">Attack</span>
                        <input type="range" id="envelopeAttack" min="0.001" max="5" step="0.001" value="0.01">
                        <input type="number" id="envelopeAttackInput" min="0.001" max="5" step="0.001" value="0.01" style="width:65px; margin-left:7px;">
                        <span class="control-value" id="envelopeAttackVal">0.010</span>
                    </div>
                    <div class="control-row">
                        <span class="control-label">Decay</span>
                        <input type="range" id="envelopeDecay" min="0.001" max="5" step="0.001" value="0.1">
                        <input type="number" id="envelopeDecayInput" min="0.001" max="5" step="0.001" value="0.1" style="width:65px; margin-left:7px;">
                        <span class="control-value" id="envelopeDecayVal">0.100</span>
                    </div>
                    <div class="control-row">
                        <span class="control-label">Sustain</span>
                        <input type="range" id="envelopeSustain" min="0" max="1" step="0.01" value="0.7">
                        <input type="number" id="envelopeSustainInput" min="0" max="1" step="0.01" value="0.7" style="width:58px; margin-left:7px;">
                        <span class="control-value" id="envelopeSustainVal">0.70</span>
                    </div>
                    <div class="control-row">
                        <span class="control-label">Release</span>
                        <input type="range" id="envelopeRelease" min="0.001" max="5" step="0.001" value="0.3">
                        <input type="number" id="envelopeReleaseInput" min="0.001" max="5" step="0.001" value="0.3" style="width:65px; margin-left:7px;">
                        <span class="control-value" id="envelopeReleaseVal">0.300</span>
                    </div>
                `)}
                ${this.groupBlock('Oscillator', 'osc', false, `
                    <div class="control-row">
                        <span class="control-label">Waveform</span>
                        <select id="waveform">
                            <option>sine</option>
                            <option>square</option>
                            <option>sawtooth</option>
                            <option>triangle</option>
                        </select>
                    </div>
                    <div class="control-row">
                        <span class="control-label">Detune</span>
                        <input type="range" id="detune" min="-50" max="50" value="0">
                        <input type="number" id="detuneInput" min="-50" max="50" value="0" style="width:58px; margin-left:7px;">
                        <span class="control-value" id="detuneVal">0</span>
                    </div>
                `)}
                ${this.groupBlock('Filter & LFO', 'filter', false, `
                    <div class="control-row">
                        <label class="enable-switch">
                            <input type="checkbox" id="filterEnable" checked>
                            <span class="slider"></span>
                        </label>
                        <span class="control-label">Filter Enable</span>
                    </div>
                    <div class="control-row">
                        <span class="control-label">Type</span>
                        <select id="filterType"><option>lowpass</option><option>highpass</option><option>bandpass</option></select>
                    </div>
                    <div class="control-row">
                        <span class="control-label">Frequency</span>
                        <input type="range" id="filterFreq" min="20" max="20000" value="5000">
                        <input type="number" id="filterFreqInput" min="20" max="20000" value="5000" style="width:80px; margin-left:7px;">
                        <span class="control-value" id="filterFreqVal">5000</span>
                    </div>
                    <div class="control-row">
                        <span class="control-label">Resonance</span>
                        <input type="range" id="filterQ" min="0" max="20" value="1">
                        <input type="number" id="filterQInput" min="0" max="20" value="1" style="width:55px; margin-left:7px;">
                        <span class="control-value" id="filterQVal">1</span>
                    </div>
                    <div class="control-row">
                        <label class="enable-switch">
                            <input type="checkbox" id="filterLFOEnable">
                            <span class="slider"></span>
                        </label>
                        <span class="control-label">Filter LFO</span>
                    </div>
                    <div class="control-row">
                        <span class="control-label">LFO Rate</span>
                        <input type="range" id="filterLFORate" min="0.1" max="10" step="0.1" value="0.5">
                        <span class="control-value" id="filterLFORateVal">0.5</span>
                    </div>
                    <div class="control-row">
                        <span class="control-label">LFO Depth</span>
                        <input type="range" id="filterLFODepth" min="0" max="1" step="0.01" value="0.5">
                        <span class="control-value" id="filterLFODepthVal">0.5</span>
                    </div>
                `)}
                ${this.groupBlock('Modulation Effects', 'modulation', false, `
                    <div class="control-row">
                        <label class="enable-switch">
                            <input type="checkbox" id="chorusEnable">
                            <span class="slider"></span>
                        </label>
                        <span class="control-label">Chorus</span>
                        <input type="range" id="chorusWet" min="0" max="1" step="0.01" value="0.5">
                        <span class="control-value" id="chorusWetVal">50%</span>
                    </div>
                    <div class="control-row">
                        <span class="control-label">Chorus Rate</span>
                        <input type="range" id="chorusRate" min="0.1" max="5" step="0.1" value="1.5">
                        <span class="control-value" id="chorusRateVal">1.5</span>
                    </div>
                    <div class="control-row">
                        <label class="enable-switch">
                            <input type="checkbox" id="phaserEnable">
                            <span class="slider"></span>
                        </label>
                        <span class="control-label">Phaser</span>
                        <input type="range" id="phaserWet" min="0" max="1" step="0.01" value="0.5">
                        <span class="control-value" id="phaserWetVal">50%</span>
                    </div>
                    <div class="control-row">
                        <span class="control-label">Phaser Rate</span>
                        <input type="range" id="phaserRate" min="0.1" max="2" step="0.1" value="0.5">
                        <span class="control-value" id="phaserRateVal">0.5</span>
                    </div>
                    <div class="control-row">
                        <label class="enable-switch">
                            <input type="checkbox" id="tremoloEnable">
                            <span class="slider"></span>
                        </label>
                        <span class="control-label">Tremolo</span>
                        <input type="range" id="tremoloWet" min="0" max="1" step="0.01" value="0.7">
                        <span class="control-value" id="tremoloWetVal">70%</span>
                    </div>
                    <div class="control-row">
                        <span class="control-label">Tremolo Rate</span>
                        <input type="range" id="tremoloRate" min="1" max="20" step="0.5" value="10">
                        <span class="control-value" id="tremoloRateVal">10</span>
                    </div>
                    <div class="control-row">
                        <label class="enable-switch">
                            <input type="checkbox" id="vibratoEnable">
                            <span class="slider"></span>
                        </label>
                        <span class="control-label">Vibrato</span>
                        <input type="range" id="vibratoWet" min="0" max="1" step="0.01" value="0.8">
                        <span class="control-value" id="vibratoWetVal">80%</span>
                    </div>
                    <div class="control-row">
                        <span class="control-label">Vibrato Rate</span>
                        <input type="range" id="vibratoRate" min="1" max="15" step="0.5" value="5">
                        <span class="control-value" id="vibratoRateVal">5</span>
                    </div>
                `)}
                ${this.groupBlock('Distortion & Dynamics', 'distortion', false, `
                    <div class="control-row">
                        <label class="enable-switch">
                            <input type="checkbox" id="compressorEnable" checked>
                            <span class="slider"></span>
                        </label>
                        <span class="control-label">Compressor</span>
                    </div>
                    <div class="control-row">
                        <span class="control-label">Threshold</span>
                        <input type="range" id="compressorThreshold" min="-40" max="0" step="1" value="-24">
                        <span class="control-value" id="compressorThresholdVal">-24dB</span>
                    </div>
                    <div class="control-row">
                        <span class="control-label">Ratio</span>
                        <input type="range" id="compressorRatio" min="1" max="20" step="0.5" value="12">
                        <span class="control-value" id="compressorRatioVal">12:1</span>
                    </div>
                    <div class="control-row">
                        <label class="enable-switch">
                            <input type="checkbox" id="distortionEnable">
                            <span class="slider"></span>
                        </label>
                        <span class="control-label">Distortion</span>
                        <input type="range" id="distortionWet" min="0" max="1" step="0.01" value="0.3">
                        <span class="control-value" id="distortionWetVal">30%</span>
                    </div>
                    <div class="control-row">
                        <span class="control-label">Drive</span>
                        <input type="range" id="distortionDrive" min="0" max="1" step="0.01" value="0.4">
                        <span class="control-value" id="distortionDriveVal">0.4</span>
                    </div>
                    <div class="control-row">
                        <label class="enable-switch">
                            <input type="checkbox" id="bitCrusherEnable">
                            <span class="slider"></span>
                        </label>
                        <span class="control-label">BitCrusher</span>
                        <input type="range" id="bitCrusherWet" min="0" max="1" step="0.01" value="0.3">
                        <span class="control-value" id="bitCrusherWetVal">30%</span>
                    </div>
                    <div class="control-row">
                        <span class="control-label">Bits</span>
                        <input type="range" id="bitCrusherBits" min="1" max="16" step="1" value="4">
                        <span class="control-value" id="bitCrusherBitsVal">4</span>
                    </div>
                `)}
                ${this.groupBlock('Time-Based Effects', 'time', false, `
                    <div class="control-row">
                        <label class="enable-switch">
                            <input type="checkbox" id="delayEnable" checked>
                            <span class="slider"></span>
                        </label>
                        <span class="control-label">Delay</span>
                        <input type="range" id="delay" min="0" max="100" value="20">
                        <input type="number" id="delayInput" min="0" max="100" value="20" style="width:60px; margin-left:7px;">
                        <span class="control-value" id="delayVal">20%</span>
                    </div>
                    <div class="control-row">
                        <span class="control-label">Delay Time</span>
                        <input type="range" id="delayTime" min="0.01" max="1" step="0.01" value="0.25">
                        <span class="control-value" id="delayTimeVal">0.25s</span>
                    </div>
                    <div class="control-row">
                        <span class="control-label">Feedback</span>
                        <input type="range" id="delayFeedback" min="0" max="0.95" step="0.01" value="0.3">
                        <span class="control-value" id="delayFeedbackVal">0.3</span>
                    </div>
                    <div class="control-row">
                        <label class="enable-switch">
                            <input type="checkbox" id="reverbEnable" checked>
                            <span class="slider"></span>
                        </label>
                        <span class="control-label">Reverb</span>
                        <input type="range" id="reverb" min="0" max="100" value="30">
                        <input type="number" id="reverbInput" min="0" max="100" value="30" style="width:60px; margin-left:7px;">
                        <span class="control-value" id="reverbVal">30%</span>
                    </div>
                    <div class="control-row">
                        <span class="control-label">Room Size</span>
                        <input type="range" id="reverbRoom" min="0.1" max="1" step="0.01" value="0.7">
                        <span class="control-value" id="reverbRoomVal">0.7</span>
                    </div>
                    <div class="control-row">
                        <span class="control-label">Decay</span>
                        <input type="range" id="reverbDecay" min="0.1" max="10" step="0.1" value="2">
                        <span class="control-value" id="reverbDecayVal">2s</span>
                    </div>
                `)}
                ${this.groupBlock('BPM', 'bpm', false, `
                    <div class="control-row">
                        <span class="control-label">BPM</span>
                        <input type="number" id="bpm" min="40" max="240" value="120">
                    </div>
                `)}
            </div>
        `;

        // Initialize enhanced effects
        EnhancedEffects.init();

        // Setup toggle functionality
        this.setupToggleControls(panel);
        
        // Setup effect controls
        this.setupEffectControls(panel);
        
        // Setup audio safety controls
        this.setupAudioSafetyControls(panel);
        
        // Setup envelope controls
        this.setupEnvelopeControls(panel);
        
        // Setup oscillator controls
        this.setupOscillatorControls(panel);

        // Show initial values
        this.updateAllDisplayValues();
    },

    setupToggleControls(panel) {
        // Toggle expand/collapse logic
        ['audio','env','osc','filter','modulation','distortion','time','bpm'].forEach(id => {
            const toggle = panel.querySelector(`#${id}_toggle`);
            const content = panel.querySelector(`#${id}_content`);
            if (!toggle || !content) return;
            content.classList.toggle('group-content-collapsed', !toggle.checked);
            toggle.addEventListener('change', () => {
                content.classList.toggle('group-content-collapsed', !toggle.checked);
            });
            // Also expand/collapse when title row is clicked
            const titleRow = panel.querySelector(`#${id}_title_row`);
            if (titleRow) {
                titleRow.addEventListener('click', (e) => {
                    if (e.target === toggle) return;
                    toggle.checked = !toggle.checked;
                    toggle.dispatchEvent(new Event('change'));
                });
            }
        });
    },

    setupEffectControls(panel) {
        // Filter controls
        this.setupEffectToggle('filterEnable', 'filter');
        this.setupEffectToggle('filterLFOEnable', 'filterLFO');
        
        // Modulation effects
        this.setupEffectToggle('chorusEnable', 'chorus');
        this.setupEffectToggle('phaserEnable', 'phaser');
        this.setupEffectToggle('tremoloEnable', 'tremolo');
        this.setupEffectToggle('vibratoEnable', 'vibrato');
        
        // Distortion & dynamics
        this.setupEffectToggle('compressorEnable', 'compressor');
        this.setupEffectToggle('distortionEnable', 'distortion');
        this.setupEffectToggle('bitCrusherEnable', 'bitCrusher');
        
        // Time-based effects
        this.setupEffectToggle('delayEnable', 'delay');
        this.setupEffectToggle('reverbEnable', 'reverb');

        // Parameter controls
        this.setupParameterControls(panel);
    },

    setupEffectToggle(toggleId, effectName) {
        const toggle = document.getElementById(toggleId);
        if (toggle) {
            toggle.addEventListener('change', () => {
                EnhancedEffects.toggleEffect(effectName, toggle.checked);
                console.log(`[EnhancedControls] ${effectName} ${toggle.checked ? 'enabled' : 'disabled'}`);
            });
            
            // Set initial state
            toggle.checked = EnhancedEffects.enabled[effectName] || false;
        }
    },

    setupParameterControls(panel) {
        // Filter controls
        this.linkSliderAndCallback('#filterFreq', '#filterFreqInput', '#filterFreqVal', (val) => {
            EnhancedEffects.setFilter({ frequency: val });
        });
        
        this.linkSliderAndCallback('#filterQ', '#filterQInput', '#filterQVal', (val) => {
            EnhancedEffects.setFilter({ Q: val });
        });
        
        panel.querySelector('#filterType').addEventListener('change', (e) => {
            EnhancedEffects.setFilter({ type: e.target.value });
        });

        // Filter LFO controls
        this.linkSliderAndCallback('#filterLFORate', null, '#filterLFORateVal', (val) => {
            EnhancedEffects.setFilterLFO({ frequency: val });
        });
        
        this.linkSliderAndCallback('#filterLFODepth', null, '#filterLFODepthVal', (val) => {
            EnhancedEffects.setFilterLFO({ depth: val });
        });

        // Chorus controls
        this.linkSliderAndCallback('#chorusWet', null, '#chorusWetVal', (val) => {
            EnhancedEffects.setChorus({ wet: val });
        }, (val) => Math.round(val * 100) + '%');
        
        this.linkSliderAndCallback('#chorusRate', null, '#chorusRateVal', (val) => {
            EnhancedEffects.setChorus({ frequency: val });
        });

        // Phaser controls
        this.linkSliderAndCallback('#phaserWet', null, '#phaserWetVal', (val) => {
            EnhancedEffects.setPhaser({ wet: val });
        }, (val) => Math.round(val * 100) + '%');
        
        this.linkSliderAndCallback('#phaserRate', null, '#phaserRateVal', (val) => {
            EnhancedEffects.setPhaser({ frequency: val });
        });

        // Tremolo controls
        this.linkSliderAndCallback('#tremoloWet', null, '#tremoloWetVal', (val) => {
            EnhancedEffects.setTremolo({ wet: val });
        }, (val) => Math.round(val * 100) + '%');
        
        this.linkSliderAndCallback('#tremoloRate', null, '#tremoloRateVal', (val) => {
            EnhancedEffects.setTremolo({ frequency: val });
        });

        // Vibrato controls
        this.linkSliderAndCallback('#vibratoWet', null, '#vibratoWetVal', (val) => {
            EnhancedEffects.setVibrato({ wet: val });
        }, (val) => Math.round(val * 100) + '%');
        
        this.linkSliderAndCallback('#vibratoRate', null, '#vibratoRateVal', (val) => {
            EnhancedEffects.setVibrato({ frequency: val });
        });

        // Compressor controls
        this.linkSliderAndCallback('#compressorThreshold', null, '#compressorThresholdVal', (val) => {
            EnhancedEffects.setCompressor({ threshold: val });
        }, (val) => val + 'dB');
        
        this.linkSliderAndCallback('#compressorRatio', null, '#compressorRatioVal', (val) => {
            EnhancedEffects.setCompressor({ ratio: val });
        }, (val) => val + ':1');

        // Distortion controls
        this.linkSliderAndCallback('#distortionWet', null, '#distortionWetVal', (val) => {
            EnhancedEffects.setDistortion({ wet: val });
        }, (val) => Math.round(val * 100) + '%');
        
        this.linkSliderAndCallback('#distortionDrive', null, '#distortionDriveVal', (val) => {
            EnhancedEffects.setDistortion({ distortion: val });
        });

        // BitCrusher controls
        this.linkSliderAndCallback('#bitCrusherWet', null, '#bitCrusherWetVal', (val) => {
            EnhancedEffects.setBitCrusher({ wet: val });
        }, (val) => Math.round(val * 100) + '%');
        
        this.linkSliderAndCallback('#bitCrusherBits', null, '#bitCrusherBitsVal', (val) => {
            EnhancedEffects.setBitCrusher({ bits: val });
        });

        // Delay controls
        this.linkSliderAndCallback('#delay', '#delayInput', '#delayVal', (val) => {
            EnhancedEffects.setDelay({ wet: val / 100 });
        }, (val) => val + '%');
        
        this.linkSliderAndCallback('#delayTime', null, '#delayTimeVal', (val) => {
            EnhancedEffects.setDelay({ delayTime: val });
        }, (val) => val + 's');
        
        this.linkSliderAndCallback('#delayFeedback', null, '#delayFeedbackVal', (val) => {
            EnhancedEffects.setDelay({ feedback: val });
        });

        // Reverb controls
        this.linkSliderAndCallback('#reverb', '#reverbInput', '#reverbVal', (val) => {
            EnhancedEffects.setReverb({ wet: val / 100 });
        }, (val) => val + '%');
        
        this.linkSliderAndCallback('#reverbRoom', null, '#reverbRoomVal', (val) => {
            EnhancedEffects.setReverb({ roomSize: val });
        });
        
        this.linkSliderAndCallback('#reverbDecay', null, '#reverbDecayVal', (val) => {
            EnhancedEffects.setReverb({ decay: val });
        }, (val) => val + 's');
    },

    setupAudioSafetyControls(panel) {
        this.linkSliderAndCallback('#masterVolume', '#masterVolumeInput', '#masterVolumeVal', (val) => {
            AudioSafety.setMasterVolume(val);
            EnhancedEffects.setMasterVolume(val);
        }, (val) => Math.round(val * 100) + '%');
        
        this.linkSliderAndCallback('#limiterThreshold', '#limiterThresholdInput', '#limiterThresholdVal', (val) => {
            AudioSafety.setLimiterThreshold(val);
        }, (val) => val + 'dB');
        
        panel.querySelector('#emergencyStop').onclick = () => AudioSafety.emergencyStop();
    },

    setupEnvelopeControls(panel) {
        panel.querySelector('#envelopePreset').onchange = (e) => {
            if (e.target.value) EnvelopeManager.loadPreset(e.target.value);
        };
        
        this.linkSliderAndCallback('#envelopeAttack', '#envelopeAttackInput', '#envelopeAttackVal', (val) => {
            EnvelopeManager.setParameter('attack', val);
        }, (val) => parseFloat(val).toFixed(3));
        
        this.linkSliderAndCallback('#envelopeDecay', '#envelopeDecayInput', '#envelopeDecayVal', (val) => {
            EnvelopeManager.setParameter('decay', val);
        }, (val) => parseFloat(val).toFixed(3));
        
        this.linkSliderAndCallback('#envelopeSustain', '#envelopeSustainInput', '#envelopeSustainVal', (val) => {
            EnvelopeManager.setParameter('sustain', val);
        }, (val) => parseFloat(val).toFixed(2));
        
        this.linkSliderAndCallback('#envelopeRelease', '#envelopeReleaseInput', '#envelopeReleaseVal', (val) => {
            EnvelopeManager.setParameter('release', val);
        }, (val) => parseFloat(val).toFixed(3));
    },

    setupOscillatorControls(panel) {
        panel.querySelector('#waveform').onchange = () => {
            if (window.synthApp?.synth) {
                window.synthApp.synth.set({ oscillator: { type: panel.querySelector('#waveform').value } });
            }
        };
        
        this.linkSliderAndCallback('#detune', '#detuneInput', '#detuneVal', (val) => {
            if (window.synthApp?.synth) {
                window.synthApp.synth.set({ detune: val });
            }
        });

        // BPM control
        panel.querySelector('#bpm').onchange = (e) => { 
            if (window.Tone) {
                Tone.Transport.bpm.value = +e.target.value; 
            }
        };
    },

    linkSliderAndCallback(sliderId, inputId, valueId, callback, formatter) {
        const slider = document.querySelector(sliderId);
        const input = inputId ? document.querySelector(inputId) : null;
        const valueDisplay = valueId ? document.querySelector(valueId) : null;
        
        if (!slider) return;

        const updateValue = (val) => {
            if (input) input.value = val;
            if (valueDisplay) {
                valueDisplay.textContent = formatter ? formatter(val) : val;
            }
            if (callback) callback(val);
        };

        slider.addEventListener('input', (e) => {
            updateValue(e.target.value);
        });

        if (input) {
            input.addEventListener('input', (e) => {
                let val = e.target.value;
                if (slider.min !== undefined) val = Math.max(Number(slider.min), val);
                if (slider.max !== undefined) val = Math.min(Number(slider.max), val);
                slider.value = val;
                updateValue(val);
            });
        }
    },

    updateAllDisplayValues() {
        // Update all display values to match current settings
        const updateDisplay = (id, formatter) => {
            const element = document.querySelector(id);
            if (element && element.value !== undefined) {
                const valueDisplay = document.querySelector(id.replace(/Input$/, 'Val'));
                if (valueDisplay) {
                    valueDisplay.textContent = formatter ? formatter(element.value) : element.value;
                }
            }
        };

        // Update all value displays
        updateDisplay('#masterVolume', (val) => Math.round(val * 100) + '%');
        updateDisplay('#limiterThreshold', (val) => val + 'dB');
        updateDisplay('#envelopeAttack', (val) => parseFloat(val).toFixed(3));
        updateDisplay('#envelopeDecay', (val) => parseFloat(val).toFixed(3));
        updateDisplay('#envelopeSustain', (val) => parseFloat(val).toFixed(2));
        updateDisplay('#envelopeRelease', (val) => parseFloat(val).toFixed(3));
        updateDisplay('#detune');
        updateDisplay('#filterFreq');
        updateDisplay('#filterQ');
        updateDisplay('#filterLFORate');
        updateDisplay('#filterLFODepth');
        updateDisplay('#chorusWet', (val) => Math.round(val * 100) + '%');
        updateDisplay('#chorusRate');
        updateDisplay('#phaserWet', (val) => Math.round(val * 100) + '%');
        updateDisplay('#phaserRate');
        updateDisplay('#tremoloWet', (val) => Math.round(val * 100) + '%');
        updateDisplay('#tremoloRate');
        updateDisplay('#vibratoWet', (val) => Math.round(val * 100) + '%');
        updateDisplay('#vibratoRate');
        updateDisplay('#compressorThreshold', (val) => val + 'dB');
        updateDisplay('#compressorRatio', (val) => val + ':1');
        updateDisplay('#distortionWet', (val) => Math.round(val * 100) + '%');
        updateDisplay('#distortionDrive');
        updateDisplay('#bitCrusherWet', (val) => Math.round(val * 100) + '%');
        updateDisplay('#bitCrusherBits');
        updateDisplay('#delay', (val) => val + '%');
        updateDisplay('#delayTime', (val) => val + 's');
        updateDisplay('#delayFeedback');
        updateDisplay('#reverb', (val) => val + '%');
        updateDisplay('#reverbRoom');
        updateDisplay('#reverbDecay', (val) => val + 's');

        console.log('[EnhancedControls] All display values updated');
    },

    groupBlock(title, id, expanded, contentHtml) {
        return `
            <div class="control-group">
                <div class="group-title-row" id="${id}_title_row">
                    <input type="checkbox" id="${id}_toggle" class="group-toggle" ${expanded ? "checked" : ""} />
                    <h3 style="margin:0;flex:1 1 auto;">${title}</h3>
                </div>
                <div id="${id}_content" class="group-content${expanded ? "" : " group-content-collapsed"}">
                    ${contentHtml}
                </div>
            </div>
        `;
    }
};

