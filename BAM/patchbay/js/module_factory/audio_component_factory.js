// js/module_factory/audio_component_factory.js
import { audioCtx } from '../audio_context.js';
import { MODULE_DEFS } from './modules/index.js';

export async function createAudioNodeAndUI(type, parentElement) {
  const moduleId = parentElement.id;
  const def = MODULE_DEFS[type];
  if (!def) {
    console.error(`Unknown module type “${type}” (ID: ${moduleId})`);
    return null;
  }

  // delegate to the config’s create fn
  const moduleData = await def.create(audioCtx, parentElement, moduleId);

  return {
    id        : moduleId,
    type,
    audioNode : moduleData?.audioNode ?? null,
    ...moduleData
  };
}
