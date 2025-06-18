// js/sequenceSerializer.js

export const SERIALIZATION_VERSION = "1.1";
export const DEFAULT_NUM_STEPS = 64; // Based on common sequencer patterns

export const DEFAULT_PROJECT_SETTINGS = {
    bpm: 120,
    // projectName is usually set explicitly by user or from filename
};

export const DEFAULT_CHANNEL_SETTINGS = {
    // name: "Channel X" // Name is always present and unique per sequence
    src: null,
    // steps: [], // Special handling: converted to array of indices or omitted
    volume: 0.8,
    mute: false,
    solo: false,
    pitch: 0,
    reverse: false,
    trimStart: 0,
    trimEnd: 1.0, // Default to full sample length
    hpfCutoff: 20,
    hpfQ: 0.707,
    lpfCutoff: 20000,
    lpfQ: 0.707,
    eqLowGain: 0,
    eqMidGain: 0,
    eqHighGain: 0,
    fadeInTime: 0,
    fadeOutTime: 0,
};

// Properties that are runtime state and should be stripped before serialization
const RUNTIME_PROJECT_PROPERTIES_TO_STRIP = ['playing', 'currentStep'];
const RUNTIME_CHANNEL_PROPERTIES_TO_STRIP = [
    'activePlaybackScheduledTime',
    'activePlaybackDuration',
    'activePlaybackTrimStart', // These will be re-initialized from trimStart/End on load
    'activePlaybackTrimEnd',
    'activePlaybackReversed',
    'imageData', // Explicitly list common large, non-serializable data
];

// Helper to create a clean copy for serialization, stripping runtime/large fields
function prepareObjectForSerialization(obj, fieldsToStrip) {
    if (Array.isArray(obj)) {
        return obj.map(item => prepareObjectForSerialization(item, fieldsToStrip));
    }
    if (obj && typeof obj === 'object') {
        const out = {};
        for (const [k, v] of Object.entries(obj)) {
            if (fieldsToStrip.includes(k)) continue;
            // Also strip any remaining data URIs not caught by a more general pre-filter
            if (typeof v === 'string' && v.startsWith('data:')) continue;
            out[k] = prepareObjectForSerialization(v, fieldsToStrip); // Recurse
        }
        return out;
    }
    return obj;
}

export function serializeSequence(fullSequenceData) {
    // Expects fullSequenceData to be the live sequence data (or a fresh copy).
    // This function will create cleaned copies internally.

    const projectDataToSerialize = prepareObjectForSerialization(fullSequenceData, RUNTIME_PROJECT_PROPERTIES_TO_STRIP);

    const serialized = {
        serializationVersion: SERIALIZATION_VERSION,
    };

    // 1. Handle top-level project properties
    for (const key in projectDataToSerialize) {
        if (key === 'channels') continue; // Handle channels separately

        // Include if not default, or if it's a critical key like projectName or bpm
        if (DEFAULT_PROJECT_SETTINGS.hasOwnProperty(key)) {
            if (projectDataToSerialize[key] !== DEFAULT_PROJECT_SETTINGS[key] || key === 'bpm' || key === 'projectName') {
                serialized[key] = projectDataToSerialize[key];
            }
        } else {
             // Property not in defaults, so always include it
            serialized[key] = projectDataToSerialize[key];
        }
    }
    // Ensure essential properties like bpm are present
    if (serialized.bpm === undefined && DEFAULT_PROJECT_SETTINGS.bpm !== undefined) {
        serialized.bpm = DEFAULT_PROJECT_SETTINGS.bpm;
    }
    if (serialized.projectName === undefined && fullSequenceData.projectName) {
         // Carry over original projectName if not stripped and not present
        serialized.projectName = fullSequenceData.projectName;
    }


    // 2. Handle channels
    serialized.channels = (fullSequenceData.channels || []).map(channel => {
        const sch = { name: channel.name }; // Name is always kept

        // Create a clean version of the channel for serialization
        const cleanChannel = prepareObjectForSerialization(channel, RUNTIME_CHANNEL_PROPERTIES_TO_STRIP);

        // 2a. Serialize 'steps': convert boolean array to array of true indices
        const trueStepIndices = [];
        if (Array.isArray(cleanChannel.steps)) {
            cleanChannel.steps.forEach((active, index) => {
                if (active) trueStepIndices.push(index);
            });
        }
        if (trueStepIndices.length > 0) {
            sch.steps = trueStepIndices;
        }
        // If trueStepIndices is empty, 'steps' property is omitted, implying no steps.

        // 2b. Handle other channel properties: omit if default
        for (const key in DEFAULT_CHANNEL_SETTINGS) {
            // Check against cleanChannel which has runtime props stripped but still has all other defined props
            if (cleanChannel.hasOwnProperty(key) && cleanChannel[key] !== DEFAULT_CHANNEL_SETTINGS[key]) {
                sch[key] = cleanChannel[key];
            }
        }
        
        // Special handling for 'src':
        // Save 'src' if it's not the default.
        // Also, if 'src' is null (even if null is default) AND there are active steps,
        // explicitly save 'src: null' to distinguish from a channel where 'src' is omitted entirely.
        if (cleanChannel.hasOwnProperty('src')) { // Check if 'src' was present on the input channel data
            if (cleanChannel.src !== DEFAULT_CHANNEL_SETTINGS.src) {
                sch.src = cleanChannel.src;
            } else if (cleanChannel.src === null && trueStepIndices.length > 0) {
                // If src is null (which is default) but there are steps, explicitly save src: null
                sch.src = null; 
            }
            // If cleanChannel.src is null (default) AND no trueStepIndices, 'src' property is omitted by the loop above.
        }
        // If 'src' was NOT on cleanChannel at all (e.g. from a very minimal input), it won't be added unless steps force it.

        return sch;
    });

    return serialized;
}

