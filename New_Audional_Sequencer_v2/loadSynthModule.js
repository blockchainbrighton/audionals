// loadSynthModule.js
// This script is used to load the synth module into a floating window when the user clicks the "Load Synth" button.
// It also listens for messages from the synth module and saves the arpeggiator notes and MIDI recording to local storage.

function loadSynth(channelIndex, loadSampleButton, bpmValue) {
    console.log(`Loading synth for channel index: ${channelIndex}`);

    const floatingWindow = createFloatingWindow();
    const iframe = createIframe(channelIndex);
    floatingWindow.appendChild(iframe);
    document.body.appendChild(floatingWindow);

    // Minimize button
    const minimizeButton = document.createElement('button');
    minimizeButton.textContent = 'Minimize';
    minimizeButton.style.position = 'absolute';
    minimizeButton.style.top = '5px';
    minimizeButton.style.right = '50px'; // Adjust position as needed
    minimizeButton.onclick = () => {
        iframe.style.height = '30px'; // Minimizes the iframe to a small bar
        floatingWindow.style.height = '40px'; // Adjusts the window size accordingly
        minimizeButton.style.display = 'none';
        restoreButton.style.display = 'block';
    };

    // Restore button
    const restoreButton = document.createElement('button');
    restoreButton.textContent = 'Restore';
    restoreButton.style.position = 'absolute';
    restoreButton.style.top = '5px';
    restoreButton.style.right = '50px';
    restoreButton.style.display = 'none'; // Initially hidden
    restoreButton.onclick = () => {
        iframe.style.height = 'calc(100% - 40px)';
        floatingWindow.style.height = '80%';
        minimizeButton.style.display = 'block';
        restoreButton.style.display = 'none';
    };

    floatingWindow.appendChild(minimizeButton);
    floatingWindow.appendChild(restoreButton);

    iframe.onload = () => {
        sendMessageToIframe(iframe, { type: 'setChannelIndex', channelIndex });
        sendMessageToIframe(iframe, { type: 'setBPM', bpm: bpmValue });
        loadSampleButton.textContent = iframe.contentDocument.title;
    };
}

function createFloatingWindow() {
    const floatingWindow = document.createElement('div');
    floatingWindow.style.position = 'fixed';
    floatingWindow.style.top = '10%';
    floatingWindow.style.left = '10%';
    floatingWindow.style.width = '80%';
    floatingWindow.style.height = '80%';
    floatingWindow.style.zIndex = '1000';
    floatingWindow.style.backgroundColor = 'white';
    floatingWindow.style.border = '2px solid black';
    floatingWindow.style.boxShadow = 'rgba(0, 0, 0, 0.5) 0px 0px 10px';
    floatingWindow.style.overflow = 'hidden';
    floatingWindow.style.resize = 'both';
    floatingWindow.style.padding = '10px';
    return floatingWindow;
}

function createIframe(channelIndex) {
    const iframe = document.createElement('iframe');
    iframe.src = `Synth-Modules/jiMS10_v2/index.html?channelIndex=${channelIndex}`;
    iframe.style.width = '100%';
    iframe.style.height = 'calc(100% - 40px)';
    iframe.style.border = 'none';
    return iframe;
}



// Functions to start and stop the arpeggiator in the iframe

function startArpeggiatorInIframe(iframe, channelIndex) {
    console.log(`Sending start arpeggiator command to iframe for channel ${channelIndex}`);
    sendMessageToIframe(iframe, { type: 'startArpeggiator', channelIndex: channelIndex });
}

function stopArpeggiatorInIframe(iframe, channelIndex) {
    console.log(`Sending stop arpeggiator command to iframe for channel ${channelIndex}`);
    sendMessageToIframe(iframe, { type: 'stopArpeggiator', channelIndex: channelIndex });
}


function sendMessageToIframe(iframe, message) {
    iframe.contentWindow.postMessage(message, '*');
}

function adjustIframeContent(iframe) {
    const iframeDocument = iframe.contentDocument || iframe.contentWindow.document;
    const content = iframeDocument.querySelector('body');
    content.style.height = '100%';
    content.style.width = '100%';
    content.style.margin = '0';
    content.style.padding = '0';
    content.style.overflow = 'hidden';
    content.style.boxSizing = 'border-box';
}

function listenForChildMessages(channelIndex, savedSettings) {
    window.addEventListener('message', (event) => {
        if (event.data.type === 'updateArpNotes') {
            console.log(`Received updated arpeggiator notes: ${JSON.stringify(event.data.data)}`);
            savedSettings.arpNotes = event.data.data;
        } else if (event.data.type === 'updateMidiRecording') {
            console.log(`Received updated MIDI recording with ${event.data.data.length} events: ${JSON.stringify(event.data.data)}`);
            savedSettings.midiRecording = event.data.data;
        }
    });
}

function getSettingsFromLocalStorage(channelIndex) {
    const settings = localStorage.getItem(`synthSettings_${channelIndex}`);
    return settings ? JSON.parse(settings) : {};
}

