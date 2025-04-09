// --- Web Audio API Setup ---
let audioContext = null;
let decodedAudioBuffer = null; // Store the fully decoded audio data
let mainGainNode = null;       // <<<<<<<< ADDED: Main volume control node
let schedulerTimerId = null; // ID for the setTimeout used for scheduling lookahead
let isTempoLooping = false;
let nextPlayTime = 0.0; // When the next note is scheduled to play in AudioContext time
let currentBpm = 76.0; // Default BPM
let currentPitchRate = 1.0; // Default pitch/speed multiplier
// We'll read volume directly from the gain node when needed

// How far ahead to schedule audio (in seconds). Prevents glitches.
const SCHEDULE_AHEAD_TIME = 0.1; // 100ms
// How often the scheduler checks (in milliseconds).
const SCHEDULER_INTERVAL_MS = 25; // 25ms

/**
 * Gets or creates the shared AudioContext and the main GainNode.
 * Handles suspended state.
 * @returns {AudioContext|null}
 */
function getAudioContext() {
    if (!audioContext) {
        try {
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!window.AudioContext) {
                console.error("Web Audio API is not supported.");
                alert("Web Audio API not supported. Cannot play audio.");
                return null;
            }
            audioContext = new AudioContext();
            console.log("AudioContext created.");

            // --- Create and connect the main GainNode ---
            mainGainNode = audioContext.createGain();
            mainGainNode.gain.value = 1.0; // Default volume (matches slider default)
            mainGainNode.connect(audioContext.destination); // Connect GainNode to speakers
            console.log("Main GainNode created and connected to destination.");
            // ------------------------------------------

        } catch (e) {
            console.error("Error creating AudioContext or GainNode:", e);
            alert("Could not initialize Web Audio API.");
            return null;
        }
    }
    // Handle browsers suspending context initially
    if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
            console.log("AudioContext resumed.");
        });
    }
    return audioContext;
}

/**
 * Decodes audio data into an AudioBuffer for Web Audio API processing.
 * MUST be called successfully before any playback can occur.
 * @param {ArrayBuffer} arrayBuffer The raw audio data.
 * @returns {Promise<boolean>} True if decoding was successful, false otherwise.
 */
export async function decodeAudioDataForProcessing(arrayBuffer) {
    // Ensure context (and therefore GainNode) is initialized first
    const context = getAudioContext();
    if (!context || !arrayBuffer) return false;
    if (decodedAudioBuffer) return true; // Already decoded

    try {
        console.log("Decoding audio data for Web Audio API...");
        decodedAudioBuffer = await context.decodeAudioData(arrayBuffer.slice(0));
        console.log("Audio data decoded successfully for Web Audio API.");
        return true;
    } catch (e) {
        console.error("Error decoding audio data with Web Audio API:", e);
        alert(`Failed to decode audio data: ${e.message}. Playback disabled.`);
        decodedAudioBuffer = null;
        return false;
    }
}

/**
 * Schedules a single playback of the decoded buffer at a specific time through the main GainNode.
 * @param {number} time The absolute time in the AudioContext's timeline to start playback.
 * @param {number} pitchRate The playback rate (speed/pitch) for this note.
 * @param {boolean} reverse Play in reverse? Defaults to false.
 */
async function scheduleSoundPlayback(time, pitchRate, reverse = false) {
    const context = getAudioContext();
    // Ensure mainGainNode is also ready
    if (!context || !decodedAudioBuffer || !mainGainNode) {
         console.error("Cannot schedule playback: Context, decoded buffer or GainNode missing.");
         return;
    }
     // Ensure context is running before scheduling
     if (context.state === 'suspended') {
        await context.resume();
    }

    try {
        const source = context.createBufferSource();
        let bufferToPlay = decodedAudioBuffer;

        if (reverse) {
            // Create reversed buffer *on the fly*
            const reversedBuffer = context.createBuffer(
                decodedAudioBuffer.numberOfChannels,
                decodedAudioBuffer.length,
                decodedAudioBuffer.sampleRate
            );
            for (let i = 0; i < decodedAudioBuffer.numberOfChannels; i++) {
                const channelData = decodedAudioBuffer.getChannelData(i);
                const reversedChannelData = new Float32Array(channelData);
                reversedChannelData.reverse();
                reversedBuffer.copyToChannel(reversedChannelData, i);
            }
            bufferToPlay = reversedBuffer;
            console.log(`Scheduling REVERSED sound at time ${time.toFixed(3)} with rate ${pitchRate.toFixed(2)}`);
        } else {
             console.log(`Scheduling sound at time ${time.toFixed(3)} with rate ${pitchRate.toFixed(2)}`);
        }


        source.buffer = bufferToPlay;
        source.playbackRate.value = pitchRate; // Apply pitch/speed

        // --- Connect source to mainGainNode, NOT destination ---  <<<<<<<<<< KEY CHANGE
        source.connect(mainGainNode);
        // ----------------------------------------------------

        source.start(time); // Schedule the start

    } catch (e) {
        console.error("Error scheduling sound playback:", e);
    }
}

