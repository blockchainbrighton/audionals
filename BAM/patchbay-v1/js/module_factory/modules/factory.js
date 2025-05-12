// js/modules/factory.js
import { MODULE_DEFS } from './index.js';

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
