// module_factory.js
import { audioCtx } from './audio_context.js';
import { canvas } from './dom_elements.js';
// Corrected import statement to include getModule
import { state, getNextModuleId, addModule, getModule } from './shared_state.js';
import { handleConnectorClick, handleDisconnect } from './connection_manager.js';
import { enableModuleDrag } from './drag_drop_manager.js';

export function createModule(type, x, y) {
  const id = getNextModuleId();
  const mod = document.createElement('div');
  mod.className = 'module';
  mod.id = id;
  mod.style.left = x + 'px';
  mod.style.top = y + 'px';
  mod.dataset.type = type; // Store type for reference

  // Header
  const header = document.createElement('header');
  header.textContent = type.charAt(0).toUpperCase() + type.slice(1);
  mod.appendChild(header);

  // Audio node + UI
  let audioNode;
  if (type === 'oscillator') {
    audioNode = audioCtx.createOscillator();
    audioNode.frequency.value = 440;
    audioNode.start();
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = 100; slider.max = 1000; slider.value = 440;
    slider.addEventListener('input', () => audioNode.frequency.value = parseFloat(slider.value));
    mod.appendChild(slider);
  } else if (type === 'gain') {
    audioNode = audioCtx.createGain();
    audioNode.gain.value = 1;
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = 0; slider.max = 1; slider.step = 0.01; slider.value = 1;
    slider.addEventListener('input', () => audioNode.gain.value = parseFloat(slider.value));
    mod.appendChild(slider);
  } else if (type === 'output') { // 'output' is a common name for destination
    audioNode = audioCtx.destination;
  } else {
    console.error("Unknown module type:", type);
    return null; // Return null if module creation fails
  }

  // Connectors
  if (type !== 'output') { // Output modules typically don't have an audio output connector
    const out = document.createElement('div');
    out.className = 'connector output';
    out.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent module drag
      handleConnectorClick(id, 'output');
    });
    out.addEventListener('contextmenu', e => {
      e.preventDefault();
      e.stopPropagation();
      handleDisconnect(id, 'output');
    });
    mod.appendChild(out);
  }

  if (type !== 'oscillator') { // Oscillators typically don't have an audio input
    const inp = document.createElement('div');
    inp.className = 'connector input';
    inp.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent module drag
      handleConnectorClick(id, 'input');
    });
    inp.addEventListener('contextmenu', e => {
      e.preventDefault();
      e.stopPropagation();
      handleDisconnect(id, 'input');
    });
    mod.appendChild(inp);
  }

  canvas.appendChild(mod);
  addModule(id, { type, audioNode, element: mod });
  enableModuleDrag(mod, id); // Make the new module draggable

  return getModule(id); // This line now correctly references the imported getModule
}