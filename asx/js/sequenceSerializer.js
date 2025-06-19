// js/sequenceSerializer.js

export const SERIALIZATION_FORMAT_VERSION = "2.0";
export const DEFAULT_NUM_STEPS = 64;

// Define the absolute default state for a project and a channel.
// This is the single source of truth for what "default" means.
export const DEFAULT_PROJECT_SETTINGS = {
    projectName: "Audional Sequencer Project",
    bpm: 120.00,
};

export const DEFAULT_CHANNEL_SETTINGS = {
    // name: 'Channel X' // Name is always present
    src: null,
    steps: new Array(DEFAULT_NUM_STEPS).fill(false),
    volume: 0.8,
    mute: false,
    solo: false,
    pitch: 0,
    reverse: false,
    trimStart: 0,
    trimEnd: 1.0,
    fadeInTime: 0,
    fadeOutTime: 0,
    hpfCutoff: 20,
    hpfQ: 0.707,
    lpfCutoff: 20000,
    lpfQ: 0.707,
    eqLowGain: 0,
    eqMidGain: 0,
    eqHighGain: 0,
};

/**
 * Converts a 64-element boolean array for steps into a compact Base64 string.
 * @param {boolean[]} stepsArray - The array of 64 booleans.
 * @returns {string} A 12-character Base64 string.
 */
function stepsToB64(stepsArray) {
    if (!stepsArray || stepsArray.length !== 64) return '';
    const bytes = new Uint8Array(8);
    for (let i = 0; i < 8; i++) {
        let byte = 0;
        for (let j = 0; j < 8; j++) {
            if (stepsArray[i * 8 + j]) {
                byte |= (1 << j);
            }
        }
        bytes[i] = byte;
    }
    const binaryString = Array.from(bytes, byte => String.fromCharCode(byte)).join('');
    return btoa(binaryString);
}

/**
 * Converts a Base64 string back into a 64-element boolean array.
 * @param {string} b64String - The Base64 encoded step data.
 * @returns {boolean[]} The array of 64 booleans.
 */
function b64ToSteps(b64String) {
    const stepsArray = new Array(DEFAULT_NUM_STEPS).fill(false);
    if (!b64String) return stepsArray;
    try {
        const binaryString = atob(b64String);
        if (binaryString.length !== 8) return stepsArray; // Basic validation
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        for (let i = 0; i < 8; i++) {
            const byte = bytes[i];
            for (let j = 0; j < 8; j++) {
                if ((byte >> j) & 1) {
                    stepsArray[i * 8 + j] = true;
                }
            }
        }
    } catch (e) {
        console.error("Failed to decode Base64 steps:", e);
    }
    return stepsArray;
}

/**
 * Checks if a channel is empty (no source and no steps).
 * @param {object} channel - The channel object to check.
 * @returns {boolean} True if the channel is considered empty.
 */
function isChannelEmpty(channel) {
    const hasSteps = channel.steps && channel.steps.some(s => s === true);
    return !channel.src && !hasSteps;
}


/**
 * Serializes the full project state into an optimized JSON object.
 * @param {object} fullSequenceData - The complete state object from the application.
 * @returns {object} A compact, serializable JavaScript object.
 */
