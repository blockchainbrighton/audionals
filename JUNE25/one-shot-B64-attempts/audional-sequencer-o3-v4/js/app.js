// js/app.js

import State from './state.js';
import * as UI from './ui.js';
import { start, stop } from './audioEngine.js';
import { loadSample } from './utils.js';

const makeChannel = i => ({
  name: `Channel ${i + 1}`,
  steps: Array(64).fill(false),
  buffer: null,         // Original AudioBuffer
  reversedBuffer: null, // Reversed AudioBuffer (created on demand)
  src: null,            // URL or Ordinal ID of the sample
  volume: 0.8,          // Main channel volume
  mute: false,
  solo: false,
  pitch: 0,             // Pitch shift in semitones (0 is original)
  reverse: false,       // Play sample in reverse
  trimStart: 0,         // 0.0 to 1.0 (relative to forward buffer)
  trimEnd: 1,           // 0.0 to 1.0 (relative to forward buffer)

  // Audio Effect Parameters
  hpfCutoff: 20,
  hpfQ: 0.707,
  lpfCutoff: 20000,
  lpfQ: 0.707,
  
  eqLowGain: 0,
  eqMidGain: 0,
  eqHighGain: 0,

  fadeInTime: 0,
  fadeOutTime: 0,

  // Playback state for UI (waveform playhead)
  activePlaybackScheduledTime: null,
  activePlaybackDuration: null,
  activePlaybackTrimStart: null, // Store the trim used at playback time
  activePlaybackTrimEnd: null,   // Store the trim used at playback time
  activePlaybackReversed: false, // Store if playback was reversed for playhead direction
});

// ---------- INIT ----------
UI.init();
for (let i = 0; i < 4; i++) State.addChannel(makeChannel(i)); 

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
    }
});

// ---------- SAVE ----------
document.getElementById('save-btn').addEventListener('click', () => {
  const snapshot = { ...State.get() };
  snapshot.channels = snapshot.channels.map(ch => {
    const { buffer, reversedBuffer, ...rest } = ch; // Exclude buffers
    return rest;
  });
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `audional-project-${new Date().toISOString().slice(0,10)}.json`;
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
    const sanitizedGlobalState = {
      bpm: projectData.bpm || 120,
      playing: false, 
      currentStep: 0,
      channels: []
    };

    if (Array.isArray(projectData.channels)) {
      sanitizedGlobalState.channels = projectData.channels.map((loadedCh, i) => {
        const defaultCh = makeChannel(i);
        return {
          ...defaultCh, // Start with defaults to ensure all new props exist
          ...loadedCh,  // Override with loaded data
          buffer: null, // Always clear buffers on load
          reversedBuffer: null,
          // Ensure all FX and playback props are reset or correctly defaulted
          pitch: loadedCh.pitch ?? defaultCh.pitch,
          reverse: loadedCh.reverse ?? defaultCh.reverse,
          hpfCutoff: loadedCh.hpfCutoff ?? defaultCh.hpfCutoff,
          hpfQ: loadedCh.hpfQ ?? defaultCh.hpfQ,
          lpfCutoff: loadedCh.lpfCutoff ?? defaultCh.lpfCutoff,
          lpfQ: loadedCh.lpfQ ?? defaultCh.lpfQ,
          eqLowGain: loadedCh.eqLowGain ?? defaultCh.eqLowGain,
          eqMidGain: loadedCh.eqMidGain ?? defaultCh.eqMidGain,
          eqHighGain: loadedCh.eqHighGain ?? defaultCh.eqHighGain,
          fadeInTime: loadedCh.fadeInTime ?? defaultCh.fadeInTime,
          fadeOutTime: loadedCh.fadeOutTime ?? defaultCh.fadeOutTime,
          activePlaybackScheduledTime: null,
          activePlaybackDuration: null,
          activePlaybackTrimStart: null,
          activePlaybackTrimEnd: null,
          activePlaybackReversed: null,
        };
      });
    }
    
    stop(); 
    State.update(sanitizedGlobalState);

    // Sequentially load samples to avoid overwhelming the browser/network
    for (let i = 0; i < sanitizedGlobalState.channels.length; i++) {
        const ch = sanitizedGlobalState.channels[i];
        if (ch.src && typeof ch.src === 'string') {
            try {
                const { buffer } = await loadSample(ch.src);
                const updatePayload = { buffer };
                // If reverse was true in the project, create reversed buffer now
                if (ch.reverse && buffer) {
                    const rBuf = await createReversedBuffer(buffer); // Assume this helper exists
                    updatePayload.reversedBuffer = rBuf;
                }
                State.updateChannel(i, updatePayload);
            } catch (err) {
                console.warn(`Failed to reload sample for channel ${i} (${ch.src}):`, err);
            }
        }
    }
    console.log("Project loaded and samples reloaded (if any).");

  } catch(err) {
    alert('Invalid project file or error during loading.');
    console.error("Error loading project:", err);
  } finally {
    fileInput.value = "";
  }
});

// Helper function to create a reversed AudioBuffer
// This should ideally be in utils.js or audioEngine.js if it needs access to ctx
export async function createReversedBuffer(audioBuffer) {
    if (!audioBuffer) return null;
    const numChannels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length;
    const sampleRate = audioBuffer.sampleRate;

    // It's good practice to use an OfflineAudioContext for manipulation
    // if the main AudioContext (ctx) is not readily available or for cleaner separation.
    // However, for simplicity, if ctx is global and accessible, we can use it.
    // If ctx isn't directly available here, pass it as an argument or use OfflineAudioContext.
    const reversedCtx = new OfflineAudioContext(numChannels, length, sampleRate);
    const newBuffer = reversedCtx.createBuffer(numChannels, length, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
        const inputData = audioBuffer.getChannelData(channel);
        const outputData = newBuffer.getChannelData(channel);
        for (let i = 0; i < length; i++) {
            outputData[i] = inputData[length - 1 - i];
        }
    }
    return newBuffer; // In a real OfflineAudioContext scenario, you'd .startRendering().then(buffer => ...)
                      // but since we are manually creating the buffer data, this is fine.
                      // For future: use OfflineAudioContext.startRendering() if processing through nodes.
}