export function deserializeSequence(serializedData, numSteps = DEFAULT_NUM_STEPS) {
    const fileVersion = serializedData.serializationVersion;
    if (fileVersion && fileVersion !== SERIALIZATION_VERSION && fileVersion !== "1.0") { // Allow "1.0" as a possible older version before stricter checks
        console.warn(`Sequence version mismatch: file is ${fileVersion}, app supports ${SERIALIZATION_VERSION}. Attempting to load; some features may differ.`);
    }

    const deserialized = {};

    // 1. Handle top-level project properties: Start with defaults, then override with file data
    for (const key in DEFAULT_PROJECT_SETTINGS) {
        deserialized[key] = DEFAULT_PROJECT_SETTINGS[key]; // Start with default
    }
    // Then apply what's in the file, potentially overriding defaults
    for (const key in serializedData) {
        if (key === 'channels' || key === 'serializationVersion') continue; // Handle these separately
        deserialized[key] = serializedData[key];
    }
    // Ensure critical properties like projectName and bpm are sensible
    if (!deserialized.projectName && serializedData.projectName) { // If default didn't set it but file has it
        deserialized.projectName = serializedData.projectName;
    }
    if (!deserialized.bpm && serializedData.bpm) { // If default didn't set it but file has it
        deserialized.bpm = serializedData.bpm;
    }
    // If still no bpm, ensure the default is there.
    if (deserialized.bpm === undefined) deserialized.bpm = DEFAULT_PROJECT_SETTINGS.bpm;


    // Add runtime project properties (these are not expected in serializedData)
    deserialized.playing = false;
    deserialized.currentStep = 0;


    // 2. Handle channels
    const expectedChannelCount = 16; // Or get this from app config if dynamic
    deserialized.channels = [];

    const inputChannels = serializedData.channels || []; //Gracefully handle if 'channels' array is missing in file

    for (let i = 0; i < expectedChannelCount; i++) {
        const sChannel = inputChannels[i]; // Get serialized/raw channel data if it exists for this slot
        const dch = { ...DEFAULT_CHANNEL_SETTINGS }; // Start with all defaults for the new channel object

        if (sChannel) { // If there's data for this channel in the file (sChannel is not undefined)
            dch.name = sChannel.name || `Channel ${i + 1}`; // Use file name or generate default

            // Apply other properties from sChannel, overriding defaults
            for (const key in sChannel) {
                if (key === 'name' || key === 'steps') continue; // 'name' already handled, 'steps' handled next
                if (sChannel.hasOwnProperty(key)) { // Only consider own properties of sChannel
                    dch[key] = sChannel[key];
                }
            }
            
            // --- UPDATED STEPS DESERIALIZATION LOGIC ---
            dch.steps = new Array(numSteps).fill(false); // Initialize with all steps off
            if (Array.isArray(sChannel.steps) && sChannel.steps.length > 0) {
                if (typeof sChannel.steps[0] === 'boolean') {
                    // OLD RAW FORMAT DETECTED for steps (array of booleans)
                    // console.log(`Channel "${dch.name}": Detected old raw format for steps (booleans).`);
                    sChannel.steps.forEach((isActive, stepIndex) => {
                        if (stepIndex < numSteps) { // Ensure we don't go out of bounds of dch.steps
                            dch.steps[stepIndex] = !!isActive; // Coerce to boolean just in case
                        }
                    });
                    // If raw sChannel.steps array is shorter than numSteps, the rest of dch.steps remain false (correct).
                    // If raw sChannel.steps array is longer, extra steps in sChannel.steps are ignored (correct).
                } else if (typeof sChannel.steps[0] === 'number') {
                    // NEW SERIALIZED FORMAT DETECTED for steps (array of numeric indices)
                    // console.log(`Channel "${dch.name}": Detected new serialized format for steps (indices).`);
                    sChannel.steps.forEach(index => {
                        if (index >= 0 && index < numSteps) { // Check bounds for safety
                            dch.steps[index] = true;
                        }
                    });
                }
                // If sChannel.steps is an empty array [], dch.steps remains all false (correct).
            }
            // If sChannel.steps was omitted entirely (e.g. in new format with no active steps), 
            // dch.steps remains all false (correct).

        } else { // No data for this channel in file (e.g. file has fewer than expectedChannelCount channels)
                 // Create a default placeholder channel
            dch.name = `Channel ${i + 1}`;
            dch.steps = new Array(numSteps).fill(false);
        }

        // Initialize runtime channel properties
        dch.activePlaybackScheduledTime = null;
        dch.activePlaybackDuration = null;
        // Initialize active playback trim/reverse from the persisted/defaulted channel settings
        dch.activePlaybackTrimStart = dch.trimStart;
        dch.activePlaybackTrimEnd = dch.trimEnd;
        dch.activePlaybackReversed = dch.reverse;
        dch.imageData = null; // Ensure this is reset

        deserialized.channels.push(dch);
    }
    
    // If the input file had more channels than expectedChannelCount, 
    // this loop only processes up to expectedChannelCount, ignoring extras.
    // If it had fewer, default channels are padded up to expectedChannelCount.

    return deserialized;
}