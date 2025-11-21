/**
 * UIController.js
 * Manages UI state and connects controls to synth engine
 */

export class UIController {
  constructor(container, synthEngine, presetManager) {
    this.container = container;
    this.synthEngine = synthEngine;
    this.presetManager = presetManager;
    this.controls = new Map();
  }
  
  render() {
    const content = document.createElement('div');
    content.className = 'mothy-g-content';
    
    // Preset browser
    content.appendChild(this.createPresetBrowser());
    
    // Control sections
    const controlsSection = document.createElement('div');
    controlsSection.className = 'controls-section';
    
    controlsSection.appendChild(this.createOscillatorControls());
    controlsSection.appendChild(this.createFilterControls());
    controlsSection.appendChild(this.createEnvelopeControls());
    controlsSection.appendChild(this.createEffectsControls());
    
    content.appendChild(controlsSection);
    
    this.container.appendChild(content);
    
    // Load initial preset
    const presets = this.presetManager.getPresets();
    if (presets.length > 0) {
      this.loadPreset(presets[0]);
    }
  }
  
  createPresetBrowser() {
    const browser = document.createElement('div');
    browser.className = 'preset-browser';
    
    const header = document.createElement('div');
    header.className = 'preset-header';
    
    const title = document.createElement('div');
    title.className = 'preset-title';
    title.textContent = '♥ Presets';
    
    const actions = document.createElement('div');
    actions.className = 'preset-actions';
    
    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn btn-secondary btn-small';
    saveBtn.textContent = 'Save';
    saveBtn.onclick = () => this.saveCurrentPreset();
    
    const exportBtn = document.createElement('button');
    exportBtn.className = 'btn btn-secondary btn-small';
    exportBtn.textContent = 'Export';
    exportBtn.onclick = () => this.presetManager.exportPresets();
    
    const importBtn = document.createElement('button');
    importBtn.className = 'btn btn-secondary btn-small';
    importBtn.textContent = 'Import';
    importBtn.onclick = () => this.importPresets();
    
    actions.appendChild(saveBtn);
    actions.appendChild(exportBtn);
    actions.appendChild(importBtn);
    
    header.appendChild(title);
    header.appendChild(actions);
    
    const select = document.createElement('select');
    select.className = 'preset-select';
    
    const presets = this.presetManager.getPresets();
    const categories = this.presetManager.getCategories();
    
    categories.forEach(category => {
      const optgroup = document.createElement('optgroup');
      optgroup.label = category;
      
      const categoryPresets = this.presetManager.getPresetsByCategory(category);
      categoryPresets.forEach(preset => {
        const option = document.createElement('option');
        option.value = preset.name;
        option.textContent = preset.name;
        optgroup.appendChild(option);
      });
      
      select.appendChild(optgroup);
    });
    
    select.onchange = (e) => {
      const preset = this.presetManager.getPreset(e.target.value);
      if (preset) {
        this.loadPreset(preset);
      }
    };
    
    this.presetSelect = select;
    
    browser.appendChild(header);
    browser.appendChild(select);
    
    return browser;
  }
  
  createOscillatorControls() {
    const group = this.createControlGroup('Oscillator');
    
    this.addSelectControl(group, 'Wave', 'osc1Type', [
      { value: 'sine', label: 'Sine' },
      { value: 'triangle', label: 'Triangle' },
      { value: 'sawtooth', label: 'Sawtooth' },
      { value: 'square', label: 'Square' }
    ]);
    
    this.addSliderControl(group, 'Detune', 'osc1Detune', -50, 50, 1, 'cents');
    this.addSliderControl(group, 'Volume', 'osc1Volume', -40, 0, 1, 'dB');
    
    return group;
  }
  
  createFilterControls() {
    const group = this.createControlGroup('Filter');
    
    this.addSelectControl(group, 'Type', 'filterType', [
      { value: 'lowpass', label: 'Low Pass' },
      { value: 'highpass', label: 'High Pass' },
      { value: 'bandpass', label: 'Band Pass' }
    ]);
    
    this.addSliderControl(group, 'Cutoff', 'filterFreq', 20, 20000, 1, 'Hz', true);
    this.addSliderControl(group, 'Resonance', 'filterQ', 0.1, 20, 0.1, '');
    this.addSliderControl(group, 'Env Amount', 'filterEnvAmount', 0, 10000, 1, 'Hz');
    
    return group;
  }
  
  createEnvelopeControls() {
    const group = this.createControlGroup('Envelopes');
    
    // Amp envelope
    const ampTitle = document.createElement('div');
    ampTitle.style.fontSize = '0.75rem';
    ampTitle.style.fontWeight = '600';
    ampTitle.style.color = 'var(--color-text-light)';
    ampTitle.style.marginTop = 'var(--spacing-sm)';
    ampTitle.textContent = 'Amplitude';
    group.appendChild(ampTitle);
    
    this.addSliderControl(group, 'Attack', 'ampAttack', 0.001, 2, 0.001, 's', true);
    this.addSliderControl(group, 'Decay', 'ampDecay', 0.001, 2, 0.001, 's', true);
    this.addSliderControl(group, 'Sustain', 'ampSustain', 0, 1, 0.01, '');
    this.addSliderControl(group, 'Release', 'ampRelease', 0.001, 5, 0.001, 's', true);
    
    // Filter envelope
    const filterTitle = document.createElement('div');
    filterTitle.style.fontSize = '0.75rem';
    filterTitle.style.fontWeight = '600';
    filterTitle.style.color = 'var(--color-text-light)';
    filterTitle.style.marginTop = 'var(--spacing-md)';
    filterTitle.textContent = 'Filter';
    group.appendChild(filterTitle);
    
    this.addSliderControl(group, 'Attack', 'filterAttack', 0.001, 2, 0.001, 's', true);
    this.addSliderControl(group, 'Decay', 'filterDecay', 0.001, 2, 0.001, 's', true);
    this.addSliderControl(group, 'Sustain', 'filterSustain', 0, 1, 0.01, '');
    this.addSliderControl(group, 'Release', 'filterRelease', 0.001, 5, 0.001, 's', true);
    
    return group;
  }
  
