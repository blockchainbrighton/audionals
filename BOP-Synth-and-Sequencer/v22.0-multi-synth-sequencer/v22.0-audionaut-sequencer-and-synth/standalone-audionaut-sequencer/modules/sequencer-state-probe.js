/**
 * Module: BOP-Sequencer-V10-Modular/stateProbe.js
 * Purpose: stateProbe module
 * Exports: installStateProbeButton
 * Depends on: sequencer-state.js
 */

// stateProbe.js (Rewritten with enhanced logging)
import { getCurrentSequence } from './sequencer-state.js';
import { runtimeState } from './sequencer-state.js';

// Call this once after DOMContentLoaded, or in main.js after the app loads
export function installStateProbeButton() {
    let probeBtn = document.getElementById('showSynthStateBtn');
    if (probeBtn) return; // Don't install more than once

    probeBtn = document.createElement('button');
    probeBtn.textContent = 'Probe Synth State';
    probeBtn.style.position = 'fixed';
    probeBtn.style.top = '10px';
    probeBtn.style.right = '10px';
    probeBtn.style.zIndex = '10000';
    probeBtn.style.padding = '8px 12px';
    probeBtn.style.background = '#6a0dad';
    probeBtn.style.color = 'white';
    probeBtn.style.border = 'none';
    probeBtn.style.borderRadius = '5px';
    probeBtn.style.cursor = 'pointer';
    probeBtn.id = 'showSynthStateBtn';
    document.body.appendChild(probeBtn);

    probeBtn.onclick = () => {
        console.log('%c[STATE PROBE] Button Clicked. Starting state inspection...', 'color: purple; font-weight: bold;');
        
        const seq = getCurrentSequence();
        if (!seq || !seq.channels || seq.channels.length === 0) {
            alert('State Probe: No active sequence or channels found.');
            console.warn('[STATE PROBE] No active sequence or channels found.');
            return;
        }

        // Find the first channel with an instrument for this demo
        const chan = seq.channels.find(ch => ch.instrumentId);
        if (!chan || !chan.instrumentId) {
            alert('State Probe: No instrument loaded in the current sequence.');
            console.warn('[STATE PROBE] No instrument found on any channel.');
            return;
        }

        const inst = runtimeState.instrumentRack[chan.instrumentId];
        if (!inst || typeof inst.capturePatch !== 'function') {
            alert('State Probe: Instrument found, but it has no capturePatch() method.');
            console.error(`[STATE PROBE] Instrument ${chan.instrumentId} is invalid or lacks capturePatch().`);
            return;
        }

        // Fetch and pretty-print the full patch/state
        const state = inst.capturePatch();
        console.log('%c[STATE PROBE] Current Full State for Instrument ID:', 'color: purple; font-weight: bold;', chan.instrumentId, state);

        // Display in a modal
        let modal = document.getElementById('stateProbeModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'stateProbeModal';
            // (Styling from your original code is good, let's keep it)
            modal.style.position = 'fixed';
            modal.style.top = '50px';
            modal.style.right = '10px';
            modal.style.width = '450px';
            modal.style.maxHeight = '85vh';
            modal.style.overflow = 'auto';
            modal.style.background = '#282c34';
            modal.style.color = '#abb2bf';
            modal.style.padding = '1em';
            modal.style.borderRadius = '8px';
            modal.style.border = '1px solid #6a0dad';
            modal.style.zIndex = 9999;
            modal.style.fontSize = '14px';
            modal.style.fontFamily = 'Menlo, Monaco, "Courier New", monospace';
            document.body.appendChild(modal);
        }
        modal.innerHTML = `<h3 style="margin-top:0; color:white;">State Probe: ${chan.instrumentId}</h3><pre>${JSON.stringify(state, null, 2)}</pre>
            <button onclick="this.parentNode.remove()" style="background:#555; color:white; border:none; padding: 5px 10px; cursor:pointer;">Close</button>`;
        modal.style.display = 'block';
    };
}
