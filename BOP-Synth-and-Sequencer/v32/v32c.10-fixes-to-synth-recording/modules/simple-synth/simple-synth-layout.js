export const SIMPLE_SYNTH_TEMPLATE = `
<div class="simple-synth">
    <header class="simple-synth__header">
        <h2>Simple Synth</h2>
        <p class="simple-synth__subtitle">Lightweight Tone.js synth for quick sound design.</p>
    </header>
    <section class="simple-synth__controls" id="simple-controls">
        <label class="simple-synth__control">
            <span>Waveform</span>
            <select data-param="oscillator.type">
                <option value="sine">Sine</option>
                <option value="triangle">Triangle</option>
                <option value="square">Square</option>
                <option value="sawtooth">Saw</option>
            </select>
        </label>
        <label class="simple-synth__control">
            <span>Filter Type</span>
            <select data-param="filter.type">
                <option value="lowpass">Low-pass</option>
                <option value="bandpass">Band-pass</option>
                <option value="highpass">High-pass</option>
            </select>
        </label>
        <label class="simple-synth__control">
            <span>Filter Cutoff</span>
            <input type="range" min="200" max="8000" step="50" data-param="filter.frequency">
            <output data-output="filter.frequency">1800 Hz</output>
        </label>
        <label class="simple-synth__control">
            <span>Filter Resonance</span>
            <input type="range" min="0.1" max="2.5" step="0.05" data-param="filter.Q">
            <output data-output="filter.Q">0.8</output>
        </label>
        <label class="simple-synth__control">
            <span>Attack</span>
            <input type="range" min="0.005" max="1" step="0.005" data-param="envelope.attack">
            <output data-output="envelope.attack">20 ms</output>
        </label>
        <label class="simple-synth__control">
            <span>Release</span>
            <input type="range" min="0.05" max="3" step="0.01" data-param="envelope.release">
            <output data-output="envelope.release">800 ms</output>
        </label>
        <label class="simple-synth__control">
            <span>Sustain</span>
            <input type="range" min="0" max="1" step="0.01" data-param="envelope.sustain">
            <output data-output="envelope.sustain">0.7</output>
        </label>
        <label class="simple-synth__control">
            <span>Volume</span>
            <input type="range" min="0" max="1" step="0.01" data-param="master.volume">
            <output data-output="master.volume">0.8</output>
        </label>
    </section>
    <section class="simple-synth__keyboard keyboard-container">
        <div class="octave-controls">
            <button id="octaveDown" type="button" class="octave-button">Octave -</button>
            <span id="octaveLabel">Octave: 4</span>
            <button id="octaveUp" type="button" class="octave-button">Octave +</button>
        </div>
        <div class="keyboard" id="keyboard"></div>
    </section>
</div>
`;

export function createSimpleSynthTemplate(doc = (typeof document !== 'undefined' ? document : null)) {
    if (!doc || typeof doc.createElement !== 'function') {
        throw new Error('SimpleSynth template requires a document context.');
    }
    const template = doc.createElement('template');
    template.innerHTML = SIMPLE_SYNTH_TEMPLATE;
    return template;
}

export function getSimpleSynthUIElements(scope) {
    const root = scope ?? (typeof document !== 'undefined' ? document : null);
    if (!root || typeof root.querySelector !== 'function') {
        throw new Error('getSimpleSynthUIElements requires a DOM scope.');
    }

    return {
        keyboard: root.querySelector('.keyboard-container'),
        controlPanel: root.querySelector('#simple-controls'),
        paramInputs: Array.from(root.querySelectorAll('[data-param]')),
        outputs: Array.from(root.querySelectorAll('output[data-output]'))
    };
}
