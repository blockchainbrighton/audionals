// Placeholder audio files for the beat lab
// These would be replaced with actual OB1 sounds in a real implementation

// Kick drum sound
const kickBuffer = new ArrayBuffer(44100 * 2);
const kickView = new DataView(kickBuffer);
for (let i = 0; i < 44100 * 0.1; i++) {
    const amplitude = Math.exp(-i / 3000) * Math.sin(i * 0.01);
    kickView.setInt16(i * 2, amplitude * 32767, true);
}

// Snare drum sound
const snareBuffer = new ArrayBuffer(44100 * 2);
const snareView = new DataView(snareBuffer);
for (let i = 0; i < 44100 * 0.2; i++) {
    const noise = Math.random() * 2 - 1;
    const amplitude = Math.exp(-i / 1000) * noise;
    snareView.setInt16(i * 2, amplitude * 32767, true);
}

// Hi-hat sound
const hihatBuffer = new ArrayBuffer(44100 * 2);
const hihatView = new DataView(hihatBuffer);
for (let i = 0; i < 44100 * 0.1; i++) {
    const noise = Math.random() * 2 - 1;
    const amplitude = Math.exp(-i / 300) * noise * 0.5;
    hihatView.setInt16(i * 2, amplitude * 32767, true);
}

// Clap sound
const clapBuffer = new ArrayBuffer(44100 * 2);
const clapView = new DataView(clapBuffer);
for (let i = 0; i < 44100 * 0.2; i++) {
    const noise = Math.random() * 2 - 1;
    const amplitude = Math.exp(-(i - 2000) * (i - 2000) / 10000000) * noise;
    clapView.setInt16(i * 2, amplitude * 32767, true);
}

// Export the audio data
export { kickBuffer, snareBuffer, hihatBuffer, clapBuffer };
