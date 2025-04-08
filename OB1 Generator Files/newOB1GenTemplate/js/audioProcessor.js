// --- Web Audio API Setup ---
let audioContext = null;
let decodedAudioBuffer = null; // Store the fully decoded audio data
let reversedAudioBuffer = null; // <<<<<<<< ADDED: Store the reversed audio data
let mainGainNode = null;       // Main volume control node
let schedulerTimerId = null; // ID for the setTimeout used for scheduling lookahead
let isTempoLooping = false;
let nextPlayTime = 0.0; // When the next note is scheduled to play in AudioContext time
let currentBpm = 76.0; // Default BPM
let currentPitchRate = 1.0; // Default pitch/speed multiplier
let isReverseModeEnabled = false; // <<<<<<<< ADDED: Global reverse state

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

            mainGainNode = audioContext.createGain();
            mainGainNode.gain.value = 1.0;
            mainGainNode.connect(audioContext.destination);
            console.log("Main GainNode created and connected to destination.");

        } catch (e) {
            console.error("Error creating AudioContext or GainNode:", e);
            alert("Could not initialize Web Audio API.");
            return null;
        }
    }
    if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => console.log("AudioContext resumed."))
                           .catch(err => console.warn("AudioContext resume failed:", err));
    }
    return audioContext;
}

/**
 * Decodes audio data into an AudioBuffer for Web Audio API processing.
 * Also triggers creation of the initial reversed buffer if needed later.
 * @param {ArrayBuffer} arrayBuffer The raw audio data.
 * @returns {Promise<boolean>} True if decoding was successful, false otherwise.
 */
export async function decodeAudioDataForProcessing(arrayBuffer) {
    const context = getAudioContext();
    if (!context) return false;
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        console.error("Cannot decode: Invalid ArrayBuffer provided.");
        return false;
    }
    if (decodedAudioBuffer) return true; // Already decoded

    try {
        console.log("Decoding audio data for Web Audio API...");
        decodedAudioBuffer = await context.decodeAudioData(arrayBuffer.slice(0));
        console.log("Audio data decoded successfully for Web Audio API.");
        // Pre-calculate reversed buffer now that original is ready
        reversedAudioBuffer = createReversedBuffer(context, decodedAudioBuffer);
        if (!reversedAudioBuffer) {
            console.warn("Could not pre-calculate reversed buffer during decoding.");
            // This isn't fatal, it can be attempted again later if needed
        } else {
            console.log("Reversed audio buffer pre-calculated.");
        }
        return true;
    } catch (e) {
        console.error("Error decoding audio data with Web Audio API:", e);
        alert(`Failed to decode audio data: ${e.message}. Playback disabled.`);
        decodedAudioBuffer = null;
        reversedAudioBuffer = null; // Ensure reverse is null too
        return false;
    }
}

/**
 * Creates a reversed version of an audio buffer.
 * @param {AudioContext} context The audio context.
 * @param {AudioBuffer} originalBuffer The buffer to reverse.
 * @returns {AudioBuffer|null} The reversed buffer or null on error.
 */
function createReversedBuffer(context, originalBuffer) {
    if (!context || !originalBuffer) {
        console.error("Cannot create reversed buffer: Invalid context or original buffer.");
        return null;
    }
    try {
        console.log("Creating reversed buffer...");
        const numChannels = originalBuffer.numberOfChannels;
        const numFrames = originalBuffer.length;
        const sampleRate = originalBuffer.sampleRate;

        const reversed = context.createBuffer(numChannels, numFrames, sampleRate);

        // Use copyFromChannel and copyToChannel for modern API compliance
        let channelData = new Float32Array(numFrames);
        for (let i = 0; i < numChannels; i++) {
            originalBuffer.copyFromChannel(channelData, i);
            channelData.reverse(); // Reverse the array in place
            reversed.copyToChannel(channelData, i);
        }
        console.log("Reversed buffer created successfully.");
        return reversed;
    } catch (e) {
        console.error("Error creating reversed buffer:", e);
        return null; // Return null on error
    }
}


