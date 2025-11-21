export const SYNTH_TEMPLATE_HTML = `
<div class="container">
    <h1>Blockchain-Orchestrated Polyphonic Synthesiser (BOP)</h1>
    <p class="subtitle">Foundational Tooling for The Bitcoin Audional Matrix</p>
    <div class="top-toolbar">
        <div class="transport-controls" id="transport-controls"></div>
        <div class="preset-controls" id="preset-controls"></div>
    </div>
    <div class="tabs">
        <button class="tab-button active" data-tab="synth">Synthesizer</button>
        <button class="tab-button" data-tab="midi">MIDI Editor</button>
    </div>
    <div id="synth" class="tab-content active">
        <div id="control-panel"></div>
        <div class="loop-controls" id="loop-controls"></div>
        <div class="keyboard-container">
            <div class="octave-controls">
                <button id="octaveDown" class="octave-button">Octave -</button>
                <span id="octaveLabel">Octave: 4</span>
                <button id="octaveUp" class="octave-button">Octave +</button>
            </div>
            <div class="keyboard" id="keyboard"></div>
        </div>
        <div class="status-bar">
            <div><span class="status-indicator" id="midiInd"></span> <span id="midiStat">MIDI: Not supported</span></div>
            <div><span class="status-indicator" id="recInd"></span> <span id="recStat">Status: Inactive</span></div>
        </div>
    </div>
    <div id="midi" class="tab-content">
        <h3>Piano Roll Editor</h3>
        <div class="piano-roll"><div class="roll-grid" id="rollGrid"></div></div>
    </div>
    <footer>Blockchain-Orchestrated Polyphonic Synth</footer>
</div>
`;

function resolveHost(target) {
    if (!target) {
        throw new Error('renderSynthLayout requires a host element or selector.');
    }
    if (typeof target === 'string') {
        const resolved = document.querySelector(target);
        if (!resolved) {
            throw new Error(`renderSynthLayout could not find host element for selector: ${target}`);
        }
        return resolved;
    }
    if (target instanceof Element) {
        return target;
    }
    throw new TypeError('renderSynthLayout expected a DOM element or selector string.');
}

export function createSynthTemplate() {
    const template = document.createElement('template');
    template.innerHTML = SYNTH_TEMPLATE_HTML;
    return template;
}

export function renderSynthLayout(target) {
    const host = resolveHost(target);
    const template = createSynthTemplate();
    host.replaceChildren(template.content.cloneNode(true));
    return getUIElements(host);
}

export function getUIElements(scope = document) {
    if (!scope || typeof scope.querySelector !== 'function') {
        throw new TypeError('getUIElements expected a DOM scope that supports querySelector.');
    }

    const query = (selector) => scope.querySelector(selector);
    const queryAll = (selector) => Array.from(scope.querySelectorAll(selector));

    return {
        keyboard: query('.keyboard-container'),
        transport: query('#transport-controls'),
        controls: query('#control-panel'),
        pianoRoll: query('#rollGrid'),
        loopControls: query('#loop-controls'),
        presetControls: query('#preset-controls'),
        tabButtons: queryAll('.tab-button'),
        tabContents: queryAll('.tab-content'),
        statusBar: query('.status-bar'),
        midiStatus: query('#midiStat'),
        midiIndicator: query('#midiInd'),
        recordStatus: query('#recStat'),
        recordIndicator: query('#recInd'),
    };
}
