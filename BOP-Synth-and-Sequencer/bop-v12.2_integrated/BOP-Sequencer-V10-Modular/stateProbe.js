// stateProbe.js
import { getCurrentSequence } from './state.js';
import { runtimeState } from './state.js';

// Call this once after DOMContentLoaded, or in main.js after the app loads
export function installStateProbeButton() {
    // Create a button
    const probeBtn = document.createElement('button');
    probeBtn.textContent = 'Show Current Synth State';
    probeBtn.style.margin = '1em';
    probeBtn.id = 'showSynthStateBtn';
    document.body.insertBefore(probeBtn, document.body.firstChild);

    // Click handler: Get active channel, find its instrument, call getPatch()
    probeBtn.onclick = () => {
        const seq = getCurrentSequence();
        if (!seq || !seq.channels || seq.channels.length === 0) {
            alert('No active sequence or channels found.');
            return;
        }

        // Find the first channel with an instrument for this demo (customize as needed)
        const chan = seq.channels.find(ch => ch.instrumentId);
        if (!chan || !chan.instrumentId) {
            alert('No instrument loaded in current sequence/channel.');
            return;
        }

        const inst = runtimeState.instrumentRack[chan.instrumentId];
        if (!inst || !inst.getPatch) {
            alert('Instrument found, but no getPatch() method.');
            return;
        }

        // Fetch and pretty-print the full patch/state
        const state = inst.getPatch();
        console.log('[Synth State Probe] Full State:', state);

        // Optional: Display in a modal (simple version)
        let modal = document.getElementById('stateProbeModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'stateProbeModal';
            modal.style.position = 'fixed';
            modal.style.top = '2em';
            modal.style.right = '2em';
            modal.style.maxWidth = '40vw';
            modal.style.maxHeight = '80vh';
            modal.style.overflow = 'auto';
            modal.style.background = '#222';
            modal.style.color = '#fff';
            modal.style.padding = '1em';
            modal.style.borderRadius = '8px';
            modal.style.zIndex = 9999;
            modal.style.fontSize = '0.9em';
            modal.style.fontFamily = 'monospace';
            document.body.appendChild(modal);
        }
        modal.innerHTML = `<h3>Current Synth State</h3><pre>${JSON.stringify(state, null, 2)}</pre>
            <button onclick="this.parentNode.style.display='none'">Close</button>`;
        modal.style.display = 'block';
    };
}