/**
 * Schedules a single playback of the decoded buffer at a specific time through the main GainNode.
 * Uses the global `isReverseModeEnabled` state to decide which buffer to play.
 * Applies the current `currentPitchRate`.
 * @param {number} time The absolute time in the AudioContext's timeline to start playback.
 * @param {number} pitchRate The playback rate (speed/pitch) for this note.
 */
async function scheduleSoundPlayback(time, pitchRate) { // <<<<<<<< REMOVED `reverse` parameter
    const context = getAudioContext();
    // Select buffer based on global state *before* checking context readiness
    let bufferToUse = isReverseModeEnabled ? reversedAudioBuffer : decodedAudioBuffer;
    const direction = isReverseModeEnabled ? "REVERSED" : "FORWARD";

    // Ensure the *selected* buffer is valid
    if (!context || !bufferToUse || !mainGainNode) {
         console.error(`Cannot schedule ${direction} playback: Context, selected buffer, or GainNode missing.`);
         // If reverse is on but the reversed buffer failed creation, try falling back to forward?
         if (isReverseModeEnabled && !reversedAudioBuffer && decodedAudioBuffer) {
             console.warn("Reversed buffer missing, attempting to play forward instead.");
             bufferToUse = decodedAudioBuffer; // Fallback
             if (!bufferToUse) return; // Still no buffer, give up
         } else {
            return; // Critical component missing
         }
    }

     // Ensure context is running before scheduling
     if (context.state === 'suspended') {
        console.log("Context suspended, attempting resume before scheduling...");
        try {
            await context.resume();
             console.log("Context resumed successfully.");
        } catch (err) {
             console.error("Failed to resume context before playback:", err);
             alert("Audio context is blocked. Please interact with the page (e.g., click) and try again.");
             return;
        }
    }
     if (context.state !== 'running') {
         console.warn(`Cannot schedule playback: Context state is ${context.state}.`);
         return;
     }

    try {
        const source = context.createBufferSource();
        source.buffer = bufferToUse;
        source.playbackRate.value = pitchRate; // Apply pitch/speed
        source.connect(mainGainNode);          // Connect source to main volume control

        console.log(`Scheduling ${direction} sound at time ${time.toFixed(3)} with rate ${pitchRate.toFixed(2)}`);
        source.start(time);                    // Schedule the start

        source.onended = () => {
            try { source.disconnect(); } catch (e) {}
            // console.log(`Source node (${direction}) finished and disconnected.`);
        };

    } catch (e) {
        console.error(`Error scheduling ${direction} sound playback:`, e);
    }
}

/**
 * The core scheduling loop function. Checks if new notes need scheduling.
 */
function tempoScheduler() {
    const context = getAudioContext();
    const bufferAvailable = isReverseModeEnabled ? !!reversedAudioBuffer : !!decodedAudioBuffer;

    if (!context || !isTempoLooping || !mainGainNode || !bufferAvailable) {
        console.warn("Tempo loop stopping: Missing context, gain node, loop flag, or required buffer.", {
            context:!!context, loop:isTempoLooping, gain:!!mainGainNode, buffer:bufferAvailable, reverse:isReverseModeEnabled
        });
        stopTempoLoop();
        return;
    }

    if (context.state !== 'running') {
        console.warn("Tempo loop paused because AudioContext is not running.");
        stopTempoLoop();
        return;
    }

    const secondsPerBeat = 60.0 / currentBpm;

    while (nextPlayTime < context.currentTime + SCHEDULE_AHEAD_TIME) {
        // Schedule using the current pitch rate. scheduleSoundPlayback handles reverse state.
        scheduleSoundPlayback(nextPlayTime, currentPitchRate); // <<<<<<<< REMOVED `false` argument

        nextPlayTime += secondsPerBeat;
    }

    if (isTempoLooping) {
      schedulerTimerId = setTimeout(tempoScheduler, SCHEDULER_INTERVAL_MS);
    }
}

