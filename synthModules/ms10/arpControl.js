// arpControl.js

function startArpeggiator() {
    const timestamp = performance.now();
    if (isArpeggiatorPaused) {
        console.log(`[ARP CONTROL] Resuming arpeggiator from pause at ${timestamp.toFixed(2)}ms.`);
        isArpeggiatorPaused = false;
    } else if (!isArpeggiatorOn) {
        console.log(`[ARP CONTROL] Starting arpeggiator immediately at ${timestamp.toFixed(2)}ms.`);
        playArpNotes();
        isArpeggiatorOn = true;
    }
}

function playArpeggiator() {
    console.log("[ARP CONTROL] Play button pressed.");
    startArpeggiator();
}

function pauseArpeggiator() {
    console.log("[ARP CONTROL] Arpeggiator paused.");
    isArpeggiatorPaused = true;
}

function stopArpeggiator() {
    console.log("[ARP CONTROL] Arpeggiator stopped and arpNotes cleared.");
    arpNotes.length = 0; // Clear the arpNotes array
    isArpeggiatorPaused = false;
}
