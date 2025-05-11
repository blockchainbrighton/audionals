// js/module_factory/module_factory.js
import { audioCtx } from '../audio_context.js';

/**
 * Dynamically loads and creates the AudioNode and associated UI for a given module type.
 * @param {string} type - The type of the module ('oscillator', 'gain', 'output', 'filter', 'lfo').
 * @param {HTMLElement} parentElement - The module's main DOM element to append UI to.
 * @returns {Promise<AudioNode|AudioDestinationNode|null>} The created AudioNode or null if type is unknown.
 */
export async function createAudioNodeAndUI(type, parentElement) {
    let moduleSpecificData; // This will be the object returned by create<Type>Module
  
    switch (type) {
      case 'oscillator':
        const { createOscillatorModule } = await import('./modules/oscillator.js');
        // Assuming createOscillatorModule returns { audioNode: theOscillatorNode, ...otherProps }
        moduleSpecificData = createOscillatorModule(audioCtx, parentElement);
        break;
      case 'gain':
        const { createGainModule } = await import('./modules/gain.js');
        // Assuming createGainModule returns { audioNode: theGainNode, ...otherProps }
        moduleSpecificData = createGainModule(audioCtx, parentElement);
        break;
      case 'filter':
        const { createFilterModule } = await import('./modules/filter.js');
        // Assuming createFilterModule returns { audioNode: theFilterNode, ...otherProps }
        moduleSpecificData = createFilterModule(audioCtx, parentElement);
        break;
      case 'lfo':
        const { createLfoModule } = await import('./modules/lfo.js');
        // createLfoModule already returns { audioNode: lfoDepth }
        moduleSpecificData = createLfoModule(audioCtx, parentElement);
        break;
      case 'output':
        // For output, we construct the object structure consistently
        moduleSpecificData = { audioNode: audioCtx.destination };
        break;
      default:
        console.error("Unknown module type for audio/UI:", type);
        return null;
    }
    // Your ADD THIS LOG here was:
    // console.log(`LFO Module: createAudioNodeAndUI returning for type ${type}:`, result);
    // It should log moduleSpecificData:
    // console.log(`Audio Component Factory: createAudioNodeAndUI returning for type ${type}:`, moduleSpecificData);
  
    return moduleSpecificData; // <<< Return the object directly
  }