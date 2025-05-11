// js/module_factory/module_connectors.js
import { MODULE_DEFS } from '../module_factory/modules/index.js';
import { handleConnectorClick, handleDisconnect } from '../connection_manager.js';

export function createAndAppendConnectors(type, moduleElement, moduleId, moduleInstanceData) {
  const def = MODULE_DEFS[type];
  if (!def) {
    console.error(`Unknown module type “${type}” (ID: ${moduleId})`);
    return;
  }

  // Audio output
  if (def.hasOut) {
    const out = document.createElement('div');
    out.className = 'connector output audio-output';
    out.title = 'Audio Output';
    out.addEventListener('click', e => {
      e.stopPropagation();
      handleConnectorClick(moduleId, 'output', 'audio');
    });
    out.addEventListener('contextmenu', e => {
      e.preventDefault(); e.stopPropagation();
      handleDisconnect(moduleId, 'output', 'audio');
    });
    moduleElement.appendChild(out);
  }

  // Audio input
  if (def.hasIn) {
    const inp = document.createElement('div');
    inp.className = 'connector input audio-input';
    inp.title = 'Audio Input';
    inp.addEventListener('click', e => {
      e.stopPropagation();
      handleConnectorClick(moduleId, 'input', 'audio');
    });
    inp.addEventListener('contextmenu', e => {
      e.preventDefault(); e.stopPropagation();
      handleDisconnect(moduleId, 'input', 'audio');
    });
    moduleElement.appendChild(inp);
  }

  // Trigger input
  if (def.hasTriggerIn) {
    const trigIn = document.createElement('div');
    trigIn.className = 'connector input trigger-input';
    trigIn.title = 'Trigger Input';
    trigIn.addEventListener('click', e => {
      e.stopPropagation();
      handleConnectorClick(moduleId, 'input', 'trigger');
    });
    trigIn.addEventListener('contextmenu', e => {
      e.preventDefault(); e.stopPropagation();
      handleDisconnect(moduleId, 'input', 'trigger');
    });
    moduleElement.appendChild(trigIn);
  }

  // Trigger output
  if (def.hasTriggerOut) {
    const trigOut = document.createElement('div');
    trigOut.className = 'connector output trigger-output';
    trigOut.title = 'Trigger Output';
    trigOut.addEventListener('click', e => {
      e.stopPropagation();
      handleConnectorClick(moduleId, 'output', 'trigger');
    });
    trigOut.addEventListener('contextmenu', e => {
      e.preventDefault(); e.stopPropagation();
      handleDisconnect(moduleId, 'output', 'trigger');
    });
    moduleElement.appendChild(trigOut);
  }

  // LFO Target / Modulation Inputs  <<< --- MOVED INSIDE THE FUNCTION
  if (def.lfoTargets && typeof def.lfoTargets === 'object' && Object.keys(def.lfoTargets).length > 0) {
      // Ensure def.lfoTargets is not null before trying to use Object.entries on it.
      // `null` is an object but doesn't have entries. `MODULE_DEFS` can have `lfoTargets: null`.
      if (def.lfoTargets !== null) { 
          Object.entries(def.lfoTargets).forEach(([targetUILabel, paramPathString]) => {
              if (!targetUILabel || !paramPathString) return; // Skip if undefined/null

              const modInput = document.createElement('div');
              modInput.className = `connector input lfo-target-input ${targetUILabel.toLowerCase().replace(/\s+/g, '-')}-input`;
              modInput.title = `Modulation Input: ${targetUILabel}`;
              modInput.dataset.paramKey = targetUILabel;
              
              modInput.addEventListener('click', e => {
                  e.stopPropagation();
                  handleConnectorClick(moduleId, 'input', 'modulation', targetUILabel);
              });
              modInput.addEventListener('contextmenu', e => {
                  e.preventDefault(); e.stopPropagation();
                  handleDisconnect(moduleId, 'input', 'modulation', targetUILabel);
              });
              moduleElement.appendChild(modInput);
          });
      }
  }
  // --- END OF LFO Target / Modulation Inputs ---

} // <<< --- Closing brace of createAndAppendConnectors