// js/ui.js
import { logDebug } from './debug.js';

export function setupUI() {
    logDebug("Setting up UI elements...", 'info');
    // ... create buttons, sliders, etc. ...
    const button = document.createElement('button');
    button.textContent = 'Start Tone';
    button.addEventListener('click', async () => {
        if (typeof Tone !== 'undefined' && Tone.context.state !== 'running') {
            await Tone.start();
            logDebug('AudioContext started via UI button.', 'success');
             // Maybe trigger a sound from app.js or another module?
        } else {
             logDebug('AudioContext already running or Tone not loaded.', 'info');
        }
    }, { once: true }); // Only allow starting once via this button typicaly

    document.body.appendChild(button); // Add it somewhere
     logDebug("UI setup complete.", 'success');
}

// You could export other UI-related functions here too