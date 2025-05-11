// js/module_factory/module_factory.js
import { audioCtx } from '../audio_context.js';

/**
 * Dynamically loads and creates the AudioNode and associated UI for a given module type.
 * @param {string} type - The type of the module ('oscillator', 'gain', 'output', 'filter', 'lfo').
 * @param {HTMLElement} parentElement - The module's main DOM element to append UI to.
 * @returns {Promise<AudioNode|AudioDestinationNode|null>} The created AudioNode or null if type is unknown.
 */
export async function createAudioNodeAndUI(type, parentElement) {
  let audioNode;

  switch (type) {
    case 'oscillator':
      const { createOscillatorModule } = await import('./modules/oscillator.js');
      audioNode = createOscillatorModule(audioCtx, parentElement);
      break;
    case 'gain':
      const { createGainModule } = await import('./modules/gain.js');
      audioNode = createGainModule(audioCtx, parentElement);
      break;
    case 'filter':
      const { createFilterModule } = await import('./modules/filter.js');
      audioNode = createFilterModule(audioCtx, parentElement);
      break;
    case 'lfo':
      const { createLfoModule } = await import('./modules/lfo.js');
      audioNode = createLfoModule(audioCtx, parentElement);
      break;
    case 'output':
      audioNode = audioCtx.destination;
      // No specific UI created by this factory for 'output'
      // You might add a simple label if desired:
      // const outputLabel = document.createElement('p');
      // outputLabel.textContent = 'Master Output';
      // parentElement.appendChild(outputLabel);
      break;
    default:
      console.error("Unknown module type for audio/UI:", type);
      return null;
  }
  return audioNode;
}