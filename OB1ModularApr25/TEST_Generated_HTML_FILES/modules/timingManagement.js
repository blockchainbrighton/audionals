// --- START OF FILE timingManagement.js ---

/**
 * Manages the precise timing and scheduling of looped audio playback.
 * Uses a look-ahead mechanism combined with a fixed loop start time
 * reference and beat counter to calculate target times, aiming for
 * accuracy and resilience against scheduler jitter.
 */

// --- Constants ---
const SCHEDULER_INTERVAL_MS = 25;   // How often the scheduler wakes up (milliseconds)
const SCHEDULE_AHEAD_TIME_S = 0.1;  // How far ahead to schedule beats (seconds)
const LOOP_START_DELAY_S = 0.05;   // Small delay before the *first* beat is scheduled relative to currentTime

// --- Module State ---
let audioContext = null;        // Reference to the Web Audio API context
let currentTempo;          // Current tempo (BPM)
let currentPitch;         // Current playback rate
let isLooping = false;          // Flag indicating if the loop is currently active
let schedulerTimeoutId = null;  // Stores the ID from setTimeout for the scheduler interval
let playCallback = null;        // Function from audioProcessor to play the sound

// --- State for Fixed Start Time Reference ---
let loopStartTime = 0.0;        // The audioContext.currentTime when the loop conceptually starts
let beatCounter = 0;            // Increments for each beat scheduled *and calculated* since loopStartTime


// --- Private Helper Functions ---

/**
 * Calculates the duration of a single beat in seconds.
 * @param {number} bpm - Beats Per Minute.
 * @returns {number} Duration of one beat in seconds.
 */
function _calculateBeatDuration(bpm) {
    if (bpm <= 0) return 0;
    return 60.0 / bpm;
}

/**
 * The core look-ahead scheduling function. Runs periodically on a fixed interval.
 */
function _scheduleLoopIterations() {
    // Stop recursive calls if looping is disabled externally
    if (!isLooping || !audioContext) {
        // Don't reset state here, let the public stopLoop handle it
        return;
    }

    const currentTime = audioContext.currentTime;
    const beatDuration = _calculateBeatDuration(currentTempo);

    if (beatDuration <= 0) {
        console.error("TimingManager: Invalid beatDuration (<= 0). Stopping loop.");
        stopLoop(); // Use public stop to reset state
        return;
    }

    // Calculate how far ahead to schedule in this cycle
    const scheduleUntil = currentTime + SCHEDULE_AHEAD_TIME_S;

    // console.log(`Scheduler Tick: Current=${currentTime.toFixed(4)}, ScheduleUntil=${scheduleUntil.toFixed(4)}`);

    // --- Loop and schedule beats within the look-ahead window ---
    while (true) {
        // Calculate the precise target time for the beat corresponding to the current beatCounter
        const targetTimeForThisBeat = loopStartTime + (beatCounter * beatDuration);

        // If this beat's time is beyond our scheduling window, break the inner loop
        if (targetTimeForThisBeat >= scheduleUntil) {
            // console.log(`  - Beat ${beatCounter} (at ${targetTimeForThisBeat.toFixed(4)}) is beyond window. Breaking.`);
            break;
        }

        // If this beat's time has already passed (e.g., due to heavy load/lag),
        // schedule it for the next possible moment or skip?
        // For now, schedule it anyway - the Web Audio API handles past times gracefully (plays immediately).
        // if (targetTimeForThisBeat < currentTime) {
        //     console.warn(`TimingManager: Beat ${beatCounter} target time ${targetTimeForThisBeat.toFixed(4)} is in the past! (Current: ${currentTime.toFixed(4)})`);
        // }


        // Schedule the note using the precisely calculated target time
        if (playCallback && typeof playCallback === 'function') {
            // console.log(`  - Scheduling Beat ${beatCounter} at ${targetTimeForThisBeat.toFixed(4)}`);
            playCallback(targetTimeForThisBeat);
        } else {
            console.error("TimingManager: playCallback is missing or invalid during scheduling loop. Stopping.");
            stopLoop(); // Use public stop to reset state
            return; // Exit function immediately
        }

        // Increment the counter *after* successfully scheduling the beat
        beatCounter++;
    } // End of while loop

    // --- Schedule the next scheduler wake-up ---
    // Note: We use a new timeout ID each time
    schedulerTimeoutId = setTimeout(_scheduleLoopIterations, SCHEDULER_INTERVAL_MS);
}


/**
 * Internal function to clear the scheduler timeout.
 * @param {boolean} [resetState=true] - Whether to also reset beatCounter and loopStartTime.
 */
