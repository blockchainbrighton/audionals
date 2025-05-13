// js/modules/factory.js
import { MODULE_DEFS } from './index.js';
import { audioCtx } from '../audio_context.js';
import { createModule } from './factory.js';
/**
 * Create a module from the declarative MODULE_DEFS table.
 *
 * @param {string}       type       Module key, e.g. "oscillator"
 * @param {AudioContext} audioCtx   Shared AudioContext instance
 * @param {HTMLElement}  parentEl   Element that will receive the module-specific UI
 * @param {string=}      id         Optional unique id; auto-generated if omitted
 * @returns {Promise<object>}       Module-specific data (always includes { audioNode })
 */
export async function createModule(type, audioCtx, parentEl, id = crypto.randomUUID?.()) {
  const def = MODULE_DEFS[type];
  if (!def) throw new Error(`Unknown module type "${type}"`);
  return def.create(audioCtx, parentEl, id);
}



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
