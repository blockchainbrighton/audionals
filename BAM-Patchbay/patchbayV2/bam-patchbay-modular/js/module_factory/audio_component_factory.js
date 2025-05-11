// js/module_factory/audio_component_factory.js
import { audioCtx } from '../audio_context.js';

export async function createAudioNodeAndUI(type, parentElement) {
  let moduleData;
  const moduleId = parentElement.id; // parentElement.id is set to the moduleId in module_factory.js

  switch (type) {
    case 'oscillator':
      const { createOscillatorModule } = await import('./modules/oscillator.js');
      const oscNode = createOscillatorModule(audioCtx, parentElement); // oscillator.js could also take moduleId for logging
      moduleData = { audioNode: oscNode, id: moduleId, type };
      break;
    case 'gain':
      const { createGainModule } = await import('./modules/gain.js');
      const gainNode = createGainModule(audioCtx, parentElement); // gain.js could take moduleId
      moduleData = { audioNode: gainNode, id: moduleId, type };
      break;
    case 'filter':
      const { createFilterModule } = await import('./modules/filter.js');
      const filterNode = createFilterModule(audioCtx, parentElement); // filter.js could take moduleId
      moduleData = { audioNode: filterNode, id: moduleId, type };
      break;
    case 'lfo':
      const { createLfoModule } = await import('./modules/lfo.js');
      const lfoGainNode = createLfoModule(audioCtx, parentElement); // lfo.js could take moduleId
      moduleData = { audioNode: lfoGainNode, id: moduleId, type };
      break;
    case 'output':
      moduleData = { audioNode: audioCtx.destination, id: moduleId, type };
      break;

    case 'samplePlayer':
      const { createSamplePlayerModule } = await import('./modules/sample_player.js');
      moduleData = createSamplePlayerModule(parentElement, moduleId); // Pass moduleId
      break;
    case 'sequencer':
      const { createSequencerModule } = await import('./modules/sequencer.js');
      moduleData = createSequencerModule(parentElement, moduleId); // Pass moduleId
      break;
    case 'bpmClock':
      const { createBpmClockModule } = await import('./modules/bpm_clock.js');
      moduleData = createBpmClockModule(parentElement, moduleId); // bpm_clock.js could take moduleId
      break;

    default:
      console.error(`Unknown module type "${type}" for audio/UI (ID: ${moduleId})`);
      return null;
  }

  // Ensure basic structure if not fully provided by module creator
  if (moduleData && !moduleData.type) moduleData.type = type;
  if (moduleData && !moduleData.id) moduleData.id = moduleId;
  if (moduleData && moduleData.audioNode === undefined) moduleData.audioNode = null;

  return moduleData;
}