function _stopLoopInternal(resetState = true) {
     if (schedulerTimeoutId) {
        clearTimeout(schedulerTimeoutId);
        schedulerTimeoutId = null;
     }
     if (resetState) {
        loopStartTime = 0.0;
        beatCounter = 0;
     }
}

// --- Public API ---

/**
  * Initializes the timing manager.
  * Assumes initialTempo and initialPitch passed in are valid numbers.
  * @param {AudioContext} context - The Web Audio API AudioContext.
  * @param {number} initialTempo - The starting tempo in BPM.
  * @param {number} initialPitch - The starting pitch (playback rate).
  */
export function init(context, initialTempo, initialPitch) {
    if (!(context instanceof AudioContext)) {
        throw new Error("TimingManager Init: Invalid AudioContext provided.");
    }
    audioContext = context;
    // Directly assign the values passed from audioProcessor.js
    // No need for redundant validation or fallbacks here
    currentTempo = initialTempo;
    currentPitch = initialPitch; // Assuming validated upstream

    isLooping = false;
    playCallback = null;
    _stopLoopInternal(true); // Ensure state is reset cleanly
    console.log(`TimingManager initialized (Look-Ahead Fixed-Ref). Tempo: ${currentTempo}, Pitch: ${currentPitch}`);
}

/**
 * Starts the tempo-synchronized loop playback using look-ahead scheduling
 * with a fixed start time reference.
 * @param {function(number): void} soundPlaybackCallback - Function called with the
 *   precise scheduled AudioContext time for each beat.
 */
export function startLoop(soundPlaybackCallback) {
    if (isLooping || !audioContext) {
        console.warn("TimingManager: Loop already active or audio context unavailable.");
        return;
    }
    if (typeof soundPlaybackCallback !== 'function') {
         console.error("TimingManager: startLoop requires a valid soundPlaybackCallback function.");
         return;
    }

    if (audioContext.state === 'suspended') {
        console.warn("TimingManager: AudioContext is suspended. Loop start might be delayed until resume.");
        // AudioProcessor should ensure resume before calling this.
    }

    console.log("TimingManager: Starting loop (Look-Ahead Fixed-Ref).");
    isLooping = true;
    playCallback = soundPlaybackCallback;

    // --- Initialize fixed start time reference ---
    // Calculate the time for the *first* beat (beat 0)
    loopStartTime = audioContext.currentTime + LOOP_START_DELAY_S;
    beatCounter = 0; // Start counting beats from 0

    console.log(`TimingManager: Loop start time reference set to ${loopStartTime.toFixed(4)}`);

    // Kick off the first scheduler cycle immediately
    _scheduleLoopIterations();
}

/**
 * Stops the loop playback immediately and resets timing state.
 */
export function stopLoop() {
    if (!isLooping) return;

    console.log("TimingManager: Stopping loop.");
    isLooping = false;
    playCallback = null;
    _stopLoopInternal(true); // Clear timeout and reset state
}

/**
 * Sets the playback tempo (BPM). If the loop is active, it restarts
 * the loop with a new fixed start time reference to maintain phase accuracy.
 * @param {number} bpm - The desired tempo in Beats Per Minute.
 */
export function setTempo(bpm) {
    if (typeof bpm !== 'number' || bpm <= 0) {
        console.warn(`TimingManager: Invalid tempo value received: ${bpm}`);
        return;
    }

    const oldTempo = currentTempo;
    currentTempo = bpm;

    if (isLooping && currentTempo !== oldTempo) {
        console.log(`TimingManager: Tempo changed to ${currentTempo}. Restarting loop for phase accuracy.`);
        const callback = playCallback;
        stopLoop();
        if (callback) {
           startLoop(callback); // Establishes new loopStartTime and resets beatCounter
        } else {
            console.error("TimingManager: Cannot restart loop after tempo change - callback was lost.");
        }
    } else if (!isLooping) {
         // If not looping, just log the tempo change if desired
         // console.log(`TimingManager: Tempo set to ${currentTempo} BPM (Loop inactive)`);
    }
}

/**
 * Sets the playback pitch (rate). Does not affect loop timing.
 * @param {number} rate - Playback rate (1.0 = normal).
 */
export function setPitch(rate) {
     if (typeof rate === 'number' && rate > 0) {
        currentPitch = rate;
    } else {
         console.warn(`TimingManager: Invalid pitch value received: ${rate}`);
    }
}

// --- Getters ---

export function getLoopingState() {
    return isLooping;
}

export function getCurrentTempo() {
    return currentTempo;
}

export function getCurrentPitch() {
    return currentPitch;
}

// Optional getter for debugging, might be less relevant now
// export function getNextBeatTargetTime() { ... }

// --- END OF FILE timingManagement.js ---