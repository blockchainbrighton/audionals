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
    DEBUG_CACHE // Import DEBUG_CACHE to use it for conditional logging
    // visibleChannelIndices // Will be imported if IntersectionObserver is implemented
} from './channelUI.js'; 

const container = document.getElementById('channels-container');
const template = document.getElementById('channel-template');
let projectNameInput = null;

// --- Helper: update all channel UIs, full/partial as needed ---
// Added stepActuallyChanged boolean parameter
const updateAllChannels = (channels, prevChannels, currentGlobalStep, playActuallyDidChange, stepActuallyDidChange, fullPass = false) => {
  channels.forEach((ch, i) => {
    const el = container.children[i];
    if (el) { // Ensure element exists
        if (fullPass) { 
            updateChannelUI(el, ch, currentGlobalStep, i, true); // true for isFullRenderPass
        } else if (playActuallyDidChange || stepActuallyDidChange) { // Use the passed booleans
            // For a light update, pass the current channel state and the specific step.
            // updateChannelUI with isFullRenderPass=false will only update step lights.
            updateChannelUI(el, ch, currentGlobalStep, i, false); 
        }
    }
  });
};

// --- Global/project UI rendering ---
const renderGlobalUI = (s, ps) => {
  if (projectNameInput && (!ps || s.projectName !== ps.projectName)) {
    projectNameInput.value = s.projectName;
    document.title = s.projectName + " - Audional Sequencer";
  }
  const bpmInput = document.getElementById('bpm-input');
  if (bpmInput && (!ps || s.bpm !== ps.bpm)) {
    bpmInput.value = s.bpm;
  }
};

// --- Main render logic ---
function render(s, ps) {
  renderGlobalUI(s, ps);
  const prevChannelsState = ps?.channels ?? []; // Use a different name to avoid confusion
  const currentChannelsState = s.channels;

  const lengthDidChange = !ps || currentChannelsState.length !== prevChannelsState.length;
  
  // Define these booleans based on global state changes
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
        // channelZoomStates might need cleanup if tied to index strictly and channels are removed from middle
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
    // Length hasn't changed
    let anyChannelDataRequiresFullUpdate = false;
    currentChannelsState.forEach((currentCh, i) => {
        const prevCh = prevChannelsState[i];
        if (prevCh && currentCh !== prevCh) { // Object identity changed for this channel
            let propertiesTriggeringFullUpdateChanged = false;
            for (const key in currentCh) {
                if (Object.prototype.hasOwnProperty.call(currentCh, key) && 
                    (!prevCh || currentCh[key] !== prevCh[key])) {
                    
                    const dynamicKeysIgnoredForFullUpdate = [
                        'activePlaybackScheduledTime', 
                        'activePlaybackDuration', 
                        'activePlaybackTrimStart', 
                        'activePlaybackTrimEnd', 
                        'activePlaybackReversed'
                        // 'currentStep' is handled globally, not a per-channel property causing full DOM refresh
                    ];

                    if (!dynamicKeysIgnoredForFullUpdate.includes(key)) {
                        propertiesTriggeringFullUpdateChanged = true;
                        if (DEBUG_CACHE) { // Use imported DEBUG_CACHE
                            if (key === 'buffer' || key === 'reversedBuffer') {
                                if (currentCh[key] !== prevCh[key]) { // Should always be true if currentCh !== prevCh due to buffer
                                     console.log(`[UI Render Debug - Full Update Trigger] Ch ${i} data changed: ${key} (object identity)`);
                                }
                            } else if (key === 'steps') {
                                if (JSON.stringify(currentCh[key]) !== JSON.stringify(prevCh[key])) {
                                    console.log(`[UI Render Debug - Full Update Trigger] Ch ${i} data changed: ${key}`);
                                }
                            } else {
                               console.log(`[UI Render Debug - Full Update Trigger] Ch ${i} data changed: ${key}, From:`, prevCh?.[key], "To:", currentCh[key]);
                            }
                        }
                        break; 
                    } else {
                         if (DEBUG_CACHE && currentCh[key] !== prevCh?.[key]) {
                             // console.log(`[UI Render Debug - Dynamic Key] Ch ${i} data changed: ${key}, From:`, prevCh?.[key], "To:", currentCh[key]);
                         }
                    }
                }
            }
            if (propertiesTriggeringFullUpdateChanged) {
                anyChannelDataRequiresFullUpdate = true;
            }
        }
    });

    if (anyChannelDataRequiresFullUpdate) {
        if (DEBUG_CACHE) {
            console.log("[UI Render] Full update for channels triggered by significant data change(s).");
        }
        updateAllChannels(currentChannelsState, prevChannelsState, s.currentStep, playActuallyDidChange, stepActuallyDidChange, true); 
    } else if (stepActuallyDidChange || playActuallyDidChange) {
        if (DEBUG_CACHE) {
            console.log("[UI Render] Light update triggered by step/play state change.");
        }
        updateAllChannels(currentChannelsState, prevChannelsState, s.currentStep, playActuallyDidChange, stepActuallyDidChange, false);
    }
  }
}

// --- Animate transport playheads/waveforms ---
function animateTransport() {
  const { playing, channels } = State.get();
  const now = ctx.currentTime; 

  // TODO: Implement IntersectionObserver and iterate over `visibleChannelIndices`
  channels.forEach((ch, idx) => {
    const el = container.children[idx];
    const canvas = el?.querySelector('.waveform');

    if (!canvas || canvas.clientWidth === 0 || canvas.clientHeight === 0) {
      if (mainTransportPlayheadRatios.has(idx)) mainTransportPlayheadRatios.delete(idx);
      return; 
    }

    let currentPlayheadBufferRatio = null; 
    if (playing && ch.activePlaybackScheduledTime != null && ch.activePlaybackDuration > 0) {
      const elapsedSinceScheduled = now - ch.activePlaybackScheduledTime;
      const progressRatioInAudibleSegment = elapsedSinceScheduled / ch.activePlaybackDuration;

      if (progressRatioInAudibleSegment >= 0 && progressRatioInAudibleSegment < 1) {
        const trimStart = ch.activePlaybackTrimStart ?? ch.trimStart ?? 0; // Fallback to general trim if active not set
        const trimEnd = ch.activePlaybackTrimEnd ?? ch.trimEnd ?? 1;
        const trimmedSegmentDurationRatioInFullBuffer = trimEnd - trimStart;

        if (trimmedSegmentDurationRatioInFullBuffer > 0) { 
            if (ch.activePlaybackReversed) {
              currentPlayheadBufferRatio = trimEnd - (progressRatioInAudibleSegment * trimmedSegmentDurationRatioInFullBuffer);
            } else {
              currentPlayheadBufferRatio = trimStart + (progressRatioInAudibleSegment * trimmedSegmentDurationRatioInFullBuffer);
            }
            currentPlayheadBufferRatio = Math.max(0, Math.min(1, currentPlayheadBufferRatio));
        }
      }
    }

    const previousPlayheadBufferRatio = mainTransportPlayheadRatios.get(idx);
    const playheadMovedSignificantly = currentPlayheadBufferRatio == null 
        ? previousPlayheadBufferRatio != null 
        : previousPlayheadBufferRatio == null || Math.abs((previousPlayheadBufferRatio || 0) - currentPlayheadBufferRatio) > 0.0001;

    if (playheadMovedSignificantly) {
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