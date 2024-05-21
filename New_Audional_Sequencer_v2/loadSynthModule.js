// loadSynthModule.js
// This script is used to load the synth module into a floating window when the user clicks the "Load Synth" button.
// It also listens for messages from the synth module and saves the arpeggiator notes and MIDI recording to local storage.


function loadSynth(channelIndex, loadSampleButton, bpmValue) {
    if (channelIndex === undefined) {
        console.error('Error: Channel index is undefined. Stopping program.');
        return;
    }
    console.log(`Loading synth for channel index: ${channelIndex}`);

    // Create floating window and iframe
    const floatingWindow = createFloatingWindow();
    const iframe = createIframe(channelIndex);
    floatingWindow.appendChild(iframe);
    document.body.appendChild(floatingWindow);

    iframe.onload = () => {
        console.log("Synth iframe loaded successfully");

        // Once the iframe is loaded, set the channel index and BPM
        sendMessageToIframe(iframe, { type: 'setChannelIndex', channelIndex });
        sendMessageToIframe(iframe, { type: 'setBPM', bpm: bpmValue });
        console.log(`Sent channel index and BPM to iframe: ${channelIndex}, ${bpmValue}`);

        // Optional: Update the UI to reflect the loaded content
        loadSampleButton.textContent = iframe.contentDocument.title;
    };
}

function createIframe(channelIndex) {
    const iframe = document.createElement('iframe');
    iframe.src = `Synth-Modules/jiMS10_v2/index.html?channelIndex=${channelIndex}`;
    iframe.style.width = '100%';
    iframe.style.height = 'calc(100% - 40px)';
    iframe.style.border = 'none';
    iframe.style.display = 'block';
    return iframe;
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

// Functions to start and stop the arpeggiator in the iframe

function startArpeggiatorInIframe(iframe, channelIndex) {
    console.log(`Sending start arpeggiator command to iframe for channel ${channelIndex}`);
    sendMessageToIframe(iframe, { type: 'startArpeggiator', channelIndex: channelIndex });
}

function stopArpeggiatorInIframe(iframe, channelIndex) {
    console.log(`Sending stop arpeggiator command to iframe for channel ${channelIndex}`);
    sendMessageToIframe(iframe, { type: 'stopArpeggiator', channelIndex: channelIndex });
}
