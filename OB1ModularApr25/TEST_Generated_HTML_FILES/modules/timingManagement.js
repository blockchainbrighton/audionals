// --- START OF FILE timingManagement.js ---

/**
 * Manages the precise timing and scheduling of looped audio playback.
 * Uses a look-ahead mechanism combined with a fixed loop start time
 * reference and a SUB-BEAT counter to calculate target times accurately.
 * Multiplier changes take effect on the next scheduled event without loop restart.
 */

// --- Constants ---
const SCHEDULER_INTERVAL_MS = 25;   // How often the scheduler wakes up (milliseconds)
const SCHEDULE_AHEAD_TIME_S = 0.1;  // How far ahead to schedule sounds (seconds)
const LOOP_START_DELAY_S = 0.05;   // Small delay before the *first* sound is scheduled

// --- Module State ---
let audioContext = null;
let currentTempo;
let currentPitch;
let isLooping = false;
let schedulerTimeoutId = null;
let scheduleMultiplier = 1; // Default multiplier state
let playCallback = null;

// --- State for Timing ---
let loopStartTime = 0.0;        // The audioContext.currentTime when the loop *initially* started
let scheduledSubBeatCounter = 0; // Increments for each sub-beat scheduled since loopStartTime

// --- Private Helper Functions ---

/**
 * Calculates the duration of a single SUB-beat in seconds.
 * Takes tempo and multiplier into account.
 * @param {number} bpm - Beats Per Minute.
 * @param {number} multiplier - Schedule Multiplier.
 * @returns {number} Duration of one sub-beat in seconds.
 */
function _calculateSubBeatDuration(bpm, multiplier) {
    if (bpm <= 0 || multiplier <= 0) return 0;
    const mainBeatDuration = 60.0 / bpm;
    return mainBeatDuration / multiplier;
}

/**
 * The core look-ahead scheduling function. Runs periodically.
 */
function _scheduleLoopIterations() {
    // Stop recursive calls if looping is disabled externally
    if (!isLooping || !audioContext) {
        return;
    }

    const currentTime = audioContext.currentTime;
    // Calculate how far ahead to schedule in this cycle
    const scheduleUntil = currentTime + SCHEDULE_AHEAD_TIME_S;

    // --- Read CURRENT tempo and multiplier for this scheduling cycle ---
    const effectiveTempo = currentTempo;
    const effectiveMultiplier = scheduleMultiplier; // Use the latest value
    // ----------------------------------------------------------------

    // Calculate the duration of each sub-beat dynamically based on current settings
    const subBeatDuration = _calculateSubBeatDuration(effectiveTempo, effectiveMultiplier);

    if (subBeatDuration <= 0) {
        console.error("TimingManager: Invalid subBeatDuration (<= 0). Stopping loop.");
        stopLoop();
        return;
    }
    // console.log(`Scheduler cycle: Using Multiplier: ${effectiveMultiplier}, SubBeatDuration: ${subBeatDuration.toFixed(4)}`); // DEBUG

    // Loop as long as the next calculated sub-beat time is within the scheduling window
    while (true) {
        // Calculate the precise target time for the NEXT sub-beat based on the fixed loopStartTime
        // and the *current* sub-beat counter. The subBeatDuration used here reflects the
        // tempo and multiplier *at the time of this calculation*.
        const targetTimeForNextSubBeat = loopStartTime + (scheduledSubBeatCounter * subBeatDuration);

        // If this sub-beat's time is beyond our scheduling window, stop scheduling for now.
        if (targetTimeForNextSubBeat >= scheduleUntil) {
            // console.log(`  - Next sub-beat ${scheduledSubBeatCounter} at ${targetTimeForNextSubBeat.toFixed(4)} is beyond window ${scheduleUntil.toFixed(4)}. Breaking.`);
            break; // Exit the while loop for this scheduler iteration
        }

        // Schedule the sound for the calculated sub-beat time
        if (playCallback && typeof playCallback === 'function') {
            // console.log(`  - Scheduling Sub-Beat ${scheduledSubBeatCounter} at ${targetTimeForNextSubBeat.toFixed(4)}`);
            playCallback(targetTimeForNextSubBeat);
        } else {
            console.error("TimingManager: playCallback is missing or invalid during scheduling loop. Stopping.");
            stopLoop();
            return; // Exit function immediately
        }

        // Increment the SUB-beat counter AFTER scheduling
        scheduledSubBeatCounter++;

    } // End of while loop

    // Schedule the next scheduler wake-up
    schedulerTimeoutId = setTimeout(_scheduleLoopIterations, SCHEDULER_INTERVAL_MS);
}


