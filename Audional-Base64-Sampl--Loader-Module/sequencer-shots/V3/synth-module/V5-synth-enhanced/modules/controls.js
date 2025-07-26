// modules/controls.js
import { Effects } from './effects.js';
import { EnvelopeManager, AudioSafety } from './envelope.js';

export const Controls = {
    init() {
        // Initialize envelope manager and audio safety
        EnvelopeManager.init();
        AudioSafety.init();

        // Render controls UI into the #control-panel container
        const panel = document.getElementById('control-panel');
        panel.innerHTML = `
            <div class="control-panel">
                <div class="control-group">
                    <h3>Audio Safety</h3>
                    <div class="control-row">
                        <span class="control-label">Master Volume</span>
                        <input type="range" id="masterVolume" min="0" max="1" step="0.01" value="0.7">
                        <span class="control-value" id="masterVolumeVal">70%</span>
                    </div>
                    <div class="control-row">
                        <span class="control-label">Limiter Threshold</span>
                        <input type="range" id="limiterThreshold" min="-20" max="0" step="0.1" value="-3">
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
                        <span class="control-value" id="envelopeAttackVal">0.010</span>
                    </div>
                    <div class="control-row">
                        <span class="control-label">Decay</span>
                        <input type="range" id="envelopeDecay" min="0.001" max="5" step="0.001" value="0.1">
                        <span class="control-value" id="envelopeDecayVal">0.100</span>
                    </div>
                    <div class="control-row">
                        <span class="control-label">Sustain</span>
                        <input type="range" id="envelopeSustain" min="0" max="1" step="0.01" value="0.7">
                        <span class="control-value" id="envelopeSustainVal">0.70</span>
                    </div>
                    <div class="control-row">
                        <span class="control-label">Release</span>
                        <input type="range" id="envelopeRelease" min="0.001" max="5" step="0.001" value="0.3">
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
                        <span class="control-value" id="filterFreqVal">5000</span>
                    </div>
                    <div class="control-row">
                        <span class="control-label">Resonance</span>
                        <input type="range" id="filterQ" min="0" max="20" value="1">
                        <span class="control-value" id="filterQVal">1</span>
                    </div>
                </div>
                <div class="control-group">
                    <h3>Effects</h3>
                    <div class="control-row">
                        <span class="control-label">Reverb</span>
                        <input type="range" id="reverb" min="0" max="100" value="30">
                        <span class="control-value" id="reverbVal">30%</span>
                    </div>
                    <div class="control-row">
                        <span class="control-label">Delay</span>
                        <input type="range" id="delay" min="0" max="100" value="20">
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

        // Event listeners for controls
        // Audio Safety
        panel.querySelector('#masterVolume').oninput = (e) => {
            const val = parseFloat(e.target.value);
            AudioSafety.setMasterVolume(val);
            panel.querySelector('#masterVolumeVal').textContent = Math.round(val * 100) + '%';
        };
        panel.querySelector('#limiterThreshold').oninput = (e) => {
            const val = parseFloat(e.target.value);
            AudioSafety.setLimiterThreshold(val);
            panel.querySelector('#limiterThresholdVal').textContent = val + 'dB';
        };
        panel.querySelector('#emergencyStop').onclick = () => AudioSafety.emergencyStop();

        // Envelope controls
        panel.querySelector('#envelopePreset').onchange = (e) => {
            if (e.target.value) {
                EnvelopeManager.loadPreset(e.target.value);
            }
        };
        panel.querySelector('#envelopeAttack').oninput = (e) => {
            EnvelopeManager.setParameter('attack', e.target.value);
            panel.querySelector('#envelopeAttackVal').textContent = parseFloat(e.target.value).toFixed(3);
        };
        panel.querySelector('#envelopeDecay').oninput = (e) => {
            EnvelopeManager.setParameter('decay', e.target.value);
            panel.querySelector('#envelopeDecayVal').textContent = parseFloat(e.target.value).toFixed(3);
        };
        panel.querySelector('#envelopeSustain').oninput = (e) => {
            EnvelopeManager.setParameter('sustain', e.target.value);
            panel.querySelector('#envelopeSustainVal').textContent = parseFloat(e.target.value).toFixed(2);
        };
        panel.querySelector('#envelopeRelease').oninput = (e) => {
            EnvelopeManager.setParameter('release', e.target.value);
            panel.querySelector('#envelopeReleaseVal').textContent = parseFloat(e.target.value).toFixed(3);
        };

        // Oscillator & Detune
        panel.querySelector('#waveform').onchange = Effects.setOscillator;
        panel.querySelector('#detune').oninput = Effects.setDetune;
        // Filter
        panel.querySelector('#filterType').oninput = Effects.setFilter;
        panel.querySelector('#filterFreq').oninput = Effects.setFilter;
        panel.querySelector('#filterQ').oninput = Effects.setFilter;
        // Effects
        panel.querySelector('#reverb').oninput = Effects.setReverb;
        panel.querySelector('#delay').oninput = Effects.setDelay;
        // BPM
        panel.querySelector('#bpm').onchange = (e) => {
            Tone.Transport.bpm.value = +e.target.value;
        };

        // Show initial values
        Effects.setOscillator();
        Effects.setDetune();
        Effects.setFilter();
        Effects.setReverb();
        Effects.setDelay();
        EnvelopeManager.updateUI();
    }
};