export function serializeSequence(fullSequenceData) {
    const serialized = {
        meta: {
            appName: "AudionalSequencer",
            version: SERIALIZATION_FORMAT_VERSION,
            createdAt: new Date().toISOString()
        }
    };

    if (fullSequenceData.projectName && fullSequenceData.projectName !== DEFAULT_PROJECT_SETTINGS.projectName) {
        serialized.projectName = fullSequenceData.projectName;
    }
    if (fullSequenceData.bpm && parseFloat(fullSequenceData.bpm) !== DEFAULT_PROJECT_SETTINGS.bpm) {
        serialized.bpm = parseFloat(fullSequenceData.bpm);
    }

    serialized.channels = [];

    (fullSequenceData.channels || []).forEach((channel, index) => {
        if (isChannelEmpty(channel)) return;

        const sch = { i: index };

        const hasSteps = channel.steps && channel.steps.some(s => s === true);
        if (hasSteps) {
            sch.s = stepsToB64(channel.steps); // 's' for steps
        }

        const keyMap = { name: 'n', volume: 'v', pitch: 'p', reverse: 'r', mute: 'm', solo: 'o', src: 'src', trimStart: 'ts', trimEnd: 'te', fadeInTime: 'fi', fadeOutTime: 'fo', hpfCutoff: 'hpf', lpfCutoff: 'lpf', eqLowGain: 'eql', eqMidGain: 'eqm', eqHighGain: 'eqh' };

        for (const key in DEFAULT_CHANNEL_SETTINGS) {
            if (key === 'steps') continue;
            if (channel.hasOwnProperty(key) && channel[key] !== DEFAULT_CHANNEL_SETTINGS[key]) {
                const shortKey = keyMap[key] || key;
                sch[shortKey] = channel[key];
            }
        }
        if (channel.src) {
            sch.src = channel.src;
        }

        serialized.channels.push(sch);
    });

    return serialized;
}

/**
 * Deserializes a project object (new or legacy) back into the full application state.
 * @param {object} serializedData - The object loaded from a file.
 * @returns {object} The full project state, ready for the application.
 */
export function deserializeSequence(serializedData, numSteps = DEFAULT_NUM_STEPS) {
    const isNewFormat = !!serializedData.meta;
    const fileVersion = serializedData.meta?.version;

    if (isNewFormat && fileVersion !== SERIALIZATION_FORMAT_VERSION) {
        console.warn(`File version mismatch: file is v${fileVersion}, app supports v${SERIALIZATION_FORMAT_VERSION}.`);
    }

    const deserialized = { ...DEFAULT_PROJECT_SETTINGS };
    
    if (serializedData.projectName) deserialized.projectName = serializedData.projectName;
    if (serializedData.bpm) deserialized.bpm = serializedData.bpm;

    deserialized.playing = false;
    deserialized.currentStep = 0;
    deserialized.channels = [];
    
    for (let i = 0; i < 16; i++) {
        const newChannel = { ...DEFAULT_CHANNEL_SETTINGS, name: `Channel ${i + 1}` };
        newChannel.steps = new Array(numSteps).fill(false);
        deserialized.channels.push(newChannel);
    }
    
    (serializedData.channels || []).forEach(sChannel => {
        const index = isNewFormat ? sChannel.i : serializedData.channels.indexOf(sChannel);
        if (index === undefined || index < 0 || index >= 16) return;

        const targetChannel = deserialized.channels[index];
        const keyMap = { n: 'name', v: 'volume', p: 'pitch', r: 'reverse', m: 'mute', o: 'solo', ts: 'trimStart', te: 'trimEnd', fi: 'fadeInTime', fo: 'fadeOutTime', hpf: 'hpfCutoff', lpf: 'lpfCutoff', eql: 'eqLowGain', eqm: 'eqMidGain', eqh: 'eqHighGain' };

        for(const shortKey in keyMap) {
            if(sChannel[shortKey] !== undefined) targetChannel[keyMap[shortKey]] = sChannel[shortKey];
        }
        for(const key in sChannel) {
            if(targetChannel[key] === undefined && DEFAULT_CHANNEL_SETTINGS[key] !== undefined) {
                 targetChannel[key] = sChannel[key];
            }
        }
        if (sChannel.src) targetChannel.src = sChannel.src;
        if (sChannel.name) targetChannel.name = sChannel.name;
        if (sChannel.n) targetChannel.name = sChannel.n;

        if (sChannel.s) {
            targetChannel.steps = b64ToSteps(sChannel.s);
        } else if (Array.isArray(sChannel.steps)) {
            if(sChannel.steps.length > 0 && typeof sChannel.steps[0] === 'number') {
                sChannel.steps.forEach(i => { if (i >= 0 && i < numSteps) targetChannel.steps[i] = true; });
            } else {
                sChannel.steps.forEach((isActive, i) => { if (i < numSteps) targetChannel.steps[i] = !!isActive; });
            }
        }
    });

    return deserialized;
}