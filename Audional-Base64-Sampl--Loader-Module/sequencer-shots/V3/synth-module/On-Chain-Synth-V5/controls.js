// modules/controls.js
import { Effects } from './effects.js';

export const Controls = {
    init() {
        // Render controls UI into the #control-panel container
        const panel = document.getElementById('control-panel');
        panel.innerHTML = `
            <div class="control-panel">
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
    }
};
