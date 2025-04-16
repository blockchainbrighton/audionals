// --- START OF FILE timingManagement.js ---

const SCHEDULER_INTERVAL_MS = 25;     // Scheduler wake interval (ms)
const SCHEDULE_AHEAD_TIME_S  = 0.1;     // How far ahead to schedule sounds (s)
const LOOP_START_DELAY_S     = 0.05;    // Delay before first sound is scheduled

let audioContext = null,
    currentTempo,
    currentPitch,
    isLooping = false,
    schedulerTimeoutId = null,
    scheduleMultiplier = 1,
    playCallback = null,
    loopStartTime = 0,
    scheduledSubBeatCounter = 0;

// Calculates one sub-beat duration (s) based on BPM and multiplier.
const _calculateSubBeatDuration = (bpm, multiplier) =>
    (bpm > 0 && multiplier > 0 ? (60 / bpm) / multiplier : 0);

function _scheduleLoopIterations() {
    if (!isLooping || !audioContext) return;
    const currentTime = audioContext.currentTime,
          scheduleUntil = currentTime + SCHEDULE_AHEAD_TIME_S,
          subBeatDuration = _calculateSubBeatDuration(currentTempo, scheduleMultiplier);

    if (subBeatDuration <= 0) {
        console.error("TimingManager: Invalid subBeatDuration (<= 0). Stopping loop.");
        return stopLoop();
    }

    while (loopStartTime + scheduledSubBeatCounter * subBeatDuration < scheduleUntil) {
        const targetTime = loopStartTime + scheduledSubBeatCounter * subBeatDuration;
        if (typeof playCallback === 'function') playCallback(targetTime);
        else {
            console.error("TimingManager: playCallback is missing or invalid. Stopping.");
            return stopLoop();
        }
        scheduledSubBeatCounter++;
    }
    schedulerTimeoutId = setTimeout(_scheduleLoopIterations, SCHEDULER_INTERVAL_MS);
}

export function getCurrentScheduleMultiplier() { return scheduleMultiplier; }

export function setScheduleMultiplier(multiplier) {
    const newMultiplier = parseInt(multiplier, 10);
    if (!Number.isInteger(newMultiplier) || newMultiplier < 1)
        return console.warn(`TimingManager: Invalid multiplier: ${multiplier}. Must be an integer >= 1.`);
    if (scheduleMultiplier === newMultiplier) return;
    console.log(`TimingManager: Updating multiplier from ${scheduleMultiplier} to ${newMultiplier}.`);
    scheduleMultiplier = newMultiplier;
    if (isLooping && audioContext && currentTempo > 0) {
        const elapsed = Math.max(0, audioContext.currentTime - loopStartTime),
              newSubBeatDuration = _calculateSubBeatDuration(currentTempo, scheduleMultiplier);
        if (newSubBeatDuration > 0) {
            const expectedCounter = Math.floor(elapsed / newSubBeatDuration);
            console.log(`  - Time: ${audioContext.currentTime.toFixed(4)}, Start: ${loopStartTime.toFixed(4)}, Elapsed: ${elapsed.toFixed(4)}, New Duration: ${newSubBeatDuration.toFixed(4)}, Old Counter: ${scheduledSubBeatCounter}, Expected: ${expectedCounter}`);
            scheduledSubBeatCounter = expectedCounter;
            console.log(`  - Counter adjusted to: ${scheduledSubBeatCounter}`);
        } else {
            console.warn("TimingManager: Cannot adjust counter; invalid new sub-beat duration.");
        }
    }
}

function _stopLoopInternal(resetState = true) {
    if (schedulerTimeoutId) clearTimeout(schedulerTimeoutId);
    schedulerTimeoutId = null;
    if (resetState) { loopStartTime = 0; scheduledSubBeatCounter = 0; }
}

export function init(context, initialTempo, initialPitch) {
    if (!(context instanceof AudioContext))
        throw new Error("TimingManager Init: Invalid AudioContext provided.");
    audioContext = context;
    currentTempo = initialTempo;
    currentPitch = initialPitch;
    isLooping = false;
    playCallback = null;
    scheduleMultiplier = 1;
    _stopLoopInternal(true);
    console.log(`TimingManager initialized. Tempo: ${currentTempo}, Pitch: ${currentPitch}, Multiplier: ${scheduleMultiplier}`);
}

export function startLoop(callback) {
    if (isLooping || !audioContext)
        return console.warn("TimingManager: Loop already active or audio context unavailable.");
    if (typeof callback !== 'function')
        return console.error("TimingManager: startLoop requires a valid soundPlaybackCallback.");
    if (audioContext.state === 'suspended')
        console.warn("TimingManager: AudioContext is suspended. Loop start might be delayed.");

    isLooping = true;
    playCallback = callback;
    loopStartTime = audioContext.currentTime + LOOP_START_DELAY_S;
    scheduledSubBeatCounter = 0;
    console.log(`TimingManager: Loop starting at ${loopStartTime.toFixed(4)}; Sub-beat count: ${scheduledSubBeatCounter}; Multiplier: ${scheduleMultiplier}`);
    _scheduleLoopIterations();
}

export function stopLoop() {
    if (!isLooping) return;
    console.log("TimingManager: Stopping loop.");
    isLooping = false;
    playCallback = null;
    _stopLoopInternal(true);
}

export function setTempo(bpm) {
    if (typeof bpm !== 'number' || bpm <= 0)
        return console.warn(`TimingManager: Invalid tempo value: ${bpm}`);
    const oldTempo = currentTempo;
    currentTempo = bpm;
    if (isLooping && bpm !== oldTempo) {
        console.log(`TimingManager: Tempo changed to ${bpm}. Restarting loop for phase accuracy.`);
        const callback = playCallback,
              currentMultiplier = scheduleMultiplier;
        _stopLoopInternal(false);
        isLooping = false;
        playCallback = null;
        if (callback) {
            loopStartTime = audioContext.currentTime + LOOP_START_DELAY_S;
            scheduledSubBeatCounter = 0;
            scheduleMultiplier = currentMultiplier;
            console.log(`TimingManager: Restarting loop with new tempo ${bpm}. Start time: ${loopStartTime.toFixed(4)}, Multiplier: ${scheduleMultiplier}`);
            startLoop(callback);
        } else {
            console.error("TimingManager: Cannot restart loop after tempo change - callback missing.");
            _stopLoopInternal(true);
        }
    }
}

export function setPitch(rate) {
    if (typeof rate === 'number' && rate > 0) currentPitch = rate;
    else console.warn(`TimingManager: Invalid pitch value: ${rate}`);
}

export const getLoopingState = () => isLooping;
export const getCurrentTempo   = () => currentTempo;
export const getCurrentPitch   = () => currentPitch;

// --- END OF FILE timingManagement.js ---
