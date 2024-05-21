// loadSynthModule.js

let tabInterface = null;


// function createFloatingWindow() {
//     const window = document.createElement('div');
//     window.className = 'floatingWindow';
//     return window;
// }

function createIframe(channelIndex) {
    const iframe = document.createElement('iframe');
    iframe.src = `Synth-Modules/jiMS10_v2/index.html?channelIndex=${channelIndex}`;
    iframe.style.width = '100%';
    iframe.style.height = 'calc(100% - 40px)';
    iframe.style.border = 'none';
    return iframe;
}

function toggleDisplay(elements, show) {
    elements.forEach(element => {
        element.style.display = show ? 'block' : 'none';
    });
}

function loadSynth(channelIndex, loadSampleButton, bpmValue) {
    console.log(`Loading synth for channel index: ${channelIndex}`);
    
    if (!tabInterface) { // Create tabbed interface if it doesn't exist
        tabInterface = createTabbedInterface();
    }

    addTab(tabInterface.tabContainer, tabInterface.iframeContainer, `jiMS10_v2`, channelIndex);

    const iframe = tabInterface.iframeContainer;
    iframe.onload = () => {
        sendMessageToIframe(iframe, { type: 'setChannelIndex', channelIndex });
        sendMessageToIframe(iframe, { type: 'setBPM', bpm: bpmValue });
        loadSampleButton.textContent = iframe.contentDocument.title;
    };
}

function sendMessageToIframe(iframe, message) {
    iframe.contentWindow.postMessage(message, '*');
}

function listenForChildMessages(channelIndex, savedSettings) {
    window.addEventListener('message', (event) => {
        const { type, data } = event.data;
        console.log(`Received ${type}: ${JSON.stringify(data)}`);
        if (type === 'updateArpNotes' || type === 'updateMidiRecording') {
            savedSettings[type === 'updateArpNotes' ? 'arpNotes' : 'midiRecording'] = data;
        }
    });
}

function getSettingsFromLocalStorage(channelIndex) {
    const settings = localStorage.getItem(`synthSettings_${channelIndex}`);
    return settings ? JSON.parse(settings) : {};
}
