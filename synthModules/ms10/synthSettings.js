// synthSettings.js

const elements = {
    attack: document.getElementById('attack'),
    release: document.getElementById('release'),
    cutoff: document.getElementById('cutoff'),
    resonance: document.getElementById('resonance'),
    volume: document.getElementById('volume'),
    note: document.getElementById('note')
};

function getCurrentSynthSettings() {
    return {
        attack: parseFloat(elements.attack.value),
        release: parseFloat(elements.release.value),
        cutoff: parseFloat(elements.cutoff.value),
        resonance: parseFloat(elements.resonance.value),
        volume: getVolume()
    };
}

function logCurrentSettings(action) {
    console.log(`[synthRecording.js] [${action}] Current settings:`, getCurrentSynthSettings());
}

// Unified event handling mechanism
function handleEvent(event) {
    switch (event.target.id) {  // Use event.target.id instead of event.type
        case 'startRecording':
            startRecording();
            break;
        case 'stopRecording':
            stopRecording();
            break;
        case 'playRecording':
            playRecording();
            break;
        case 'stopPlayback':
            stopPlayback();
            break;
        case 'loopToggle':
            toggleLoop();
            break;
        // ... [Other event handlers based on element IDs]
    }

    // Handle the 'midiMessageReceived' event separately since it's not based on an element ID
    if (event.type === 'midiMessageReceived') {
        recordMIDIInput(event.detail.midiMessage);
        logCurrentSettings("midiMessageReceived");
    }
}


['attack', 'release', 'cutoff', 'resonance', 'volume'].forEach(id => {
    elements[id].addEventListener('input', () => {
        if (isRecording) {
            const interaction = { event: `${id}Changed`, value: elements[id].value };
            recordingData.push({
                timestamp: Date.now() - recordingStartTime,
                interaction
            });
            console.log("[synthRecording.js] [recordSynthInteraction] Synth interaction recorded:", interaction);
        }
    });
});