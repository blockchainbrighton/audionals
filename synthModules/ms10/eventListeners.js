// eventListeners.js

const keyToMidiNote = {};
const noteNames = ["A", "W", "S", "E", "D", "F", "T", "G", "Y", "H", "U", "J", "K", "O", "L", "P"];
const startingMidiNote = 21;  // A0

for (let i = 0; i < noteNames.length; i++) {
    keyToMidiNote["Key" + noteNames[i]] = startingMidiNote + i;
}

document.addEventListener('keydown', function(event) {
    const midiNote = keyToMidiNote[event.code];
    if (midiNote) {
        const frequency = Math.pow(2, (midiNote - 69) / 12) * 440;
        console.log(`[KEYDOWN] Key: ${event.code}, MIDI note: ${midiNote}, Frequency: ${frequency}`);
        playMS10TriangleBass(frequency);
    }
});

document.addEventListener('keyup', function(event) {
    const midiNote = keyToMidiNote[event.code];
    if (midiNote) {
        console.log(`[KEYUP] Key: ${event.code}, MIDI note: ${midiNote}`);
        stopMS10TriangleBass();  // You'll need to implement this function to stop the corresponding oscillator.
    }
});


document.getElementById('arpToggle').addEventListener('click', toggleArpeggiator);

// Toggle button states
document.querySelectorAll('button[data-state]').forEach(button => {
    button.addEventListener('click', function() {
        if (this.getAttribute('data-state') === 'off') {
            this.setAttribute('data-state', 'on');
            if (this.id === 'arpToggle') {
                this.textContent = 'Toggle Arpeggiator: ON';
            }
        } else {
            this.setAttribute('data-state', 'off');
            if (this.id === 'arpToggle') {
                this.textContent = 'Toggle Arpeggiator: OFF';
            }
        }
    });
});