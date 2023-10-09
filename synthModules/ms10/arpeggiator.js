let isArpeggiatorOn = false;
let isArpeggiatorPaused = false;
const arpNotes = [];
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

const arpSequencerChannel = new BroadcastChannel('sequencerChannel');
arpSequencerChannel.onmessage = function(event) {
    const type = event.data.type;
    console.log(`[ARP] Received message: ${type} at ${new Date().toISOString()}`);

    if (type === 'beat') {
        playNextArpNote();
        scheduleNextArpNotes();
    } else if (type === 'pause') {
        pauseArpeggiator();
    } else if (type === 'stop') {
        stopArpeggiator();
    } else if (type === 'resume') {
        startArpeggiator();
    } else if (type === 'play') {
        console.log(`[ARP] Play button pressed at ${new Date().toISOString()}`);
        if (!isArpeggiatorOn && !isArpeggiatorPaused) {
            playNextArpNote(); // Play the first note immediately
            isArpeggiatorOn = true; // Set the arpeggiator to on
            scheduleNextArpNotes();
        }
    }
};

function scheduleNextArpNotes() {
    const tempo = parseFloat(document.getElementById('arpTempo').value);
    const intervalDuration = 60 / tempo; // Convert BPM to seconds per beat

    for (let i = 0; i < arpNotes.length; i++) {
        const nextNoteTime = audioContext.currentTime + (intervalDuration * (i + 1));
        playNoteAtTime(arpNotes[i], nextNoteTime);
    }
}

function playNoteAtTime(note, time) {
    // Schedule the note to be played at the specified time
    // You can expand this function to use the Web Audio API's capabilities to play the note at the exact time
    setTimeout(() => playMS10TriangleBass(note), (time - audioContext.currentTime) * 1000);
}

function playNextArpNote() {
    if (arpNotes.length) {
        const pattern = document.getElementById('arpPattern').value;
        let noteToPlay;

        if (arpNotes.length === 1) {
            noteToPlay = arpNotes[0];
        } else {
            switch (pattern) {
                case "up":
                    noteToPlay = arpNotes.shift();
                    arpNotes.push(noteToPlay);
                    break;
                case "down":
                    noteToPlay = arpNotes.pop();
                    arpNotes.unshift(noteToPlay);
                    break;
                case "random":
                    let randomIndex = Math.floor(Math.random() * arpNotes.length);
                    noteToPlay = arpNotes[randomIndex];
                    break;
            }
        }

        playMS10TriangleBass(noteToPlay);
        console.log(`[ARP] Played note: ${noteToPlay} (Frequency: ${noteToPlay}) at ${new Date().toISOString()}`);
    }
}