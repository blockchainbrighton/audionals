// loadSynthModule.js

let tabInterface = null;

function toggleDisplay(elements, show) {
    elements.forEach(element => {
        element.style.display = show ? 'block' : 'none';
    });
}

function loadSynth(channelIndex, loadSampleButton, bpmValue) {
    console.log(`[PARENT] Loading synth for channel index: ${channelIndex}`);
    
    if (!tabInterface) { // Create tabbed interface if it doesn't exist
        tabInterface = createTabbedInterface();
    }

    addTab(tabInterface.tabContainer, tabInterface.iframeContainer, `jiMS10`, channelIndex, loadSampleButton.id);

    const iframe = tabInterface.iframeContainer.querySelector(`iframe[data-channel='${channelIndex}']`);
    if (iframe) {
        iframe.onload = () => {
            console.log('[PARENT] iframe onload triggered');
            console.log('[PARENT] Sending setChannelIndex with channelIndex:', channelIndex);
            sendMessageToIframe(iframe, { type: 'setChannelIndex', channelIndex });

            console.log('[PARENT] Sending setBPM with bpmValue:', bpmValue);
            sendMessageToIframe(iframe, { type: 'setBPM', bpm: bpmValue });

            if (loadSampleButton) {
                console.log('[PARENT] Updating button text to "jiMS10 Synth Loaded"');
                // Update the button text to display the instrument name and the channel index
                loadSampleButton.textContent = `jiMS10 Synth ${channelIndex}`;
                
                // Update the global settings with the new channel name
                window.unifiedSequencerSettings.setChannelName(channelIndex, `Ch ${channelIndex} : jiMS10 Synth`);
                
                // Call the function to update the button text
                window.unifiedSequencerSettings.updateLoadSampleButtonText(channelIndex, loadSampleButton);
                
                // Call the function to update the UI for the current sequence
                window.unifiedSequencerSettings.updateUIForSequence(window.unifiedSequencerSettings.settings.masterSettings.currentSequence);
            } else {
                console.error('[PARENT] Load sample button not found:', loadSampleButton.id);
            }
        };
    } else {
        console.error('[PARENT] iframe not found for channel index:', channelIndex);
    }
}





function sendMessageToIframe(iframe, message) {
    console.log('[PARENT] Sending message to iframe:', message);
    iframe.contentWindow.postMessage(message, '*');
}

function listenForChildMessages(channelIndex, savedSettings) {
    window.addEventListener('message', (event) => {
        const { type, data } = event.data;
        console.log(`[PARENT] Received ${type}: ${JSON.stringify(data)}`);
        if (type === 'updateArpNotes' || type === 'updateMidiRecording') {
            savedSettings[type === 'updateArpNotes' ? 'arpNotes' : 'midiRecording'] = data;
        }
    });
}

function getSettingsFromLocalStorage(channelIndex) {
    const settings = localStorage.getItem(`synthSettings_${channelIndex}`);
    return settings ? JSON.parse(settings) : {};
}
