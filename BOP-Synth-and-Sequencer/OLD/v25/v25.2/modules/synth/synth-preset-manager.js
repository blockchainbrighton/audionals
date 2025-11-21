import { PRESET_CATALOG, generateRandomPreset, getPresetById } from './synth-presets.js';

const EFFECT_NAMES = ['reverb', 'delay', 'chorus', 'phaser', 'tremolo', 'vibrato', 'distortion'];

export class PresetManager {
    constructor(containerElement, eventBus, synthEngine) {
        this.container = containerElement;
        this.eventBus = eventBus;
        this.synthEngine = synthEngine;
        this._handlers = [];
        this.selectEl = null;
        this.randomBtn = null;
        this.currentPresetId = '';

        if (!this.container || !this.eventBus || !this.synthEngine) {
            console.warn('[PresetManager] Missing dependencies. Preset UI disabled.');
            return;
        }

        this.init();
    }

    init() {
        this.render();
        this.cacheElements();
        this.bindEvents();
    }

    render() {
        const optionsHtml = ['<option value="" disabled selected>Select preset...</option>']
            .concat(PRESET_CATALOG.map(preset => `<option value="${preset.id}">${preset.name}</option>`))
            .join('');

        this.container.innerHTML = `
            <label for="presetSelect">Preset
                <select id="presetSelect" class="preset-select">${optionsHtml}</select>
            </label>
            <button id="randomPresetBtn" type="button" class="preset-random-button">Random Sound</button>
        `;
    }

    cacheElements() {
        this.selectEl = this.container.querySelector('#presetSelect');
        this.randomBtn = this.container.querySelector('#randomPresetBtn');
    }

    bindEvents() {
        if (this.selectEl) {
            const handler = (event) => {
                const presetId = event.target.value;
                const preset = getPresetById(presetId);
                if (!preset) return;
                this.currentPresetId = presetId;
                this.applyPreset(preset, { isRandom: false });
            };
            this.selectEl.addEventListener('change', handler);
            this._handlers.push({ target: this.selectEl, type: 'change', handler });
        }

        if (this.randomBtn) {
            const handler = () => {
                const randomPreset = generateRandomPreset();
                this.currentPresetId = randomPreset.id;
                if (this.selectEl) {
                    this.selectEl.selectedIndex = 0;
                }
                this.applyPreset(randomPreset, { isRandom: true });
            };
            this.randomBtn.addEventListener('click', handler);
            this._handlers.push({ target: this.randomBtn, type: 'click', handler });
        }
    }

    applyPreset(preset, { isRandom }) {
        if (!preset?.values) return;

        const patch = { ...preset.values };

        Object.entries(patch).forEach(([path, value]) => {
            this.synthEngine.setParameter(path, value);
        });

        this.syncEffectBypassedState(patch);

        this.eventBus.dispatchEvent(new CustomEvent('preset-loaded', {
            detail: {
                preset: patch,
                meta: {
                    id: preset.id,
                    name: preset.name,
                    isRandom: Boolean(isRandom),
                    engineApplied: true
                }
            }
        }));

        const statusMessage = isRandom
            ? `Surprise patch generated: ${preset.name}`
            : `Loaded preset: ${preset.name}`;

        this.eventBus.dispatchEvent(new CustomEvent('status-update', {
            detail: { message: statusMessage, type: 'info' }
        }));
    }

    syncEffectBypassedState(patch) {
        EFFECT_NAMES.forEach(effectName => {
            const wetPath = `${effectName}.wet`;
            if (patch[wetPath] !== undefined) {
                const sliderValue = Number(patch[wetPath]);
                const shouldEnable = sliderValue > 0.001;
                this.eventBus.dispatchEvent(new CustomEvent('effect-toggle', {
                    detail: { effectName, enabled: shouldEnable }
                }));
                if (shouldEnable) {
                    // Re-apply the desired wet amount after toggle may override it
                    this.synthEngine.setParameter(wetPath, sliderValue);
                }
            }
        });
    }

    destroy() {
        this._handlers.forEach(({ target, type, handler }) => {
            target.removeEventListener(type, handler);
        });
        this._handlers = [];
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}

export default PresetManager;
