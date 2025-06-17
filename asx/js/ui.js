/***********************************************************************
 * ui.js – Minimized & Modernized (with ReferenceError fix)
 ***********************************************************************/
import State from './state.js';
import { ctx } from './audioEngine.js';
import { renderWaveformToCanvas } from './waveformDisplay.js';
import { debounce } from './uiHelpers.js'; // Assuming uiHelpers.js exists and exports debounce
import { 
    wireChannel, 
    updateChannelUI, 
    previewPlayheads, 
    mainTransportPlayheadRatios, 
    channelZoomStates, 
    getChannelWaveformImage, 
    invalidateAllWaveformCaches,
    DEBUG_CACHE
} from './channelUI.js'; 

const container = document.getElementById('channels-container');
const template = document.getElementById('channel-template');
let projectNameInput = null;

// --- Helper: update all channel UIs ---
const updateAllChannels = (channels, prevChannels, currentGlobalStep, playActuallyDidChange, stepActuallyDidChange, fullPass = false) => {
  channels.forEach((ch, i) => {
    const el = container.children[i];
    if (el) {
      if (fullPass) { 
        updateChannelUI(el, ch, currentGlobalStep, i, true);
      } else if (playActuallyDidChange || stepActuallyDidChange) {
        updateChannelUI(el, ch, currentGlobalStep, i, false);
      }
    }
  });
};

// --- Global/project UI rendering ---
const renderGlobalUI = (s, ps) => {
  // Always check if input is defined
  if (projectNameInput && (!ps || s.projectName !== ps.projectName)) {
    projectNameInput.value = s.projectName;
    document.title = `${s.projectName} - Audional Sequencer`;
  }
  const bpmInput = document.getElementById('bpm-input');
  if (bpmInput && (!ps || s.bpm !== ps.bpm)) {
    bpmInput.value = s.bpm;
  }
  const playbackModeBtn = document.getElementById('playback-mode-btn'); // Get it each time or cache it in init
  if (playbackModeBtn && (!ps || s.playbackMode !== ps.playbackMode)) {
    playbackModeBtn.textContent = `Mode: ${s.playbackMode === 'continuous' ? 'Continuous' : 'Single'}`;
    // playbackModeBtn.classList.toggle('active-continuous-mode', s.playbackMode === 'continuous');
  }
};

// --- Main render logic ---
function render(s, ps) {
  // If init() hasn't run, projectNameInput may still be null. That's fine, we guard everywhere.
  renderGlobalUI(s, ps);
  const prevChannelsState = ps?.channels ?? [];
  const currentChannelsState = s.channels;

  const lengthDidChange = !ps || currentChannelsState.length !== prevChannelsState.length;
  const stepActuallyDidChange = !ps || s.currentStep !== ps.currentStep;
  const playActuallyDidChange = !ps || s.playing !== ps.playing;

  if (lengthDidChange) {
    invalidateAllWaveformCaches("Channel length changed");

    while (container.children.length > currentChannelsState.length) {
      const oldElement = container.lastChild;
      if (oldElement?.dataset.channelIndex) {
        const idx = +oldElement.dataset.channelIndex;
        previewPlayheads.delete(idx);
        mainTransportPlayheadRatios.delete(idx);
      }
      oldElement?.remove();
    }
    currentChannelsState.forEach((ch, i) => {
      let el = container.children[i];
      if (!el) {
        el = template.content.firstElementChild.cloneNode(true);
        el.dataset.channelIndex = String(i);
        container.append(el);
        wireChannel(el, i);
      }
      updateChannelUI(el, ch, s.currentStep, i, true);
    });
  } else {
    let anyChannelDataRequiresFullUpdate = false;
    currentChannelsState.forEach((currentCh, i) => {
      const prevCh = prevChannelsState[i];
      if (prevCh && currentCh !== prevCh) {
        let fullUpdateNeeded = false;
        for (const key in currentCh) {
          if (Object.prototype.hasOwnProperty.call(currentCh, key) && (!prevCh || currentCh[key] !== prevCh[key])) {
            const ignoredKeys = [
              'activePlaybackScheduledTime', 
              'activePlaybackDuration', 
              'activePlaybackTrimStart', 
              'activePlaybackTrimEnd', 
              'activePlaybackReversed'
            ];
            if (!ignoredKeys.includes(key)) {
              fullUpdateNeeded = true;
              if (DEBUG_CACHE) {
                if (key === 'buffer' || key === 'reversedBuffer') {
                  if (currentCh[key] !== prevCh[key]) {
                    console.log(`[UI Render Debug] Channel ${i} changed key "${key}" (buffer identity)`);
                  }
                } else if (key === 'steps') {
                  if (JSON.stringify(currentCh[key]) !== JSON.stringify(prevCh[key])) {
                    console.log(`[UI Render Debug] Channel ${i} changed key "steps"`);
                  }
                } else {
                  console.log(`[UI Render Debug] Channel ${i} changed key "${key}" from`, prevCh[key], 'to', currentCh[key]);
                }
              }
              break;
            }
          }
        }
        if (fullUpdateNeeded) anyChannelDataRequiresFullUpdate = true;
      }
    });

    if (anyChannelDataRequiresFullUpdate) {
      if (DEBUG_CACHE) console.log("[UI Render] Full update triggered");
      updateAllChannels(currentChannelsState, prevChannelsState, s.currentStep, playActuallyDidChange, stepActuallyDidChange, true);
    } else if (stepActuallyDidChange || playActuallyDidChange) {
      if (DEBUG_CACHE) console.log("[UI Render] Light update triggered");
      updateAllChannels(currentChannelsState, prevChannelsState, s.currentStep, playActuallyDidChange, stepActuallyDidChange, false);
    }
  }
}

