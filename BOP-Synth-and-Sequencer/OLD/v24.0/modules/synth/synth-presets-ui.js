import { PRESET_BANK, getPresetById } from './synth-presets.js';

export class PresetSelector {
    constructor(containerElement, eventBus) {
        this.container = containerElement;
        this.eventBus = eventBus;
        this.selectEl = null;
        this.randomBtn = null;
        this.labelEl = null;
        this.currentPresetId = '';
        this._boundPresetLoaded = this.handlePresetLoaded.bind(this);

        if (this.container) {
            this.init();
        }
    }

    init() {
        this.selectEl = this.container.querySelector('[data-role="preset-select"]');
        this.randomBtn = this.container.querySelector('[data-role="preset-random"]');
        this.labelEl = this.container.querySelector('[data-role="preset-label"]');

        this.populateOptions();
        this.updateLabel('Custom');

        if (this.selectEl) {
            this.selectEl.addEventListener('change', this.handleSelectChange);
        }

        if (this.randomBtn) {
            this.randomBtn.addEventListener('click', this.handleRandomise);
        }

        if (this.eventBus) {
            this.eventBus.addEventListener('preset-loaded', this._boundPresetLoaded);
        }
    }

    populateOptions() {
        if (!this.selectEl) return;
        this.selectEl.innerHTML = '';
        const fragment = document.createDocumentFragment();

        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = 'Manual / Custom';
        fragment.appendChild(placeholder);

        PRESET_BANK.forEach(preset => {
            const option = document.createElement('option');
            option.value = preset.id;
            option.textContent = preset.name;
            fragment.appendChild(option);
        });

        this.selectEl.appendChild(fragment);
    }

    handleSelectChange = event => {
        const presetId = event.target.value;
        if (!presetId) {
            this.currentPresetId = '';
            this.updateLabel('Custom');
            return;
        }

        this.currentPresetId = presetId;
        const preset = getPresetById(presetId);
        if (preset) this.updateLabel(preset.name);
        this.eventBus.dispatchEvent(new CustomEvent('preset-select', {
            detail: { presetId }
        }));
    };

    handleRandomise = () => {
        this.currentPresetId = '';
        if (this.selectEl) this.selectEl.value = '';
        this.eventBus.dispatchEvent(new CustomEvent('preset-randomize'));
    };

    handlePresetLoaded(event) {
        const { id = '', name = 'Custom' } = event.detail || {};
        this.currentPresetId = id || '';

        if (this.selectEl) {
            const presetExists = !!(this.currentPresetId && getPresetById(this.currentPresetId));
            this.selectEl.value = presetExists ? this.currentPresetId : '';
        }

        this.updateLabel(name || 'Custom');
    }

    updateLabel(text) {
        if (this.labelEl) {
            this.labelEl.textContent = text;
        }
    }

    getUIState() {
        return {
            selectedId: this.currentPresetId,
            label: this.labelEl ? this.labelEl.textContent : 'Custom'
        };
    }

    applyUIState(state) {
        if (!state) return;
        const { selectedId = '', label } = state;
        this.currentPresetId = selectedId;

        if (this.selectEl) {
            const exists = !!(selectedId && getPresetById(selectedId));
            this.selectEl.value = exists ? selectedId : '';
        }

        if (label) {
            this.updateLabel(label);
        } else if (selectedId) {
            const preset = getPresetById(selectedId);
            this.updateLabel(preset ? preset.name : 'Custom');
        } else {
            this.updateLabel('Custom');
        }
    }

    destroy() {
        if (this.selectEl) {
            this.selectEl.removeEventListener('change', this.handleSelectChange);
        }
        if (this.randomBtn) {
            this.randomBtn.removeEventListener('click', this.handleRandomise);
        }
        if (this.eventBus) {
            this.eventBus.removeEventListener('preset-loaded', this._boundPresetLoaded);
        }
    }
}

export default PresetSelector;