// --- getCurrentScheduleMultiplier remains the same ---
export function getCurrentScheduleMultiplier() {
    return scheduleMultiplier;
}

// --- setScheduleMultiplier: NOW ONLY UPDATES THE STATE VARIABLE ---
/**
 * Sets the schedule multiplier state. The change will be picked up by the
 * next scheduler cycle without restarting the loop.
 * @param {number} multiplier - The new multiplier value (integer >= 1).
 */
/**
 * Sets the schedule multiplier state. Adjusts the internal sub-beat counter
 * to maintain phase alignment with the original loopStartTime without restarting.
 * @param {number} multiplier - The new multiplier value (integer >= 1).
 */
export function setScheduleMultiplier(multiplier) {
    const newMultiplier = parseInt(multiplier, 10);

    // Validate: Ensure it's a positive integer
    if (!Number.isInteger(newMultiplier) || newMultiplier < 1) {
        console.warn(`TimingManager: Invalid schedule multiplier received: ${multiplier}. Must be an integer >= 1.`);
        return;
    }

    // Check if the value actually changed
    if (scheduleMultiplier === newMultiplier) {
        return; // No change, do nothing
    }

    const oldMultiplier = scheduleMultiplier;
    console.log(`TimingManager: Updating schedule multiplier state from ${oldMultiplier} to ${newMultiplier}. Adjusting counter for phase.`);

    // --- Calculate the new state and adjust counter ---
    scheduleMultiplier = newMultiplier; // Update the state variable FIRST

    // If the loop is running, adjust the counter to maintain phase
    if (isLooping && audioContext && currentTempo > 0) {
        const changeTime = audioContext.currentTime;
        const elapsedTimeSinceLoopStart = Math.max(0, changeTime - loopStartTime); // Ensure non-negative

        // Calculate the duration of one sub-beat with the NEW multiplier
        const newSubBeatDuration = _calculateSubBeatDuration(currentTempo, scheduleMultiplier);

        if (newSubBeatDuration > 0) {
            // Calculate how many *new* sub-beats should have theoretically passed
            // Use floor to get the count of completed beats up to this point.
            const expectedCounterAtChangeTime = Math.floor(elapsedTimeSinceLoopStart / newSubBeatDuration);

            // Log the adjustment details (optional)
            console.log(`  - Change time: ${changeTime.toFixed(4)}`);
            console.log(`  - Loop start: ${loopStartTime.toFixed(4)}`);
            console.log(`  - Elapsed: ${elapsedTimeSinceLoopStart.toFixed(4)}`);
            console.log(`  - New SubBeat Duration: ${newSubBeatDuration.toFixed(4)}`);
            console.log(`  - Old Counter: ${scheduledSubBeatCounter}`);
            console.log(`  - Calculated Expected Counter: ${expectedCounterAtChangeTime}`);

            // Set the counter to the calculated value. The next scheduler iteration
            // will use this counter and the newSubBeatDuration.
            // We might add 1 to schedule the *next* beat after the change time.
            // Let's try setting it directly first. If the next beat seems skipped, add 1.
            scheduledSubBeatCounter = expectedCounterAtChangeTime;
             console.log(`  - Counter adjusted to: ${scheduledSubBeatCounter}`);

        } else {
            console.warn("TimingManager: Cannot adjust counter, new sub-beat duration is invalid.");
            // Maybe stop the loop if this happens?
        }
    }
    // If the loop isn't running, just updating scheduleMultiplier is sufficient.
}


/**
 * Internal function to clear the scheduler timeout and reset timing state.
 * @param {boolean} [resetState=true] - Whether to also reset counters and start time.
 */
