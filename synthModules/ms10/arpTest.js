// Variables to store timestamps
let beatReceivedTime;
let arpNotePlayedTime;

// Override the arpSequencerChannel.onmessage function to log the exact time a 'beat' message is received
const originalOnMessage = arpSequencerChannel.onmessage;
arpSequencerChannel.onmessage = function(event) {
    if (event.data.type === 'beat') {
        beatReceivedTime = performance.now();
        console.log(`[TEST] 'beat' message received at: ${beatReceivedTime.toFixed(2)}ms`);
    }
    originalOnMessage(event); // Call the original function
};

// Override the playMS10TriangleBass function to log the exact time the arp note is played
const originalPlayMS10TriangleBass = playMS10TriangleBass;
playMS10TriangleBass = function(noteToPlay) {
    arpNotePlayedTime = performance.now();
    console.log(`[TEST] Arp note played at: ${arpNotePlayedTime.toFixed(2)}ms`);
    if (beatReceivedTime) {
        const delay = arpNotePlayedTime - beatReceivedTime;
        console.log(`[TEST] Delay between 'beat' message and arp note played: ${delay.toFixed(2)}ms`);
    }
    originalPlayMS10TriangleBass(noteToPlay); // Call the original function
};

// Function to reset the test
function resetArpTest() {
    arpSequencerChannel.onmessage = originalOnMessage;
    playMS10TriangleBass = originalPlayMS10TriangleBass;
    console.log("[TEST] Arpeggiator test script reset.");
}

// Call this function to start the test
function startArpTest() {
    console.log("[TEST] Arpeggiator test script started.");
    // You can add any initialization or setup code here if needed
}
