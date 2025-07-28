/**
 * @file EnhancedControls.js
 * @description UI Control module for the BOP Synthesizer.
 * Manages all synthesizer controls as a singleton object.
 */

// FIX 1: Export a singleton object, not a class.
const EnhancedControls = {
    // The panel element will be stored here after init.
    panel: null,

    // The init function now acts as the entry point.
    init() {
        // FIX 2: Use the global `document` to find the panel, not a mainComponent.
        this.panel = document.getElementById('control-panel');
        
        if (!this.panel) {
            console.warn('[EnhancedControls] Cannot initialize; control panel element not found.');
            return;
        }

        // Render the control panel HTML
        this.panel.innerHTML = this.panelHTML();

        // Set up all control sections. `this` refers to the EnhancedControls object.
        this.setupToggles(this.panel);
        this.setupEffects(this.panel);
        this.setupAudioSafety(this.panel);
        this.setupEnvelope(this.panel);
        this.setupOscillator(this.panel);
        
        // Update the display values once to match the initial state of the sliders.
        this.updateAllDisplayValues();

        console.log('[EnhancedControls] Initialized successfully');
    },

    /**
     * Centralized function to send parameter changes to the synth engine.
     * @param {string} path - The parameter path (e.g., 'effects.reverb.wet').
     * @param {*} value - The value to set.
     */
    setSynthParam(path, value) {
        if (window.synthApp && window.synthApp.synth) {
            window.synthApp.synth.setParameter(path, value);
        } else {
            console.warn('[EnhancedControls] Synth engine not ready, cannot set parameter.');
        }
    },

    // LINK SLIDER: The core of the UI logic.
    // FIX 3: Refactored to call `setSynthParam` directly instead of emitting events.
    linkSlider(sliderSel, inputSel, valueSel, paramPath, formatter) {
        const slider = this.panel.querySelector(sliderSel);
        const input = inputSel ? this.panel.querySelector(inputSel) : null;
        const valueDisplay = valueSel ? this.panel.querySelector(valueSel) : null;

        if (!slider) return;

        const updateUIAndSynth = (val) => {
            const numericValue = parseFloat(val);
            
            // Update the linked text input if it exists
            if (input) input.value = numericValue;
            
            // Update the value display span
            if (valueDisplay) {
                valueDisplay.textContent = formatter ? formatter(numericValue) : numericValue;
            }
            
            // Send the change to the synth engine
            this.setSynthParam(paramPath, numericValue);
        };
        
        // Set up event listeners
        slider.addEventListener('input', (e) => updateUIAndSynth(e.target.value));
        if (input) {
            input.addEventListener('change', (e) => {
                let v = parseFloat(e.target.value);
                if (slider.min !== undefined) v = Math.max(parseFloat(slider.min), v);
                if (slider.max !== undefined) v = Math.min(parseFloat(slider.max), v);
                slider.value = v;
                updateUIAndSynth(v);
            });
        }
    },

    // --- SETUP FUNCTIONS ---
    // These functions now call the refactored `linkSlider` method.

    setupAudioSafety(panel) {
        // Master Volume is a special case, handled by a dedicated method on SynthEngine
        const masterVolSlider = panel.querySelector('#masterVolume');
        if (masterVolSlider) {
            masterVolSlider.addEventListener('input', e => {
                if (window.synthApp.synth.setMasterVolume) {
                    window.synthApp.synth.setMasterVolume(parseFloat(e.target.value));
                }
            });
        }

        this.linkSlider('#limiterThreshold', '#limiterThresholdInput', '#limiterThresholdVal', 'effects.limiter.threshold', v => `${v.toFixed(1)}dB`);

        const emergencyBtn = panel.querySelector('#emergencyStop');
        if (emergencyBtn) {
            emergencyBtn.onclick = () => {
                if(window.synthApp.synth) window.synthApp.synth.releaseAll();
            };
        }
    },
    
    setupEnvelope(panel) {
        this.linkSlider('#envelopeAttack', '#envelopeAttackInput', '#envelopeAttackVal', 'polySynth.envelope.attack', v => v.toFixed(3));
        this.linkSlider('#envelopeDecay', '#envelopeDecayInput', '#envelopeDecayVal', 'polySynth.envelope.decay', v => v.toFixed(3));
        this.linkSlider('#envelopeSustain', '#envelopeSustainInput', '#envelopeSustainVal', 'polySynth.envelope.sustain', v => v.toFixed(2));
        this.linkSlider('#envelopeRelease', '#envelopeReleaseInput', '#envelopeReleaseVal', 'polySynth.envelope.release', v => v.toFixed(3));
        // Note: Presets would need to be handled separately by updating multiple slider values and synth params.
    },
    
    setupOscillator(panel) {
        const waveformSelect = panel.querySelector('#waveform');
        if (waveformSelect) {
            waveformSelect.addEventListener('change', e => {
                this.setSynthParam('polySynth.oscillator.type', e.target.value);
            });
        }
        this.linkSlider('#detune', '#detuneInput', '#detuneVal', 'polySynth.detune');
    },

    setupEffects(panel) {
        // Effect wet/dry levels and enables
        const effects = ['reverb', 'delay', 'chorus', 'distortion', 'filter', 'phaser', 'tremolo', 'vibrato'];
        effects.forEach(name => {
            const enableCheck = panel.querySelector(`#${name}Enable`);
            if (enableCheck) {
                enableCheck.addEventListener('change', e => {
                    const wetValue = e.target.checked ? (panel.querySelector(`#${name}Wet`)?.value || 1) : 0;
                    this.setSynthParam(`effects.${name}.wet`, wetValue);
                });
            }
            const wetSlider = panel.querySelector(`#${name}Wet`);
            if (wetSlider) {
                 this.linkSlider(`#${name}Wet`, null, `#${name}WetVal`, `effects.${name}.wet`, v => `${Math.round(v * 100)}%`);
            }
        });

        // Other specific effect params
        this.linkSlider('#delayTime', null, '#delayTimeVal', 'effects.delay.delayTime', v => `${v.toFixed(2)}s`);
        this.linkSlider('#delayFeedback', null, '#delayFeedbackVal', 'effects.delay.feedback', v => v.toFixed(2));
        this.linkSlider('#reverbDecay', null, '#reverbDecayVal', 'effects.reverb.decay', v => `${v.toFixed(1)}s`);
        this.linkSlider('#filterFreq', '#filterFreqInput', '#filterFreqVal', 'effects.filter.baseFrequency', v => `${Math.round(v)}Hz`);
        this.linkSlider('#filterQ', '#filterQInput', '#filterQVal', 'effects.filter.Q', v => v.toFixed(1));
        
        // LFO start/stop (special cases)
        const filterLFOEnable = panel.querySelector('#filterLFOEnable'); // Assuming this ID exists for the filter's LFO
        if (filterLFOEnable) {
            filterLFOEnable.addEventListener('change', e => {
                const filterNode = window.synthApp.synth.nodes.filter;
                if (filterNode) {
                    e.target.checked ? filterNode.start() : filterNode.stop();
                }
            });
        }
    },
    
    // The rest of the utility functions and HTML generation remain largely the same.
    // They don't depend on the external component.
    panelHTML() { /* ... your existing HTML generation code ... */ },
    setupToggles(panel) { /* ... your existing toggle setup code ... */ },
    updateAllDisplayValues() { /* ... your existing display update code ... */ }
};

// HTML Generation (moved inside the object or kept here for clarity)
EnhancedControls.panelHTML = function() { /* ... copy your full panelHTML function here ... */ return `...`; };
EnhancedControls.setupToggles = function(panel) { /* ... copy your full setupToggles function here ... */ };
EnhancedControls.updateAllDisplayValues = function() { /* ... copy your full updateAllDisplayValues function here ... */ };

// Make the object the default export
export default EnhancedControls;