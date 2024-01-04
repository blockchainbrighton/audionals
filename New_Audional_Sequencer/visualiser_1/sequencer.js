// Initialize variables for audio-reactive elements
let barCount = 0;
let beatCount = 0;
let isPlaying = false;

// Add an event listener to the BroadcastChannel
const sequencerChannel = new BroadcastChannel('sequencerChannel');
sequencerChannel.onmessage = (event) => {
    try {
        const { type, data } = event.data;
        console.log(`Received message of type: ${type}`, data); // Log when a message is received
        switch(type) {
            case 'bar':
                handleBarMessage(data);
                break;
            case 'beat':
                handleBeatMessage(data);
                break;
            case 'pause':
                handlePauseMessage();
                break;
            case 'resume':
                handleResumeMessage();
                break;
            case 'stop':
                handleStopMessage();
                break;
            case 'play':
                handlePlayMessage(data);
                break;
            default:
                console.log(`Unhandled message type: ${type}`);
        }
    } catch (error) {
        console.error(`Error handling message: ${error}`);
    }
};

// Define the message handling functions
function handleBarMessage(data) {
    barCount = data.bar;
    console.log(`Handling 'bar' message. Bar count set to: ${barCount}`);
}

function handleBeatMessage(data) {
    beatCount = data.beat;
    barCount = data.bar; // Optional: Update bar count if included in the beat message
    console.log(`Handling 'beat' message. Beat count: ${beatCount}, Bar count: ${barCount}`);
}

function handlePauseMessage() {
    isPlaying = false;
    console.log(`Handling 'pause' message. isPlaying set to: ${isPlaying}`);
}

function handleResumeMessage() {
    isPlaying = true;
    console.log(`Handling 'resume' message. isPlaying set to: ${isPlaying}`);
}

function handleStopMessage() {
    isPlaying = false;
    beatCount = 0;
    barCount = 0;
    console.log(`Handling 'stop' message. isPlaying: ${isPlaying}, Beat count: ${beatCount}, Bar count: ${barCount}`);
}

function handlePlayMessage(data) {
    isPlaying = true;
    if(data.beat !== undefined) {
        beatCount = data.beat;
    }
    if(data.bar !== undefined) {
        barCount = data.bar;
    }
    console.log(`Handling 'play' message. isPlaying: ${isPlaying}, Beat count: ${beatCount}, Bar count: ${barCount}`);
}
