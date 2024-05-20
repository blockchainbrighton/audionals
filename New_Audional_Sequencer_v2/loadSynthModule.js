function loadSynth(channelIndex, loadSampleButton, bpmValue) {
    console.log(`Loading synth for channel index: ${channelIndex}`);

    // Create the floating window container
    const floatingWindow = document.createElement('div');
    floatingWindow.style.position = 'fixed';
    floatingWindow.style.top = '10%';  // Adjust as necessary
    floatingWindow.style.left = '10%';  // Adjust as necessary
    floatingWindow.style.width = '80%';  // Adjust as necessary
    floatingWindow.style.height = '80%';  // Adjust as necessary
    floatingWindow.style.zIndex = '1000';  // Ensure it's on top of other elements
    floatingWindow.style.backgroundColor = 'white';
    floatingWindow.style.border = '2px solid black';
    floatingWindow.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
    floatingWindow.style.overflow = 'hidden';
    floatingWindow.style.resize = 'both';
    floatingWindow.style.padding = '10px';
    
    // Add close button to the floating window
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
    floatingWindow.appendChild(closeButton);

    // Make the floating window draggable
    floatingWindow.onmousedown = function (event) {
        let shiftX = event.clientX - floatingWindow.getBoundingClientRect().left;
        let shiftY = event.clientY - floatingWindow.getBoundingClientRect().top;

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

    // Create the iframe element
    const iframe = document.createElement('iframe');
    iframe.src = `Synth-Modules/jiMS10_v2/index.html?channelIndex=${channelIndex}`;
    iframe.style.width = '100%';
    iframe.style.height = 'calc(100% - 40px)';  // Adjust the height as necessary to account for padding
    iframe.style.border = 'none';
    iframe.style.display = 'block';  // Ensure no extra space below the iframe
    floatingWindow.appendChild(iframe);

    // Append the floating window to the body
    document.body.appendChild(floatingWindow);

    // Retrieve saved settings for the given channel index
    const savedSettings = JSON.parse(localStorage.getItem(`synthSettings_${channelIndex}`)) || {};
    console.log(`Retrieved saved settings for channel ${channelIndex}:`, savedSettings);

    // Listen for the iframe to finish loading
    iframe.onload = () => {
        console.log("Synth iframe loaded successfully");

        // Send the channel index to the iframe once it is loaded
        iframe.contentWindow.postMessage({ type: 'setChannelIndex', channelIndex: channelIndex }, '*');

        // Fetch the BPM value from the input slider and send it to the iframe
        iframe.contentWindow.postMessage({ type: 'setBPM', bpm: bpmValue }, '*');  // Send BPM value on load

        // Send saved settings to the iframe
        if (savedSettings.arpNotes) {
            iframe.contentWindow.postMessage({ type: 'setArpNotes', arpNotes: savedSettings.arpNotes }, '*');
        }
        if (savedSettings.midiRecording) {
            iframe.contentWindow.postMessage({ type: 'setMidiRecording', midiRecording: savedSettings.midiRecording }, '*');
        }

        // Access the document within the iframe
        const iframeDocument = iframe.contentDocument || iframe.contentWindow.document;

        // Adjust the height and width of the content inside the iframe
        const content = iframeDocument.querySelector('body');  // Assuming the main content is in the body
        content.style.height = '100%';
        content.style.width = '100%';
        content.style.margin = '0';
        content.style.padding = '0';
        content.style.overflow = 'hidden';
        content.style.boxSizing = 'border-box';

        // Get the title from the loaded HTML file
        const title = iframeDocument.title;

        // Set the loadSampleButton's text content to the new title
        loadSampleButton.textContent = title;
    };

    // Additional logs to help diagnose issues
    console.log('Iframe and floating window dimensions:', {
        iframe: {
            width: iframe.style.width,
            height: iframe.style.height
        },
        floatingWindow: {
            width: floatingWindow.style.width,
            height: floatingWindow.style.height
        }
    });

    // Listen for messages from the sequencer channel
    const sequencerChannel = new BroadcastChannel('sequencerChannel');
    sequencerChannel.addEventListener('message', (event) => {
        if (event.data.type === 'updateArpNotes') {
            // Handle updated arpeggiator notes from the synth
            const arpNotes = event.data.arpNotes;
            console.log(`Received updated arpeggiator notes: ${arpNotes}`);
            // Save the updated arpeggiator notes
            savedSettings.arpNotes = arpNotes;
            localStorage.setItem(`synthSettings_${channelIndex}`, JSON.stringify(savedSettings));
        } else if (event.data.type === 'updateMidiRecording') {
            // Handle updated MIDI recording from the synth
            const midiRecording = event.data.midiRecording;
            console.log(`Received updated MIDI recording with ${midiRecording.length} events`);
            // Save the updated MIDI recording
            savedSettings.midiRecording = midiRecording;
            localStorage.setItem(`synthSettings_${channelIndex}`, JSON.stringify(savedSettings));
        }
    });
}