// --- Animate transport playheads/waveforms ---
function animateTransport() {
  const { playing, channels } = State.get();
  const now = ctx.currentTime;

  channels.forEach((ch, idx) => {
    const el = container.children[idx];
    const canvas = el?.querySelector('.waveform');

    if (!canvas || canvas.clientWidth === 0 || canvas.clientHeight === 0) {
      mainTransportPlayheadRatios.delete(idx);
      return;
    }

    let currentPlayheadBufferRatio = null;
    if (playing && ch.activePlaybackScheduledTime != null && ch.activePlaybackDuration > 0) {
      const elapsed = now - ch.activePlaybackScheduledTime;
      const progress = elapsed / ch.activePlaybackDuration;

      if (progress >= 0 && progress < 1) {
        const trimStart = ch.activePlaybackTrimStart ?? ch.trimStart ?? 0;
        const trimEnd = ch.activePlaybackTrimEnd ?? ch.trimEnd ?? 1;
        const trimmedDuration = trimEnd - trimStart;

        if (trimmedDuration > 0) {
          if (ch.activePlaybackReversed) {
            currentPlayheadBufferRatio = trimEnd - (progress * trimmedDuration);
          } else {
            currentPlayheadBufferRatio = trimStart + (progress * trimmedDuration);
          }
          currentPlayheadBufferRatio = Math.max(0, Math.min(1, currentPlayheadBufferRatio));
        }
      }
    }

    const prevRatio = mainTransportPlayheadRatios.get(idx);
    const movedSignificantly = currentPlayheadBufferRatio == null
      ? prevRatio != null
      : prevRatio == null || Math.abs((prevRatio || 0) - currentPlayheadBufferRatio) > 0.0001;

    if (movedSignificantly) {
      if (currentPlayheadBufferRatio == null) {
        mainTransportPlayheadRatios.delete(idx);
      } else {
        mainTransportPlayheadRatios.set(idx, currentPlayheadBufferRatio);
      }

      const cachedImage = getChannelWaveformImage(idx, ch, canvas);
      renderWaveformToCanvas(canvas, ch.buffer, ch.trimStart, ch.trimEnd, {
        cachedWaveformImage: cachedImage,
        mainPlayheadRatio: currentPlayheadBufferRatio,
        previewPlayheadRatio: previewPlayheads.get(idx),
        fadeInTime: ch.fadeInTime,
        fadeOutTime: ch.fadeOutTime,
        zoomTrim: !!channelZoomStates[idx]
      });
    }
  });

  requestAnimationFrame(animateTransport);
}

// --- Entry point ---
export function init() {
  projectNameInput = document.getElementById('project-name-input');
  if (projectNameInput) {
    projectNameInput.addEventListener('input',
      debounce(e => State.update({ projectName: e.target.value || "Untitled Audional Composition" }), 300));
  }

  State.subscribe(render, { defer: true });
  render(State.get(), null);

  requestAnimationFrame(animateTransport);

  const loadButton = document.getElementById('load-btn');
  const loadInput = document.getElementById('load-input');
  if (loadButton && loadInput) {
    loadButton.addEventListener('click', () => loadInput.click());
  }
}
