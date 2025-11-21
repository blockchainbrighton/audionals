import { Keyboard } from '../synth/synth-keyboard.js';

function formatValue(param, value) {
    if (param === 'filter.frequency') return `${Math.round(value)} Hz`;
    if (param === 'filter.Q') return value.toFixed(2);
    if (param === 'envelope.attack' || param === 'envelope.release') {
        return `${Math.round(value * 1000)} ms`;
    }
    if (param === 'master.volume') return value.toFixed(2);
    if (param === 'envelope.sustain') return value.toFixed(2);
    return `${value}`;
}

export class SimpleSynthUI {
    constructor(logicController, uiElements) {
        this.logic = logicController;
        this.eventBus = logicController.eventBus;
        this.state = logicController.state;
        this.elements = uiElements;
        this.modules = {};
        this._boundHandlers = new Map();
        this.init();
    }

    init() {
        this.modules.keyboard = new Keyboard(
            this.elements.keyboard,
            this.eventBus,
            this.state,
            this.logic.Tone
        );
        this.bindControls();
        this.syncFromEngine();
    }

    bindControls() {
        (this.elements.paramInputs || []).forEach(input => {
            const param = input.dataset.param;
            if (!param) return;
            const handler = (event) => {
                const target = event.currentTarget;
                let value = target.value;
                if (target.type === 'range') value = Number(value);
                this.eventBus.dispatchEvent(new CustomEvent('parameter-change', {
                    detail: { parameter: param, value }
                }));
                this.updateOutput(param, value);
            };
            const evt = input.tagName === 'SELECT' ? 'change' : 'input';
            input.addEventListener(evt, handler);
            this._boundHandlers.set(input, { evt, handler });
        });
    }

    syncFromEngine() {
        const params = this.logic.modules?.synthEngine?.getState?.()?.params || {};
        (this.elements.paramInputs || []).forEach(input => {
            const param = input.dataset.param;
            if (!param) return;
            const stateKey = this.mapParamToStateKey(param);
            if (!stateKey || typeof params[stateKey] === 'undefined') return;
            if (input.tagName === 'SELECT') {
                input.value = params[stateKey];
            } else {
                input.value = params[stateKey];
            }
            this.updateOutput(param, params[stateKey]);
        });
    }

    updateOutput(param, value) {
        const output = (this.elements.outputs || []).find(el => el.dataset.output === param);
        if (output) {
            output.textContent = formatValue(param, value);
        }
    }

    mapParamToStateKey(param) {
        switch (param) {
            case 'oscillator.type': return 'oscillatorType';
            case 'filter.type': return 'filterType';
            case 'filter.frequency': return 'filterFrequency';
            case 'filter.Q': return 'filterQ';
            case 'envelope.attack': return 'envelopeAttack';
            case 'envelope.release': return 'envelopeRelease';
            case 'envelope.sustain': return 'envelopeSustain';
            case 'master.volume': return 'volume';
            default: return null;
        }
    }

    getUIState() {
        return { octave: this.state.curOct };
    }

    applyUIState(uiState) {
        if (!uiState) return;
        if (typeof uiState.octave === 'number') {
            this.eventBus.dispatchEvent(new CustomEvent('octave-change', {
                detail: { octave: uiState.octave }
            }));
        }
    }

    destroy() {
        (this.elements.paramInputs || []).forEach(input => {
            const binding = this._boundHandlers.get(input);
            if (binding) {
                input.removeEventListener(binding.evt, binding.handler);
            }
        });
        this._boundHandlers.clear();
        if (this.modules.keyboard?.releaseAllKeys) {
            this.modules.keyboard.releaseAllKeys();
        }
        this.modules.keyboard = null;
    }
}
