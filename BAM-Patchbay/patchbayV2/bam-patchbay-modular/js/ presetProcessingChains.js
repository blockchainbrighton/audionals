// js/presetProcessingChains.js
import { createModule } from './module_factory/module_factory.js'; // Assuming this is the correct path as used in main.js
import { state, getModule } from './shared_state.js';
import { handleConnectorClick } from './connection_manager.js';

const MODULE_X_OFFSET = 220; // Horizontal spacing for chained modules
const MODULE_Y_OFFSET = 180; // Vertical spacing for parallel modules (e.g., LFO below oscillator line)

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

  // Simulate first click on source output connector.
  // handleConnectorClick will add 'selected' class to the connector element and set state.selectedConnector.
  handleConnectorClick(srcModuleId, 'output', srcConnectorType);

  // Verify selection.
  if (!state.selectedConnector || state.selectedConnector.id !== srcModuleId) {
    console.error(`[PresetChain] connectModules: Failed to select source connector for ${srcModuleId} (${srcConnectorType}). Current selection:`, state.selectedConnector);
    // Attempt to clear any erroneous selection state
    if (state.selectedConnector && state.selectedConnector.elem) {
      state.selectedConnector.elem.classList.remove('selected');
    }
    state.selectedConnector = null;
    return false;
  }

  // Simulate second click on destination input connector.
  // handleConnectorClick will attempt connection and clear state.selectedConnector on success.
  handleConnectorClick(dstModuleId, 'input', dstConnectorType);

  // If state.selectedConnector is null, the connection was successful.
  if (state.selectedConnector) {
    console.error(`[PresetChain] connectModules: Connection failed between ${srcModuleId} (${srcConnectorType}) and ${dstModuleId} (${dstConnectorType}). Pending selection:`, state.selectedConnector);
    // Attempt to clear the failed selection state
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
 * Creates a Sample Player -> Gain -> Output audio processing chain.
 * Modules are positioned horizontally starting at (startX, startY).
 * @param {number} [startX=50] - The initial X coordinate for the first module.
 * @param {number} [startY=50] - The initial Y coordinate for the chain.
 * @returns {Promise<object|null>} An object with created module instances and success status, or null on critical failure.
 */
export async function createSampleGainOutputChain(startX = 50, startY = 50) {
  console.log(`[PresetChain] Creating Sample Player -> Gain -> Output chain at (${startX}, ${startY})`);
  try {
    const samplePlayer = await createModule('samplePlayer', startX, startY);
    if (!samplePlayer || !samplePlayer.id) throw new Error("Failed to create Sample Player module or it has no ID.");

    const gain = await createModule('gain', startX + MODULE_X_OFFSET, startY);
    if (!gain || !gain.id) throw new Error("Failed to create Gain module or it has no ID.");

    const output = await createModule('output', startX + (MODULE_X_OFFSET * 2), startY);
    if (!output || !output.id) throw new Error("Failed to create Output module or it has no ID.");

    // Connections
    let allConnectionsSuccessful = true;
    allConnectionsSuccessful &&= await connectModules(samplePlayer.id, 'audio', gain.id, 'audio');
    allConnectionsSuccessful &&= await connectModules(gain.id, 'audio', output.id, 'audio');

    if (allConnectionsSuccessful) {
      console.log("[PresetChain] Sample Player -> Gain -> Output chain created successfully.");
    } else {
      console.warn("[PresetChain] Some connections failed for Sample Player -> Gain -> Output chain. Check console for details.");
    }
    return { samplePlayer, gain, output, success: allConnectionsSuccessful };

  } catch (error) {
    console.error("[PresetChain] Critical error creating Sample Player -> Gain -> Output chain:", error);
    return null;
  }
}

/**
 * Creates an Oscillator -> Gain (modulated by an LFO) -> Output audio processing chain.
 * Oscillator, Gain, Output are positioned horizontally. LFO is positioned below the Oscillator.
 * @param {number} [startX=50] - The initial X coordinate for the Oscillator.
 * @param {number} [startY=150] - The initial Y coordinate for the main chain (Osc, Gain, Output). LFO will be offset vertically.
 * @returns {Promise<object|null>} An object with created module instances and success status, or null on critical failure.
 */
export async function createOscLfoGainOutputChain(startX = 50, startY = 150) {
  console.log(`[PresetChain] Creating Oscillator -> Gain (LFO modulated) -> Output chain at (${startX}, ${startY})`);
  try {
    const osc = await createModule('oscillator', startX, startY);
    if (!osc || !osc.id) throw new Error("Failed to create Oscillator module or it has no ID.");

    // Place LFO for modulating the Gain module
    const lfo = await createModule('lfo', startX, startY + MODULE_Y_OFFSET);
    if (!lfo || !lfo.id) throw new Error("Failed to create LFO module or it has no ID.");

    const gain = await createModule('gain', startX + MODULE_X_OFFSET, startY);
    if (!gain || !gain.id) throw new Error("Failed to create Gain module or it has no ID.");

    const output = await createModule('output', startX + (MODULE_X_OFFSET * 2), startY);
    if (!output || !output.id) throw new Error("Failed to create Output module or it has no ID.");

    // Connections
    let allConnectionsSuccessful = true;
    // Audio path: Oscillator -> Gain -> Output
    allConnectionsSuccessful &&= await connectModules(osc.id, 'audio', gain.id, 'audio');
    allConnectionsSuccessful &&= await connectModules(gain.id, 'audio', output.id, 'audio');
    // Modulation path: LFO -> Gain (modulates gain parameter)
    // Note: The LFO output is audio-rate, connected to an audio input on the Gain module,
    // which connection_manager.js then routes to an AudioParam (like 'gain') if available.
    allConnectionsSuccessful &&= await connectModules(lfo.id, 'audio', gain.id, 'audio');

    if (allConnectionsSuccessful) {
      console.log("[PresetChain] Oscillator -> Gain (LFO modulated) -> Output chain created successfully.");
    } else {
      console.warn("[PresetChain] Some connections failed for Oscillator -> Gain (LFO modulated) -> Output chain. Check console for details.");
    }
    return { osc, lfo, gain, output, success: allConnectionsSuccessful };

  } catch (error) {
    console.error("[PresetChain] Critical error creating Oscillator -> LFO -> Gain -> Output chain:", error);
    return null;
  }
}