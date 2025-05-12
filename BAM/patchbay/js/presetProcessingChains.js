// js/presetProcessingChains.js
import { createModule } from './module_factory/module_factory.js';
import { state, getModule } from './shared_state.js';
import { handleConnectorClick } from './connection_manager.js';

const MODULE_X_OFFSET = 220; // Horizontal spacing for chained modules
const MODULE_Y_OFFSET = 180; // Vertical spacing for parallel modules (e.g., LFO below/above main chain)

/**
 * Internal helper to programmatically connect two modules by simulating connector clicks.
 * @param {string} srcModuleId - The ID of the source module.
 * @param {string} srcConnectorType - The type of the source connector ('audio' or 'trigger').
 * @param {string} dstModuleId - The ID of the destination module.
 * @param {string} dstConnectorType - The type of the destination connector ('audio' or 'trigger').
 * @returns {Promise<boolean>} True if connection was likely successful, false otherwise.
 */
async function connectModules(srcModuleId, srcConnectorType, dstModuleId, dstConnectorType) {
  const srcModule = getModule(srcModuleId);
  const dstModule = getModule(dstModuleId);

  if (!srcModule || !dstModule) {
    console.error(`[PresetChain] connectModules: Module not found. Src: ${srcModuleId}, Dst: ${dstModuleId}`);
    return false;
  }

  handleConnectorClick(srcModuleId, 'output', srcConnectorType);

  if (!state.selectedConnector || state.selectedConnector.id !== srcModuleId) {
    console.error(`[PresetChain] connectModules: Failed to select source connector for ${srcModuleId} (${srcConnectorType}). Current selection:`, state.selectedConnector);
    if (state.selectedConnector && state.selectedConnector.elem) {
      state.selectedConnector.elem.classList.remove('selected');
    }
    state.selectedConnector = null;
    return false;
  }

  handleConnectorClick(dstModuleId, 'input', dstConnectorType);

  if (state.selectedConnector) {
    console.error(`[PresetChain] connectModules: Connection failed between ${srcModuleId} (${srcConnectorType}) and ${dstModuleId} (${dstConnectorType}). Pending selection:`, state.selectedConnector);
    if (state.selectedConnector.elem) {
      state.selectedConnector.elem.classList.remove('selected');
    }
    state.selectedConnector = null;
    return false;
  }

  console.log(`[PresetChain] Successfully connected ${srcModuleId} (${srcConnectorType}) to ${dstModuleId} (${dstConnectorType})`);
  return true;
}

/**
 * Creates a Sequencer -> Sample Player -> Gain -> Output audio processing chain.
 * The first step of the sequencer is activated.
 * @param {number} [initialX=250] - The X coordinate for the Sample Player (Sequencer will be to its left).
 * @param {number} [startY=50] - The initial Y coordinate for the chain.
 * @returns {Promise<object|null>} An object with created module instances and success status, or null on critical failure.
 */
