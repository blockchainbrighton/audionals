// Initialize variables for audio-reactive elements
let barCount = 0, beatCount = 0, isPlaying = false;

// Add an event listener to the BroadcastChannel
const sequencerChannel = new BroadcastChannel('sequencerChannel');
sequencerChannel.onmessage = ({ data }) => {
    try {
        const { type, data: messageData } = data;
        if (['bar', 'beat', 'pause', 'resume', 'stop', 'play'].includes(type)) {
            handleMessage(type, messageData);
        } else {
            console.log(`Unhandled message type: ${type}`);
        }
    } catch (error) {
        console.error(`Error handling message: ${error}`);
    }
};

// Consolidated message handling function
function handleMessage(type, data) {
    switch (type) {
        case 'bar':
            barCount = data.bar;
            break;
        case 'beat':
            beatCount = data.beat;
            barCount = data.bar || barCount; // Update bar count if included
            break;
        case 'pause':
        case 'resume':
            isPlaying = type === 'resume';
            break;
        case 'stop':
            isPlaying = false;
            beatCount = barCount = 0;
            break;
        case 'play':
            isPlaying = true;
            beatCount = data.beat || beatCount;
            barCount = data.bar || barCount;
            break;
    }
    console.log(`Handling '${type}' message. isPlaying: ${isPlaying}, Beat count: ${beatCount}, Bar count: ${barCount}`);
}

