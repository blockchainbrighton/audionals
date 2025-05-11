// js/module_factory/audio_component_factory.js
import { audioCtx } from '../audio_context.js';

/**
 * Factory-helper that instantiates an audio node *and* its UI wrapper.
 * Every module still owns its own DOM; this file only routes the call.
 *
 * @param {string}      type          — module type (e.g. "samplePlayer")
 * @param {HTMLElement} parentElement — the module’s root div (already on canvas)
 * @returns {Promise<object>}         — { id, type, audioNode, … }
 */
export async function createAudioNodeAndUI(type, parentElement) {
  const moduleId  = parentElement.id;      // set earlier by module_factory.js
  let   moduleData = null;                 // will hold the object each module returns

  switch (type) {
    /* ───────────────────────── basic building-blocks ───────────────────────── */
    case 'oscillator': {
      const { createOscillatorModule } = await import('./modules/oscillator.js');
      moduleData = createOscillatorModule(audioCtx, parentElement, moduleId);
      break;
    }
    case 'gain': {
      const { createGainModule } = await import('./modules/gain.js');
      moduleData = createGainModule(audioCtx, parentElement, moduleId);
      break;
    }
    case 'filter': {
      const { createFilterModule } = await import('./modules/filter.js');
      moduleData = createFilterModule(audioCtx, parentElement, moduleId);
      break;
    }
    case 'lfo': {
      const { createLfoModule } = await import('./modules/lfo.js');
      moduleData = createLfoModule(audioCtx, parentElement, moduleId);
      break;
    }
    case 'output': {
      moduleData = { audioNode: audioCtx.destination };
      break;
    }

    /* ─────────────────────────── advanced modules ─────────────────────────── */
    case 'samplePlayer': {
      const { createSamplePlayerModule } = await import('./modules/sample_player.js');
      // NOTE: createSamplePlayerModule internally imports audioCtx,
      // so we *only* pass parentElement + id.
      moduleData = createSamplePlayerModule(parentElement, moduleId);
      break;
    }
    case 'sequencer': {
      const { createSequencerModule } = await import('./modules/sequencer.js');
      moduleData = createSequencerModule(parentElement, moduleId);
      break;
    }
    case 'bpmClock': {
      const { createBpmClockModule } = await import('./modules/bpm_clock.js');
      moduleData = createBpmClockModule(parentElement, moduleId);
      break;
    }

    /* ─────────────────────────────── default ──────────────────────────────── */
    default:
      console.error(`Unknown module type “${type}” (ID: ${moduleId})`);
      return null;
  }

  /* ── normalise the object so callers can rely on the same keys ─────────── */
  return {
    id        : moduleId,
    type,
    audioNode : moduleData?.audioNode ?? null,
    ...moduleData          // keeps any extra helpers (play, loadAudioBuffer, …)
  };
}