export async function createSampleSequencedChain(initialX = 250, startY = 50) {
  console.log(`[PresetChain] Creating Sequencer -> Sample Player -> Gain -> Output chain at (${initialX - MODULE_X_OFFSET}, ${startY})`);
  try {
    const sequencer = await createModule('sequencer', initialX - MODULE_X_OFFSET, startY);
    if (!sequencer || !sequencer.id || !sequencer.element) throw new Error("Failed to create Sequencer module, its ID, or its element.");

    const samplePlayer = await createModule('samplePlayer', initialX, startY);
    if (!samplePlayer || !samplePlayer.id) throw new Error("Failed to create Sample Player module or it has no ID.");

    const gain = await createModule('gain', initialX + MODULE_X_OFFSET, startY);
    if (!gain || !gain.id) throw new Error("Failed to create Gain module or it has no ID.");

    const output = await createModule('output', initialX + (MODULE_X_OFFSET * 2), startY);
    if (!output || !output.id) throw new Error("Failed to create Output module or it has no ID.");

    // Connections
    let allConnectionsSuccessful = true;
    allConnectionsSuccessful &&= await connectModules(sequencer.id, 'trigger', samplePlayer.id, 'trigger');
    allConnectionsSuccessful &&= await connectModules(samplePlayer.id, 'audio', gain.id, 'audio');
    allConnectionsSuccessful &&= await connectModules(gain.id, 'audio', output.id, 'audio');

    // Activate the first step of the sequencer
    // This assumes sequencer steps have a class like 'step-button' or 'seq-step'
    // Adjust selector if your sequencer module has different UI element classes.
    if (sequencer.element) {
      const firstStepButton = sequencer.element.querySelector('.step-button'); // Common class, adjust if needed
      if (firstStepButton) {
        firstStepButton.click(); // Simulate click to activate
        console.log("[PresetChain] Activated first step of the sequencer.");
      } else {
        // Fallback if module exposes a method (ideal)
        if (typeof sequencer.setStepState === 'function') {
            sequencer.setStepState(0, true); // Assuming a method like setStepState(index, isActive)
            console.log("[PresetChain] Activated first step of the sequencer via method.");
        } else if (typeof sequencer.activateStep === 'function') {
            sequencer.activateStep(0); // Or activateStep(index)
            console.log("[PresetChain] Activated first step of the sequencer via method.");
        } else {
            console.warn("[PresetChain] Could not find a way to activate the first step of the sequencer. Neither '.step-button' nor known methods found.");
        }
      }
    }


    if (allConnectionsSuccessful) {
      console.log("[PresetChain] Sequencer -> Sample Player -> Gain -> Output chain created successfully.");
    } else {
      console.warn("[PresetChain] Some connections failed for Sequencer -> Sample Player -> Gain -> Output chain.");
    }
    return { sequencer, samplePlayer, gain, output, success: allConnectionsSuccessful };

  } catch (error) {
    console.error("[PresetChain] Critical error creating Sequencer -> Sample Player -> Gain -> Output chain:", error);
    return null;
  }
}

/**
 * Creates an Oscillator -> Gain (set to 0.1) -> Output audio processing chain.
 * @param {number} [startX=50] - The initial X coordinate for the Oscillator.
 * @param {number} [startY=150] - The initial Y coordinate for the chain.
 * @returns {Promise<object|null>} An object with created module instances ({osc, gain, output}) and success status, or null on critical failure.
 */
export async function createOscillatorGainOutputChain(startX = 50, startY = 150) {
  console.log(`[PresetChain] Creating Oscillator -> Gain (0.1) -> Output chain at (${startX}, ${startY})`);
  try {
    const osc = await createModule('oscillator', startX, startY);
    if (!osc || !osc.id || !osc.audioNode) throw new Error("Failed to create Oscillator module, its ID, or its audioNode.");

    // LFO module creation removed
    // const lfo = await createModule('lfo', startX, startY + MODULE_Y_OFFSET);
    // if (!lfo || !lfo.id) throw new Error("Failed to create LFO module or it has no ID.");

    const gain = await createModule('gain', startX + MODULE_X_OFFSET, startY);
    if (!gain || !gain.id || !gain.audioNode || !gain.audioNode.gain) throw new Error("Failed to create Gain module, its ID, its audioNode, or its gain AudioParam.");

    const output = await createModule('output', startX + (MODULE_X_OFFSET * 2), startY);
    if (!output || !output.id) throw new Error("Failed to create Output module or it has no ID.");

    // Set Gain module's master gain level
    gain.audioNode.gain.value = 0.1;
    console.log(`[PresetChain] Set gain module ${gain.id} master gain to 0.1`);
    // If gain module's UI has a control, it might need to be updated too for visual consistency.
    // For now, directly setting AudioParam affects sound.
    // e.g., if (typeof gain.setGain === 'function') { gain.setGain(0.1); }


    // Connections
    let allConnectionsSuccessful = true;
    allConnectionsSuccessful &&= await connectModules(osc.id, 'audio', gain.id, 'audio');
    // LFO connection removed
    // allConnectionsSuccessful &&= await connectModules(lfo.id, 'audio', gain.id, 'audio');
    allConnectionsSuccessful &&= await connectModules(gain.id, 'audio', output.id, 'audio');

    if (allConnectionsSuccessful) {
      console.log("[PresetChain] Oscillator -> Gain (0.1) -> Output chain created successfully.");
    } else {
      console.warn("[PresetChain] Some connections failed for Oscillator -> Gain (0.1) -> Output chain.");
    }
    // Updated return object to exclude LFO
    return { osc, gain, output, success: allConnectionsSuccessful };

  } catch (error) {
    // Updated error message to reflect the simpler chain
    console.error("[PresetChain] Critical error creating Oscillator -> Gain -> Output chain:", error);
    return null;
  }
}