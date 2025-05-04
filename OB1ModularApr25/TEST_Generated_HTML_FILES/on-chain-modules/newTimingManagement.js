const SCHEDULER_INTERVAL_MS = 25, SCHEDULE_AHEAD_TIME_S = 0.1, LOOP_START_DELAY_S = 0.05;

let audioContext = null, currentTempo, currentPitch, isLooping = false, schedulerTimeoutId = null, scheduleMultiplier = 1, playCallback = null;
let loopStartTime = 0.0, scheduledSubBeatCounter = 0;

function _calculateSubBeatDuration(bpm, multiplier) {
    if (bpm <= 0 || multiplier <= 0) return 0;
    return (60.0 / bpm) / multiplier;
}

function _scheduleLoopIterations() {
    if (!isLooping || !audioContext) return;

    const currentTime = audioContext.currentTime, scheduleUntil = currentTime + SCHEDULE_AHEAD_TIME_S;
    const subBeatDuration = _calculateSubBeatDuration(currentTempo, scheduleMultiplier);

    if (subBeatDuration <= 0) {
        console.error("Invalid subBeatDuration. Stopping loop.");
        stopLoop();
        return;
    }

    while (true) {
        const targetTimeForNextSubBeat = loopStartTime + (scheduledSubBeatCounter * subBeatDuration);
        if (targetTimeForNextSubBeat >= scheduleUntil) break;

        if (playCallback) playCallback(targetTimeForNextSubBeat);
        else {
            console.error("playCallback is missing. Stopping loop.");
            stopLoop();
            return;
        }

        scheduledSubBeatCounter++;
    }

    schedulerTimeoutId = setTimeout(_scheduleLoopIterations, SCHEDULER_INTERVAL_MS);
}

export function getCurrentScheduleMultiplier() {
    return scheduleMultiplier;
}

export function setScheduleMultiplier(multiplier) {
    const newMultiplier = parseInt(multiplier, 10);
    if (!Number.isInteger(newMultiplier) || newMultiplier < 1) return console.warn(`Invalid schedule multiplier: ${multiplier}`);

    if (scheduleMultiplier === newMultiplier) return;

    scheduleMultiplier = newMultiplier;
    if (isLooping && audioContext && currentTempo > 0) {
        const changeTime = audioContext.currentTime, elapsedTimeSinceLoopStart = Math.max(0, changeTime - loopStartTime);
        const newSubBeatDuration = _calculateSubBeatDuration(currentTempo, scheduleMultiplier);

        if (newSubBeatDuration > 0) {
            const expectedCounterAtChangeTime = Math.floor(elapsedTimeSinceLoopStart / newSubBeatDuration);
            scheduledSubBeatCounter = expectedCounterAtChangeTime;
        } else {
            console.warn("New sub-beat duration is invalid.");
        }
    }
}

function _stopLoopInternal(resetState = true) {
    if (schedulerTimeoutId) clearTimeout(schedulerTimeoutId);
    schedulerTimeoutId = null;
    if (resetState) loopStartTime = scheduledSubBeatCounter = 0;
}

export function getLoopStartTime() {
    return loopStartTime;
}

export function init(context, initialTempo, initialPitch) {
    if (!(context instanceof AudioContext)) throw new Error("Invalid AudioContext provided.");
    audioContext = context;
    currentTempo = initialTempo;
    currentPitch = initialPitch;
    isLooping = false;
    playCallback = null;
    scheduleMultiplier = 1;
    _stopLoopInternal(true);
    console.log(`TimingManager initialized. Tempo: ${currentTempo}, Pitch: ${currentPitch}`);
}

export function startLoop(soundPlaybackCallback) {
    if (isLooping || !audioContext) {
        console.warn("Loop already active or audio context unavailable.");
        return;
    }
    if (typeof soundPlaybackCallback !== 'function') {
        console.error("startLoop requires a valid soundPlaybackCallback.");
        return;
    }

    isLooping = true;
    playCallback = soundPlaybackCallback;
    loopStartTime = audioContext.currentTime + LOOP_START_DELAY_S;
    scheduledSubBeatCounter = 0;

    console.log(`Loop start time: ${loopStartTime.toFixed(4)}, Multiplier: ${scheduleMultiplier}`);
    _scheduleLoopIterations();
}

export function stopLoop() {
    if (!isLooping) return;

    console.log("Stopping loop.");
    isLooping = false;
    playCallback = null;
    _stopLoopInternal(true);
}

export function setTempo(bpm) {
    if (typeof bpm !== 'number' || bpm <= 0) return console.warn(`Invalid tempo: ${bpm}`);
    const oldTempo = currentTempo;
    currentTempo = bpm;

    if (isLooping && currentTempo !== oldTempo) {
        console.log(`Tempo changed to ${currentTempo}. Restarting loop.`);
        const callback = playCallback, currentMultiplierState = scheduleMultiplier;
        _stopLoopInternal(false);

        isLooping = false;
        playCallback = null;

        if (callback) {
            loopStartTime = audioContext.currentTime + LOOP_START_DELAY_S;
            scheduledSubBeatCounter = 0;
            scheduleMultiplier = currentMultiplierState;

            startLoop(callback);
        } else {
            console.error("Cannot restart loop after tempo change.");
            _stopLoopInternal(true);
        }
    }
}

export function setPitch(rate) {
    if (typeof rate === 'number' && rate > 0) currentPitch = rate;
    else console.warn(`Invalid pitch: ${rate}`);
}

export function getLoopingState() { return isLooping; }
export function getCurrentTempo() { return currentTempo; }
export function getCurrentPitch() { return currentPitch; }