/**
 * Starts the tempo loop.
 */
export function startTempoLoop() {
    const context = getAudioContext();
    const bufferAvailable = isReverseModeEnabled ? !!reversedAudioBuffer : !!decodedAudioBuffer;

    if (isTempoLooping || !context || !bufferAvailable || !mainGainNode) {
        console.warn("Cannot start tempo loop: Already looping or audio/context not ready.", {
            looping: isTempoLooping, context: !!context, buffer: bufferAvailable, gain: !!mainGainNode, reverse:isReverseModeEnabled
        });
         if (!bufferAvailable) {
             alert(`Cannot start loop: Required audio buffer (${isReverseModeEnabled ? 'reversed' : 'forward'}) is missing.`);
         }
        return;
    }

    if (context.state !== 'running') {
        context.resume().then(() => {
            console.log("Context resumed, now starting tempo loop.");
            isTempoLooping = true;
            nextPlayTime = context.currentTime + 0.05;
            tempoScheduler();
        }).catch(err => {
             console.error("Could not resume context to start tempo loop:", err);
             alert("Could not start loop: Audio context is blocked.");
        });
    } else {
        console.log(`Starting tempo loop at ${currentBpm} BPM (Reverse: ${isReverseModeEnabled}).`);
        isTempoLooping = true;
        nextPlayTime = context.currentTime + 0.05;
        tempoScheduler();
    }
}

/**
 * Stops the tempo loop.
 */
export function stopTempoLoop() {
    if (!isTempoLooping && !schedulerTimerId) return;
    console.log("Stopping tempo loop.");
    isTempoLooping = false;
    if (schedulerTimerId) {
        clearTimeout(schedulerTimerId);
        schedulerTimerId = null;
    }
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(value, max));
}

/**
 * Sets the tempo (BPM). Restarts the loop if it's active.
 * @param {number} bpm
 * @returns {number} Clamped BPM value
 */
export function setTempo(bpm) {
    const clampedBpm = clamp(bpm, 1, 400);
    if (clampedBpm !== currentBpm) {
        currentBpm = clampedBpm;
        console.log(`Tempo set to: ${currentBpm} BPM`);
        if (isTempoLooping) {
            console.log("Tempo changed while looping, restarting loop scheduler...");
            clearTimeout(schedulerTimerId);
            schedulerTimerId = null;
            nextPlayTime = audioContext?.currentTime ?? 0;
            tempoScheduler();
        }
    }
    return currentBpm;
}

/**
 * Sets the pitch/speed rate. Affects future scheduled notes.
 * @param {number} rate (e.g., 1.0 is normal, 0.5 is half speed/lower pitch)
 * @returns {number} Clamped rate value
 */
export function setPitchRate(rate) {
    const clampedRate = clamp(rate, 0.01, 10.0);
    if (clampedRate !== currentPitchRate) {
        currentPitchRate = clampedRate;
        console.log(`Pitch rate set to: ${currentPitchRate.toFixed(3)}`);
    }
    return currentPitchRate;
}

/**
 * Sets the main volume level using the main GainNode.
 * @param {number} level Volume level (typically 0.0 to 1.0, but allowing up to 1.5 based on slider).
 * @returns {number} The clamped volume level that was set.
 */
export function setVolume(level) {
    if (!mainGainNode || !audioContext) {
        console.warn("Cannot set volume: GainNode or AudioContext not initialized.");
        return clamp(level, 0.0, 1.5);
    }
    const clampedLevel = clamp(level, 0.0, 1.5);
    mainGainNode.gain.setTargetAtTime(clampedLevel, audioContext.currentTime, 0.015);
    // console.log(`Volume set to: ${clampedLevel.toFixed(2)}`); // Less verbose logging for volume
    return clampedLevel;
}


/**
 * Plays the sound once immediately using Web Audio API.
 * Respects the current pitch, volume, and REVERSE settings.
 */
