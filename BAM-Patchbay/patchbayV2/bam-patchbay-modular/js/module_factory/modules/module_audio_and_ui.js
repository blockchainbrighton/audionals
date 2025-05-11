// js/module_factory/module_audio_and_ui.js
import { audioCtx } from '../audio_context.js';
import { createModule } from '../modules/factory.js';

/**
 * Dynamically creates the AudioNode *and* its UI for the requested module
 * by delegating to the universal factory backed by MODULE_DEFS.
 *
 * @param {string}      type          e.g. "oscillator", "gain", "filter", …
 * @param {HTMLElement} parentElement Container into which UI controls will be injected
 * @param {string=}     id            Optional unique id for the new module
 * @returns {Promise<object|null>}    Module data or null on unknown type
 */
export async function createAudioNodeAndUI(type, parentElement, id) {
  try {
    return await createModule(type, audioCtx, parentElement, id);
  } catch (err) {
    console.error('createAudioNodeAndUI:', err);
    return null;
  }
}