function _stopLoopInternal(resetState = true) {
     if (schedulerTimeoutId) {
        clearTimeout(schedulerTimeoutId);
        schedulerTimeoutId = null;
     }
     if (resetState) {
        loopStartTime = 0.0;
        scheduledSubBeatCounter = 0;
        // Optionally reset multiplier state on stop? Or keep it for next start?
        // Let's keep it for now, consistent with tempo/pitch.
        // scheduleMultiplier = 1;
     }
}

export function getLoopStartTime() {
    return loopStartTime;
}

// --- Public API ---

// --- init remains the same ---
export function init(context, initialTempo, initialPitch) {
    if (!(context instanceof AudioContext)) {
        throw new Error("TimingManager Init: Invalid AudioContext provided.");
    }
    audioContext = context;
    currentTempo = initialTempo;
    currentPitch = initialPitch;
    isLooping = false;
    playCallback = null;
    scheduleMultiplier = 1; // Ensure default on init
    _stopLoopInternal(true); // Reset state cleanly
    console.log(`TimingManager initialized. Tempo: ${currentTempo}, Pitch: ${currentPitch}, Multiplier: ${scheduleMultiplier}`);
}

// --- startLoop remains the same (Sub-Beat Counter version) ---
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
    }

    console.log("TimingManager: Starting loop.");
    isLooping = true;
    playCallback = soundPlaybackCallback;

    // --- Initialize fixed start time reference and counter ---
    loopStartTime = audioContext.currentTime + LOOP_START_DELAY_S;
    scheduledSubBeatCounter = 0; // Start counting sub-beats from 0 for this loop instance

    console.log(`TimingManager: Loop start time reference set to ${loopStartTime.toFixed(4)}. Initial sub-beat count: ${scheduledSubBeatCounter}. Current Multiplier: ${scheduleMultiplier}`);

    // Kick off the first scheduler cycle immediately
    _scheduleLoopIterations();
}

// --- stopLoop remains the same ---
export function stopLoop() {
    if (!isLooping) return;

    console.log("TimingManager: Stopping loop.");
    isLooping = false;
    playCallback = null;
    _stopLoopInternal(true); // Clear timeout and reset state (including subBeatCounter)
}

// --- setTempo STILL Restarts the Loop ---
// Tempo changes require recalculating the entire beat grid relative to the start time.
export function setTempo(bpm) {
    if (typeof bpm !== 'number' || bpm <= 0) {
        console.warn(`TimingManager: Invalid tempo value received: ${bpm}`);
        return;
    }
    const oldTempo = currentTempo;
    currentTempo = bpm;

    if (isLooping && currentTempo !== oldTempo) {
        console.log(`TimingManager: Tempo changed to ${currentTempo}. Restarting loop for phase accuracy.`);
        const callback = playCallback; // Store callback
        const currentMultiplierState = scheduleMultiplier; // Store multiplier

        // Stop the current scheduler cleanly
        _stopLoopInternal(false); // Stop scheduler without resetting state immediately
        isLooping = false;
        playCallback = null;

        if (callback) {
            // Re-initialize state for the new tempo phase
            loopStartTime = audioContext.currentTime + LOOP_START_DELAY_S;
            scheduledSubBeatCounter = 0;
            scheduleMultiplier = currentMultiplierState; // Restore multiplier state

            console.log(`TimingManager: Restarting loop with new tempo ${currentTempo}. New start time: ${loopStartTime.toFixed(4)}, Multiplier: ${scheduleMultiplier}`);
            // Call startLoop directly (it handles setting isLooping=true etc.)
            startLoop(callback);
        } else {
            console.error("TimingManager: Cannot restart loop after tempo change - callback was lost.");
            _stopLoopInternal(true); // Full reset if restart fails
        }
    } else if (!isLooping) {
         // console.log(`TimingManager: Tempo set to ${currentTempo} BPM (Loop inactive)`);
    }
}


// --- setPitch remains the same ---
export function setPitch(rate) {
     if (typeof rate === 'number' && rate > 0) {
        currentPitch = rate;
    } else {
         console.warn(`TimingManager: Invalid pitch value received: ${rate}`);
    }
}

// --- Getters remain the same ---
export function getLoopingState() { return isLooping; }
export function getCurrentTempo() { return currentTempo; }
export function getCurrentPitch() { return currentPitch; }

// --- END OF FILE timingManagement.js ---