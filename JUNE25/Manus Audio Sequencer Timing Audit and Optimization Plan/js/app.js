// js/app.js

import State from './state.js';
import * as UI from './ui.js';
import { start, stop } from './audioEngine.js';
import { loadSample, resolveOrdinalURL } from './utils.js';

const makeChannel = i => ({
  name: `Channel ${i + 1}`,
  steps: Array(64).fill(false),
  buffer: null,
  reversedBuffer: null,
  src: null,
  volume: 0.8,
  mute: false,
  solo: false,
  pitch: 0,
  reverse: false,
  trimStart: 0,
  trimEnd: 1,
  hpfCutoff: 20,
  hpfQ: 0.707,
  lpfCutoff: 20000,
  lpfQ: 0.707,
  eqLowGain: 0,
  eqMidGain: 0,
  eqHighGain: 0,
  fadeInTime: 0,
  fadeOutTime: 0,
  activePlaybackScheduledTime: null,
  activePlaybackDuration: null,
  activePlaybackTrimStart: null,
  activePlaybackTrimEnd: null,
  activePlaybackReversed: false,
});

// ---------- INIT ----------
UI.init(); // This will also set up project name input from State's default
for (let i = 0; i < 16; i++) State.addChannel(makeChannel(i)); 

// ---------- UI EVENTS ----------
document.getElementById('add-channel-btn').addEventListener('click', () => {
  State.addChannel(makeChannel(State.get().channels.length));
});
document.getElementById('play-btn').addEventListener('click', start);
document.getElementById('stop-btn').addEventListener('click', stop);

document.getElementById('bpm-input').addEventListener('input', e => {
  const rawValue = e.target.value;
  let v = parseInt(rawValue, 10);
  if (isNaN(v) && rawValue !== "") {
    v = State.get().bpm;
  } else if (isNaN(v) && rawValue === "") {
    return;
  } else {
    v = Math.min(Math.max(v, 1), 420);
  }
  e.target.value = v;
  State.update({ bpm: v });
});
document.getElementById('bpm-input').addEventListener('blur', e => {
    if (e.target.value === "") {
        const currentBPM = State.get().bpm;
        e.target.value = currentBPM;
        State.update({ bpm: currentBPM }); // Ensure state is updated if blurred while empty
    }
});

// ---------- SAVE ----------
// Helper to sanitize project name for filename
function sanitizeFilename(name) {
  return name.replace(/[^a-z0-9\-_\.]/gi, '_').replace(/_{2,}/g, '_');
}

document.getElementById('save-btn').addEventListener('click', () => {
  const currentProjectName = State.get().projectName;
  const filename = sanitizeFilename(currentProjectName || "Audional-Project") + ".json";

  const snapshot = { ...State.get() };
  snapshot.channels = snapshot.channels.map(ch => {
    const { buffer, reversedBuffer, ...rest } = ch;
    return rest;
  });
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
});

