// quantize.js

let isQuantizeActive = false;  // Track quantization state

function quantizeMidiEvent(timestamp, bpm, subdivisionsPerBeat = 32) {
    // Calculate milliseconds per beat based on the BPM provided
    const millisecondsPerBeat = 60000 / bpm;
    const millisecondsPerSubdivision = millisecondsPerBeat / subdivisionsPerBeat;

    // Quantize the timestamp to the nearest subdivision
    const quantizedTimestamp = Math.round(timestamp / millisecondsPerSubdivision) * millisecondsPerSubdivision;
    console.log(`[Quantize Debug] BPM: ${bpm}, Original Timestamp: ${timestamp}ms, Quantized Timestamp: ${quantizedTimestamp}ms`);
    return quantizedTimestamp;
}

document.getElementById('quantizeRecording').addEventListener('click', function() {
    isQuantizeActive = !isQuantizeActive;  // Toggle quantization
    this.classList.toggle('active');  // Toggle visual state
    console.log('Quantize Recording: ' + (isQuantizeActive ? 'ON' : 'OFF'));
});