  createEffectsControls() {
    const group = this.createControlGroup('Effects');
    
    this.addSliderControl(group, 'Reverb', 'reverbMix', 0, 1, 0.01, '');
    this.addSliderControl(group, 'Delay', 'delayMix', 0, 1, 0.01, '');
    this.addSliderControl(group, 'Chorus', 'chorusMix', 0, 1, 0.01, '');
    this.addSliderControl(group, 'Master', 'masterVolume', -40, 0, 1, 'dB');
    
    return group;
  }
  
  createControlGroup(title) {
    const group = document.createElement('div');
    group.className = 'control-group';
    
    const titleEl = document.createElement('div');
    titleEl.className = 'control-group-title';
    titleEl.textContent = title;
    
    group.appendChild(titleEl);
    
    return group;
  }
  
  addSliderControl(group, label, param, min, max, step, unit, logarithmic = false) {
    const row = document.createElement('div');
    row.className = 'control-row';
    
    const labelEl = document.createElement('div');
    labelEl.className = 'control-label';
    labelEl.textContent = label;
    
    const inputContainer = document.createElement('div');
    inputContainer.className = 'control-input';
    
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = logarithmic ? Math.log(min) : min;
    slider.max = logarithmic ? Math.log(max) : max;
    slider.step = logarithmic ? (Math.log(max) - Math.log(min)) / 1000 : step;
    
    const currentValue = this.synthEngine.params[param];
    slider.value = logarithmic ? Math.log(currentValue) : currentValue;
    
    const valueDisplay = document.createElement('div');
    valueDisplay.className = 'control-value';
    valueDisplay.textContent = this.formatValue(currentValue, unit);
    
    slider.oninput = (e) => {
      const value = logarithmic ? Math.exp(parseFloat(e.target.value)) : parseFloat(e.target.value);
      this.synthEngine.updateParam(param, value);
      valueDisplay.textContent = this.formatValue(value, unit);
    };
    
    inputContainer.appendChild(slider);
    inputContainer.appendChild(valueDisplay);
    
    row.appendChild(labelEl);
    row.appendChild(inputContainer);
    
    group.appendChild(row);
    
    this.controls.set(param, { slider, valueDisplay, logarithmic, unit });
  }
  
  addSelectControl(group, label, param, options) {
    const row = document.createElement('div');
    row.className = 'control-row';
    
    const labelEl = document.createElement('div');
    labelEl.className = 'control-label';
    labelEl.textContent = label;
    
    const inputContainer = document.createElement('div');
    inputContainer.className = 'control-input';
    
    const select = document.createElement('select');
    
    options.forEach(opt => {
      const option = document.createElement('option');
      option.value = opt.value;
      option.textContent = opt.label;
      select.appendChild(option);
    });
    
    select.value = this.synthEngine.params[param];
    
    select.onchange = (e) => {
      this.synthEngine.updateParam(param, e.target.value);
    };
    
    inputContainer.appendChild(select);
    
    row.appendChild(labelEl);
    row.appendChild(inputContainer);
    
    group.appendChild(row);
    
    this.controls.set(param, { select });
  }
  
  formatValue(value, unit) {
    let formatted;
    if (value >= 1000) {
      formatted = (value / 1000).toFixed(1) + 'k';
    } else if (value >= 1) {
      formatted = value.toFixed(2);
    } else {
      formatted = value.toFixed(3);
    }
    return formatted + unit;
  }
  
  loadPreset(preset) {
    this.synthEngine.loadPreset(preset);
    this.presetManager.setCurrentPreset(preset);
    
    // Update UI controls
    Object.keys(preset.params).forEach(param => {
      const control = this.controls.get(param);
      if (control) {
        const value = preset.params[param];
        
        if (control.slider) {
          control.slider.value = control.logarithmic ? Math.log(value) : value;
          control.valueDisplay.textContent = this.formatValue(value, control.unit);
        } else if (control.select) {
          control.select.value = value;
        }
      }
    });
    
    // Update preset select
    if (this.presetSelect) {
      this.presetSelect.value = preset.name;
    }
  }
  
  saveCurrentPreset() {
    const name = prompt('Enter preset name:', 'My Preset');
    if (name) {
      const params = this.synthEngine.getCurrentParams();
      this.presetManager.savePreset(name, params);
      this.updatePresetSelect();
      alert(`Preset "${name}" saved!`);
    }
  }
  
  importPresets() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (file) {
        try {
          const count = await this.presetManager.importPresets(file);
          this.updatePresetSelect();
          alert(`Successfully imported ${count} preset(s)!`);
        } catch (error) {
          alert('Failed to import presets: ' + error.message);
        }
      }
    };
    
    input.click();
  }
  
  updatePresetSelect() {
    const currentValue = this.presetSelect.value;
    this.presetSelect.innerHTML = '';
    
    const categories = this.presetManager.getCategories();
    categories.forEach(category => {
      const optgroup = document.createElement('optgroup');
      optgroup.label = category;
      
      const categoryPresets = this.presetManager.getPresetsByCategory(category);
      categoryPresets.forEach(preset => {
        const option = document.createElement('option');
        option.value = preset.name;
        option.textContent = preset.name;
        optgroup.appendChild(option);
      });
      
      this.presetSelect.appendChild(optgroup);
    });
    
    this.presetSelect.value = currentValue;
  }
}