/**
 * The core scheduling loop function. Checks if new notes need scheduling.
 */
function tempoScheduler() {
    const context = getAudioContext();
    // Added mainGainNode check
    if (!context || !isTempoLooping || !mainGainNode) return; // Stop if loop turned off or context/gain not ready

    // Calculate interval between beats in seconds
    const secondsPerBeat = 60.0 / currentBpm;

    // While there are notes that need scheduling in the near future
    while (nextPlayTime < context.currentTime + SCHEDULE_AHEAD_TIME) {
        // Schedule the sound playback at the calculated time with current pitch
        // It automatically goes through the GainNode now because scheduleSoundPlayback was modified
        scheduleSoundPlayback(nextPlayTime, currentPitchRate, false); // Not reversed for tempo loop

        // Advance the next play time
        nextPlayTime += secondsPerBeat;
    }

    // Re-schedule the check
    schedulerTimerId = setTimeout(tempoScheduler, SCHEDULER_INTERVAL_MS);
}

/**
 * Starts the tempo loop.
 */
export function startTempoLoop() {
    const context = getAudioContext();
    // Added mainGainNode check
    if (isTempoLooping || !context || !decodedAudioBuffer || !mainGainNode) return; // Already looping or not ready

    console.log(`Starting tempo loop at ${currentBpm} BPM.`);
    isTempoLooping = true;
    nextPlayTime = context.currentTime + 0.05;
    tempoScheduler(); // Start the scheduling loop
}

/**
 * Stops the tempo loop.
 */
export function stopTempoLoop() {
    if (!isTempoLooping) return;
    console.log("Stopping tempo loop.");
    isTempoLooping = false;
    clearTimeout(schedulerTimerId); // Cancel the pending scheduler check
    schedulerTimerId = null;
}

/**
 * Sets the tempo (BPM). Restarts the loop if it's active.
 * @param {number} bpm
 * @returns {number} Clamped BPM value
 */
export function setTempo(bpm) {
    currentBpm = Math.max(1, Math.min(bpm, 400)); // Clamp BPM
    console.log(`Tempo set to: ${currentBpm} BPM`);
    if (isTempoLooping) {
        stopTempoLoop();
        startTempoLoop();
    }
    return currentBpm; // Return clamped value
}

/**
 * Sets the pitch/speed rate. Affects future scheduled notes.
 * @param {number} rate (e.g., 1.0 is normal, 0.5 is half speed/lower pitch)
 * @returns {number} Clamped rate value
 */
export function setPitchRate(rate) {
    currentPitchRate = Math.max(0.01, Math.min(rate, 10.0));
    console.log(`Pitch rate set to: ${currentPitchRate.toFixed(3)}`);
    return currentPitchRate; // Return clamped value
}

/**
 * <<<<<<<<<<<< NEW FUNCTION: Sets the main volume level. >>>>>>>>>>>>
 * @param {number} level Volume level (0.0 to max value set in slider/clamping).
 * @returns {number} The clamped volume level that was set.
 */
export function setVolume(level) {
    if (!mainGainNode) {
        console.warn("Cannot set volume: GainNode not initialized.");
        return 0; // Return 0 if gain node doesn't exist yet
    }
    // Clamp the value (matches slider max)
    const clampedLevel = Math.max(0.0, Math.min(level, 1.5));
    // Use setTargetAtTime for smoother volume changes, avoiding clicks
    // Start changing immediately (audioContext.currentTime) and reach the target quickly (e.g., 0.01 seconds)
    mainGainNode.gain.setTargetAtTime(clampedLevel, audioContext.currentTime, 0.01);
    // Alternatively, for immediate change (can sometimes click):
    // mainGainNode.gain.value = clampedLevel;
    console.log(`Volume set to: ${clampedLevel.toFixed(2)}`);
    return clampedLevel;
}


/**
 * Plays the sound once immediately using Web Audio API.
 * Respects the current pitch and volume settings.
 * @param {boolean} reverse Play in reverse?
 */
export async function playOnce(reverse = false) {
    const context = getAudioContext();
    // Added mainGainNode check
    if (!context || !decodedAudioBuffer || !mainGainNode) {
        console.error("Cannot play: Audio not ready or GainNode missing.");
        alert("Audio is not decoded yet. Please wait.");
        return;
    }
     // Ensure context is running
     if (context.state === 'suspended') {
        await context.resume();
    }
    console.log(`Playing sound once (reverse=${reverse}) at pitch rate ${currentPitchRate.toFixed(2)}`);
    // Schedule immediately (context.currentTime) - passes through mainGainNode automatically
    scheduleSoundPlayback(context.currentTime, currentPitchRate, reverse);
}

// Expose necessary state checkers if needed by UI
export function isLooping() {
    return isTempoLooping;
}