// <<<<<<<< REMOVED `reverse` parameter from definition
export async function playOnce() {
    const context = getAudioContext();
    const bufferAvailable = isReverseModeEnabled ? !!reversedAudioBuffer : !!decodedAudioBuffer;

    if (!context || !bufferAvailable || !mainGainNode) {
        console.error("Cannot play once: Audio not ready or GainNode missing.", {
             context:!!context, buffer:bufferAvailable, gain:!!mainGainNode, reverse:isReverseModeEnabled
         });
        alert(`Cannot play once: Required audio buffer (${isReverseModeEnabled ? 'reversed' : 'forward'}) is missing or context not ready.`);
        return;
    }

     if (context.state === 'suspended') {
        console.log("Context suspended, attempting resume before playOnce...");
        try {
            await context.resume();
             console.log("Context resumed.");
        } catch(err) {
             console.error("Failed to resume context before playOnce:", err);
             alert("Audio context is blocked. Please interact with the page (e.g., click) and try again.");
             return;
        }
    }

    // Log direction based on state
    const direction = isReverseModeEnabled ? "REVERSED" : "FORWARD";
    console.log(`Playing sound once (${direction}) at pitch rate ${currentPitchRate.toFixed(2)}`);

    // Schedule immediately. scheduleSoundPlayback uses global reverse state.
    // <<<<<<<< REMOVED `reverse` argument from call
    scheduleSoundPlayback(context.currentTime, currentPitchRate);
}

/**
 * Checks if the tempo loop is currently active.
 * @returns {boolean} True if the loop is considered active.
 */
export function isLooping() {
    return isTempoLooping;
}

/**
 * Checks if the *required* audio buffer (forward or reversed based on current mode) is ready.
 * @returns {boolean} True if the necessary audio buffer is ready.
 */
export function isAudioReady() {
    // Check for the specific buffer needed based on the reverse mode
    if (isReverseModeEnabled) {
        return !!reversedAudioBuffer;
    } else {
        return !!decodedAudioBuffer;
    }
}

// --- NEW Reverse Mode Control ---

/**
 * Toggles the global reverse playback mode.
 * Attempts to create the reversed buffer if switching to reverse and it doesn't exist.
 * @returns {boolean} The new state of isReverseModeEnabled.
 */
export function toggleReverseMode() {
    isReverseModeEnabled = !isReverseModeEnabled;
    console.log(`Reverse mode toggled ${isReverseModeEnabled ? 'ON' : 'OFF'}`);

    // If turning reverse ON and the buffer doesn't exist yet, try creating it now.
    if (isReverseModeEnabled && !reversedAudioBuffer && decodedAudioBuffer && audioContext) {
        console.warn("Reversed buffer was missing, attempting to create now...");
        reversedAudioBuffer = createReversedBuffer(audioContext, decodedAudioBuffer);
        if (!reversedAudioBuffer) {
            console.error("Failed to create reversed buffer on demand. Reverse playback may fail.");
            alert("Error: Could not create the reversed audio version. Reverse mode might not work.");
            // Optional: revert the toggle if creation fails?
            // isReverseModeEnabled = false;
            // console.log("Reverse mode reverted to OFF due to buffer creation failure.");
        }
    }

    // If the loop is currently running, we might need to restart it
    // to immediately reflect the change in buffer source.
    if (isLooping()) {
        console.log("Reverse mode changed while looping, restarting loop...");
        // Stop scheduling with the old buffer source
         clearTimeout(schedulerTimerId);
         schedulerTimerId = null;
         // Reset next play time
         nextPlayTime = audioContext?.currentTime ?? 0;
         // Start the scheduler again, it will now pick up the correct buffer
        tempoScheduler();
    }


    return isReverseModeEnabled;
}

/**
 * Checks if the global reverse playback mode is currently enabled.
 * @returns {boolean} True if reverse mode is active.
 */
export function isReverseEnabled() {
    return isReverseModeEnabled;
}