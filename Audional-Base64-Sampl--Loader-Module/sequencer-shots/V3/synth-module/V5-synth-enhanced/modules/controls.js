// modules/controls.js
import { Effects } from './effects.js';
import { EnvelopeManager, AudioSafety } from './envelope.js';

export const Controls = {
    init() {
        EnvelopeManager.init();
        AudioSafety.init();

        // Render UI
        const panel = document.getElementById('control-panel');
        panel.innerHTML = `
            <div class="control-panel">
                <div class="control-group">
                    <h3>Audio Safety</h3>
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
                </div>
                <div class="control-group">
                    <h3>Envelope (ADSR)</h3>
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
                </div>
                <div class="control-group">
                    <h3>Oscillator</h3>
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
                </div>
                <div class="control-group">
                    <h3>Filter</h3>
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
                </div>
                <div class="control-group">
                    <h3>Effects</h3>
                    <div class="control-row">
                        <span class="control-label">Reverb</span>
                        <input type="range" id="reverb" min="0" max="100" value="30">
                        <input type="number" id="reverbInput" min="0" max="100" value="30" style="width:60px; margin-left:7px;">
                        <span class="control-value" id="reverbVal">30%</span>
                    </div>
                    <div class="control-row">
                        <span class="control-label">Delay</span>
                        <input type="range" id="delay" min="0" max="100" value="20">
                        <input type="number" id="delayInput" min="0" max="100" value="20" style="width:60px; margin-left:7px;">
                        <span class="control-value" id="delayVal">20%</span>
                    </div>
                </div>
                <div class="control-group">
                    <h3>BPM</h3>
                    <div class="control-row">
                        <span class="control-label">BPM</span>
                        <input type="number" id="bpm" min="40" max="240" value="120">
                    </div>
                </div>
            </div>
        `;

        // Utility: sync slider<->number for a pair, call cb(value) on change
        function linkSliderAndInput(sliderId, inputId, valueCb) {
            const slider = panel.querySelector(sliderId);
            const input = panel.querySelector(inputId);
            slider.addEventListener('input', e => {
                input.value = slider.value;
                valueCb(slider.value);
            });
            input.addEventListener('input', e => {
                // Clamp for safety
                let val = input.value;
                if (slider.min !== undefined) val = Math.max(Number(slider.min), val);
                if (slider.max !== undefined) val = Math.min(Number(slider.max), val);
                slider.value = val;
                valueCb(val);
            });
        }

        // Audio Safety
        linkSliderAndInput('#masterVolume', '#masterVolumeInput', (val) => {
            AudioSafety.setMasterVolume(val);
            panel.querySelector('#masterVolumeVal').textContent = Math.round(val * 100) + '%';
        });
        linkSliderAndInput('#limiterThreshold', '#limiterThresholdInput', (val) => {
            AudioSafety.setLimiterThreshold(val);
            panel.querySelector('#limiterThresholdVal').textContent = val + 'dB';
        });
        panel.querySelector('#emergencyStop').onclick = () => AudioSafety.emergencyStop();

        // Envelope
        panel.querySelector('#envelopePreset').onchange = (e) => {
            if (e.target.value) EnvelopeManager.loadPreset(e.target.value);
        };
        
        linkSliderAndInput('#envelopeAttack', '#envelopeAttackInput', (val) => {
            EnvelopeManager.setParameter('attack', val);
            panel.querySelector('#envelopeAttackVal').textContent = parseFloat(val).toFixed(3);
        });
        linkSliderAndInput('#envelopeDecay', '#envelopeDecayInput', (val) => {
            EnvelopeManager.setParameter('decay', val);
            panel.querySelector('#envelopeDecayVal').textContent = parseFloat(val).toFixed(3);
        });
        linkSliderAndInput('#envelopeSustain', '#envelopeSustainInput', (val) => {
            EnvelopeManager.setParameter('sustain', val);
            panel.querySelector('#envelopeSustainVal').textContent = parseFloat(val).toFixed(2);
        });
        linkSliderAndInput('#envelopeRelease', '#envelopeReleaseInput', (val) => {
            EnvelopeManager.setParameter('release', val);
            panel.querySelector('#envelopeReleaseVal').textContent = parseFloat(val).toFixed(3);
        });

        // Oscillator & Detune
        panel.querySelector('#waveform').onchange = Effects.setOscillator;
        linkSliderAndInput('#detune', '#detuneInput', (val) => { panel.querySelector('#detune').value = val; Effects.setDetune(); });

        // Filter
        panel.querySelector('#filterType').oninput = Effects.setFilter;
        linkSliderAndInput('#filterFreq', '#filterFreqInput', (val) => { panel.querySelector('#filterFreq').value = val; Effects.setFilter(); });
        linkSliderAndInput('#filterQ', '#filterQInput', (val) => { panel.querySelector('#filterQ').value = val; Effects.setFilter(); });

        // Effects
        linkSliderAndInput('#reverb', '#reverbInput', (val) => { panel.querySelector('#reverb').value = val; Effects.setReverb(); });
        linkSliderAndInput('#delay', '#delayInput', (val) => { panel.querySelector('#delay').value = val; Effects.setDelay(); });

        // BPM
        panel.querySelector('#bpm').onchange = (e) => { Tone.Transport.bpm.value = +e.target.value; };

        // Show initial values
        Effects.setOscillator();
        Effects.setDetune();
        Effects.setFilter();
        Effects.setReverb();
        Effects.setDelay();
        EnvelopeManager.updateUI();
    }
};
