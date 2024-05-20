// loadSynthModule.js - This script is used to load the synth module into a floating window when the user clicks the "Load Synth" button. 
// It also listens for messages from the synth module and saves the arpeggiator notes and MIDI recording to local storage.

function loadSynth(channelIndex, loadSampleButton, bpmValue) {
    if (channelIndex === undefined) {
        console.error('Error: Channel index is undefined. Stopping program.');
        return;
    }
    console.log(`Loading synth for channel index: ${channelIndex}`);

    const floatingWindow = createFloatingWindow();
    const iframe = createIframe(channelIndex);
    floatingWindow.appendChild(iframe);
    document.body.appendChild(floatingWindow);

    const savedSettings = getSettingsFromLocalStorage(channelIndex);
    console.log(`Retrieved saved settings for channel ${channelIndex}:`, savedSettings);

    iframe.onload = () => {
        console.log("Synth iframe loaded successfully");
        sendMessageToIframe(iframe, { type: 'setChannelIndex', channelIndex });
        sendMessageToIframe(iframe, { type: 'setBPM', bpm: bpmValue });
        if (savedSettings.arpNotes) {
            console.log(`Sending ArpNotes to iframe: ${JSON.stringify(savedSettings.arpNotes)}`);
            sendMessageToIframe(iframe, { type: 'setArpNotes', arpNotes: savedSettings.arpNotes });
        }
        if (savedSettings.midiRecording) {
            console.log(`Sending MIDI recording to iframe: ${JSON.stringify(savedSettings.midiRecording)}`);
            sendMessageToIframe(iframe, { type: 'setMidiRecording', midiRecording: savedSettings.midiRecording });
        }

        adjustIframeContent(iframe);
        loadSampleButton.textContent = iframe.contentDocument.title;
    };

    listenForChildMessages(channelIndex, savedSettings);
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

function updateLocalStorage(channelIndex, settings) {
    console.log(`Saving settings to localStorage for channel ${channelIndex}: ${JSON.stringify(settings)}`);
    localStorage.setItem(`synthSettings_${channelIndex}`, JSON.stringify(settings));
}

function getSettingsFromLocalStorage(channelIndex) {
    const settings = JSON.parse(localStorage.getItem(`synthSettings_${channelIndex}`)) || {};
    console.log(`Loaded settings from localStorage for channel ${channelIndex}: ${JSON.stringify(settings)}`);
    return settings;
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
    floatingWindow.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
    floatingWindow.style.overflow = 'hidden';
    floatingWindow.style.resize = 'both';
    floatingWindow.style.padding = '10px';

    const closeButton = createCloseButton(floatingWindow);
    floatingWindow.appendChild(closeButton);

    makeFloatingWindowDraggable(floatingWindow);

    return floatingWindow;
}

function createCloseButton(floatingWindow) {
    const closeButton = document.createElement('div');
    closeButton.textContent = 'X';
    closeButton.style.position = 'absolute';
    closeButton.style.top = '5px';
    closeButton.style.right = '10px';
    closeButton.style.cursor = 'pointer';
    closeButton.style.fontSize = '20px';
    closeButton.style.color = 'red';
    closeButton.addEventListener('click', () => {
        document.body.removeChild(floatingWindow);
    });

    return closeButton;
}

function makeFloatingWindowDraggable(floatingWindow) {
    floatingWindow.onmousedown = function (event) {
        const shiftX = event.clientX - floatingWindow.getBoundingClientRect().left;
        const shiftY = event.clientY - floatingWindow.getBoundingClientRect().top;

        function moveAt(pageX, pageY) {
            floatingWindow.style.left = pageX - shiftX + 'px';
            floatingWindow.style.top = pageY - shiftY + 'px';
        }

        function onMouseMove(event) {
            moveAt(event.pageX, event.pageY);
        }

        document.addEventListener('mousemove', onMouseMove);

        floatingWindow.onmouseup = function () {
            document.removeEventListener('mousemove', onMouseMove);
            floatingWindow.onmouseup = null;
        };
    };

    floatingWindow.ondragstart = function () {
        return false;
    };
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
            updateLocalStorage(channelIndex, savedSettings);
        } else if (event.data.type === 'updateMidiRecording') {
            console.log(`Received updated MIDI recording with ${event.data.data.length} events: ${JSON.stringify(event.data.data)}`);
            savedSettings.midiRecording = event.data.data;
            updateLocalStorage(channelIndex, savedSettings);
        }
    });
}

