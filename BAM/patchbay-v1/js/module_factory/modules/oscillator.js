// js/module_factory/modules/oscillator.js
// Assuming you might want to use your shared slider.js in the future.
// import { slider as createSharedSlider } from '../ui/slider.js';

/**
 * Creates an OscillatorNode, its UI, and allows its frequency to be modulated.
 * @param {AudioContext} audioCtx - The AudioContext.
 * @param {HTMLElement} parentElement - The module's main DOM element to append UI to.
 * @param {string} id - The unique ID for this module instance.
 * @returns {object} Module data including the audioNode and dispose method.
 */
export function createOscillatorModule(audioCtx, parentElement, id) {
    const mainOscillatorNode = audioCtx.createOscillator();

    // Internal ConstantSourceNode for manual frequency control via slider
    const manualFrequencyControl = audioCtx.createConstantSource();
    manualFrequencyControl.offset.value = 440; // Default A4
    manualFrequencyControl.connect(mainOscillatorNode.frequency);
    manualFrequencyControl.start(); // Start the ConstantSourceNode

    mainOscillatorNode.type = 'sawtooth'; // Default to sawtooth, can be made a UI choice
    mainOscillatorNode.start();

    // --- UI Setup ---
    parentElement.innerHTML = ''; // Clear any existing content
    const title = document.createElement('h3');
    title.textContent = `Oscillator ${id}`;
    parentElement.appendChild(title);

    // Waveform type selector
    const waveformSelectLabel = document.createElement('label');
    waveformSelectLabel.textContent = 'Wave: ';
    const waveformSelect = document.createElement('select');
    ['sine', 'square', 'sawtooth', 'triangle'].forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type.charAt(0).toUpperCase() + type.slice(1);
        if (type === mainOscillatorNode.type) option.selected = true;
        waveformSelect.appendChild(option);
    });
    waveformSelect.onchange = () => {
        mainOscillatorNode.type = waveformSelect.value;
    };
    waveformSelectLabel.appendChild(waveformSelect);
    parentElement.appendChild(waveformSelectLabel);
    parentElement.appendChild(document.createElement('br'));


    // Manual Frequency Slider (using basic elements like your original for consistency)
    const sliderContainer = document.createElement('div'); // Container for label, slider, display
    const label = document.createElement('label');
    const sliderId = `osc-freq-${id}`;
    label.textContent = 'Freq: ';
    label.htmlFor = sliderId;

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.id = sliderId;
    slider.min = 20;
    slider.max = 2000;
    slider.step = 1; // Use step 1 for whole Hz values
    slider.value = manualFrequencyControl.offset.value;
    slider.className = 'module-slider';

    const valueDisplay = document.createElement('span');
    valueDisplay.textContent = slider.value + ' Hz';

    slider.oninput = () => { // Use oninput for live updates
        const newFreq = parseFloat(slider.value);
        manualFrequencyControl.offset.value = newFreq;
        valueDisplay.textContent = newFreq + ' Hz';
    };
    
    sliderContainer.appendChild(label);
    sliderContainer.appendChild(slider);
    sliderContainer.appendChild(valueDisplay);
    parentElement.appendChild(sliderContainer);

    // Note: If you want the Arpeggiator to have "absolute" control,
    // the user should set the Oscillator's manual frequency slider to its minimum.
    // The Arpeggiator's output frequency will then be added to this minimum value.
    // E.g., if slider is at 20Hz, and Arp sends 440Hz, result is 460Hz.
    // If this summation is undesirable, more complex logic to disconnect/bypass
    // manualFrequencyControl when external modulation is present would be needed.

    return {
        id,
        audioNode: mainOscillatorNode, // This is the sound-producing node.
                                       // Its .frequency param is the modulation target.
        // Expose internal nodes if direct LFO targeting beyond audioNode.frequency is desired (e.g. mainOscillatorNode.detune)
        // For example, the `lfoTargets` in MODULE_DEFS would then refer to 'audioNode.frequency' or 'audioNode.detune'
        dispose() {
            mainOscillatorNode.stop();
            mainOscillatorNode.disconnect();
            manualFrequencyControl.stop();
            manualFrequencyControl.disconnect();
            parentElement.replaceChildren(); // Clear UI
            console.log(`[Oscillator ${id}] disposed`);
        }
    };
}