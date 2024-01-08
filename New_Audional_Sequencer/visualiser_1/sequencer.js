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
            beatCount++; // Increment the beat count for each 'beat' message
            barCount = data.bar || barCount; // Update bar count if included
            break;
        case 'pause':
        case 'resume':
            isPlaying = type === 'resume';
            break;
        case 'stop':
            isPlaying = false;
            beatCount = barCount = 0; // Reset both beat and bar counts
            break;
        case 'play':
            isPlaying = true;
            beatCount = data.beat || beatCount; // Update beat count, or keep the existing count if not specified
            barCount = data.bar || barCount; // Update bar count, or keep the existing count if not specified
            break;
    }
    console.log(`Handling '${type}' message. isPlaying: ${isPlaying}, Beat count: ${beatCount}, Bar count: ${barCount}`);
}
