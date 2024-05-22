// loadSynthModule.js

let tabInterface = null;

function toggleDisplay(elements, show) {
    elements.forEach(element => {
        element.style.display = show ? 'block' : 'none';
    });
}

function loadSynth(channelIndex, loadSampleButtonId, bpmValue) {
    console.log(`[PARENT] Loading synth for channel index: ${channelIndex}`);
    
    if (!tabInterface) { // Create tabbed interface if it doesn't exist
        tabInterface = createTabbedInterface();
    }

    addTab(tabInterface.tabContainer, tabInterface.iframeContainer, `jiMS10_v2`, channelIndex, loadSampleButtonId);

    const iframe = tabInterface.iframeContainer.querySelector(`iframe[data-channel='${channelIndex}']`);
    if (iframe) {
        iframe.onload = () => {
            console.log('[PARENT] iframe onload triggered');
            console.log('[PARENT] Sending setChannelIndex with channelIndex:', channelIndex);
            sendMessageToIframe(iframe, { type: 'setChannelIndex', channelIndex });

            console.log('[PARENT] Sending setBPM with bpmValue:', bpmValue);
            sendMessageToIframe(iframe, { type: 'setBPM', bpm: bpmValue });

            const loadSampleButton = document.getElementById(loadSampleButtonId);
            if (loadSampleButton) {
                loadSampleButton.textContent = iframe.contentDocument.title;
            }
        };
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