/* ---------- LOAD project ---------- */
document.getElementById('load-input').addEventListener('change', async e => {
  const f = e.target.files[0];
  if (!f) return;
  const fileInput = e.target;

  try {
    const projectData = JSON.parse(await f.text());
    
    const loadedProjectName = projectData.projectName || `Loaded Project ${new Date().toISOString().slice(0,10)}`;

    const sanitizedGlobalState = {
      projectName: loadedProjectName,
      bpm: projectData.bpm || 120,
      playing: false, 
      currentStep: 0,
      channels: []
    };

    if (Array.isArray(projectData.channels)) {
      sanitizedGlobalState.channels = projectData.channels.map((loadedCh, i) => {
        const defaultCh = makeChannel(i);
        return {
          ...defaultCh,
          ...loadedCh,
          buffer: null,
          reversedBuffer: null,
          name: loadedCh.name || defaultCh.name,
          steps: loadedCh.steps || defaultCh.steps,
          src: loadedCh.src || defaultCh.src, // Keep original src from file
          volume: loadedCh.volume ?? defaultCh.volume,
          mute: loadedCh.mute ?? defaultCh.mute,
          solo: loadedCh.solo ?? defaultCh.solo,
          pitch: loadedCh.pitch ?? defaultCh.pitch,
          reverse: loadedCh.reverse ?? defaultCh.reverse,
          trimStart: loadedCh.trimStart ?? defaultCh.trimStart,
          trimEnd: loadedCh.trimEnd ?? defaultCh.trimEnd,
          hpfCutoff: loadedCh.hpfCutoff ?? defaultCh.hpfCutoff,
          hpfQ: loadedCh.hpfQ ?? defaultCh.hpfQ,
          lpfCutoff: loadedCh.lpfCutoff ?? defaultCh.lpfCutoff,
          lpfQ: loadedCh.lpfQ ?? defaultCh.lpfQ,
          eqLowGain: loadedCh.eqLowGain ?? defaultCh.eqLowGain,
          eqMidGain: loadedCh.eqMidGain ?? defaultCh.eqMidGain,
          eqHighGain: loadedCh.eqHighGain ?? defaultCh.eqHighGain,
          fadeInTime: loadedCh.fadeInTime ?? defaultCh.fadeInTime,
          fadeOutTime: loadedCh.fadeOutTime ?? defaultCh.fadeOutTime,
          activePlaybackScheduledTime: null, // Always reset playback state
          activePlaybackDuration: null,
          activePlaybackTrimStart: null,
          activePlaybackTrimEnd: null,
          activePlaybackReversed: false,
        };
      });
    }
    
    stop(); 
    State.update(sanitizedGlobalState); // This will trigger UI update for project name

    // Loop to load samples for each channel
    for (let i = 0; i < sanitizedGlobalState.channels.length; i++) {
      const ch = sanitizedGlobalState.channels[i];
      const originalSrcFromFile = ch.src;

      if (originalSrcFromFile && typeof originalSrcFromFile === 'string') {
          // Use resolveOrdinalURL from utils.js
          const resolvedUrl = resolveOrdinalURL(originalSrcFromFile); // <--- KEY CHANGE HERE

          // The original resolveOrdinalURL returns the original string if it can't resolve it
          // as an Ordinal URL, which is fine for fetch. We just need to ensure it's not null/empty.
          if (resolvedUrl && resolvedUrl.trim() !== "") {
              try {
                  console.log(`[Project Load] Attempting to load sample for channel ${i} from resolved URL: ${resolvedUrl} (Original: ${originalSrcFromFile})`);
                  // Pass the resolvedUrl to loadSample
                  const { buffer, imageData } = await loadSample(resolvedUrl); // <--- PASS RESOLVED URL

                  if (!buffer) {
                       console.warn(`[Project Load] loadSample returned no buffer for channel ${i} (${resolvedUrl})`);
                       State.updateChannel(i, { buffer: null, reversedBuffer: null, src: originalSrcFromFile });
                       continue; 
                  }

                  // Store originalSrcFromFile in state so saving the project preserves the ID if it was an ID
                  const updatePayload = { buffer, src: originalSrcFromFile };
                  if (imageData) updatePayload.imageData = imageData; // If you store imageData in channel state

                  if (ch.reverse && buffer) {
                      const rBuf = await createReversedBuffer(buffer);
                      updatePayload.reversedBuffer = rBuf;
                  }
                  State.updateChannel(i, updatePayload);
              } catch (err) {
                  console.warn(`Failed to reload sample for channel ${i} (Resolved URL: ${resolvedUrl}, Original: ${originalSrcFromFile}):`, err);
                  State.updateChannel(i, { buffer: null, reversedBuffer: null, src: originalSrcFromFile });
              }
          } else {
              console.warn(`[Project Load] Could not form a loadable URL for channel ${i}. Original src: "${originalSrcFromFile}"`);
              State.updateChannel(i, { buffer: null, reversedBuffer: null, src: originalSrcFromFile });
          }
      } else if (originalSrcFromFile) {
           console.warn(`[Project Load] Channel ${i} has a non-string or empty src:`, originalSrcFromFile);
           State.updateChannel(i, { buffer: null, reversedBuffer: null, src: originalSrcFromFile });
      } else {
           State.updateChannel(i, { buffer: null, reversedBuffer: null, src: null });
      }
  }
  console.log("Project loaded.");

} catch(err) {
  alert('Invalid project file or error during loading.');
  console.error("Error loading project:", err);
} finally {
  fileInput.value = "";
}
});

export async function createReversedBuffer(audioBuffer) {
    if (!audioBuffer) return null;
    const numChannels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length;
    const sampleRate = audioBuffer.sampleRate;
    
    // Use OfflineAudioContext for operations that don't need real-time playback
    // This is more robust than trying to create a buffer directly in the main AudioContext
    // if we were to do any node-based processing on it before reversing.
    // For simple data reversal, creating a new AudioBuffer directly is also an option.
    // However, using OfflineAudioContext keeps a consistent pattern if you later add processing.

    // Simplified direct buffer creation for reversal as no nodes are involved:
    const newReversedBuffer = new AudioBuffer({
        numberOfChannels: numChannels,
        length: length,
        sampleRate: sampleRate
    });

    for (let channel = 0; channel < numChannels; channel++) {
        const inputData = audioBuffer.getChannelData(channel);
        const outputData = newReversedBuffer.getChannelData(channel);
        for (let i = 0; i < length; i++) {
            outputData[i] = inputData[length - 1 - i];
        }
    }
    return newReversedBuffer;
}