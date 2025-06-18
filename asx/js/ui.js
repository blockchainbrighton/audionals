/***********************************************************************
 * ui.js – Minimized & Modernized
 * With Global Active Audio Aware Transport Animation
 ***********************************************************************/
import State from './state.js';
import { ctx } from './audioEngine.js'; // Base AudioContext
import { globalActiveAudio, clamp } from './playbackEngine.js'; // Import global tracker
import { renderWaveformToCanvas } from './waveformDisplay.js';
import { debounce } from './uiHelpers.js';
import { 
    wireChannel, 
    updateChannelUI, 
    previewPlayheads, 
    mainTransportPlayheadRatios, 
    channelZoomStates, 
    getChannelWaveformImage, 
    invalidateAllWaveformCaches,
    invalidateChannelWaveformCache, // Make sure this is exported if used here
    DEBUG_CACHE
} from './channelUI.js'; 

const container = document.getElementById('channels-container');
const template = document.getElementById('channel-template');
let projectNameInput = null;

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

const renderGlobalUI = (s, ps) => {
  if (projectNameInput && (!ps || s.projectName !== ps.projectName)) {
    projectNameInput.value = s.projectName;
    document.title = `${s.projectName} - Audional Sequencer`;
  }
  const bpmInput = document.getElementById('bpm-input');
  if (bpmInput && (!ps || s.bpm !== ps.bpm)) {
    // When state.bpm changes, update the input field and format to 2 decimal places
    bpmInput.value = s.bpm.toFixed(2);
  }
  const playbackModeBtn = document.getElementById('playback-mode-btn');
  if (playbackModeBtn && (!ps || s.playbackMode !== ps.playbackMode)) {
    playbackModeBtn.textContent = `Mode: ${s.playbackMode === 'continuous' ? 'Continuous' : 'Single'}`;
  }
};


function render(s, ps) {
  renderGlobalUI(s, ps);
  const prevChannelsState = ps?.channels ?? [];
  const currentChannelsState = s.channels;

  const lengthDidChange = !ps || currentChannelsState.length !== prevChannelsState.length;
  const stepActuallyDidChange = !ps || s.currentStep !== ps.currentStep;
  const playActuallyDidChange = !ps || s.playing !== ps.playing;

  if (lengthDidChange) {
    invalidateAllWaveformCaches("Channel count changed in UI render");
    while (container.children.length > currentChannelsState.length) {
      const oldElement = container.lastChild;
      if (oldElement?.dataset.channelIndex) {
        const idx = +oldElement.dataset.channelIndex;
        previewPlayheads.delete(idx); mainTransportPlayheadRatios.delete(idx);
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
              'activePlaybackScheduledTime', 'activePlaybackDuration', 
              'activePlaybackTrimStart', 'activePlaybackTrimEnd', 'activePlaybackReversed'
            ];
            if (!ignoredKeys.includes(key)) {
              fullUpdateNeeded = true;
              if (DEBUG_CACHE && key === 'buffer' && currentCh[key] !== prevCh[key]) {
                  console.log(`[UI Render Debug] Channel ${i} buffer identity changed. Invalidating cache.`);
                  invalidateChannelWaveformCache(i, "Buffer identity changed in main render");
              } else if (DEBUG_CACHE && (key === 'trimStart' || key === 'trimEnd') && currentCh[key] !== prevCh[key]) {
                  console.log(`[UI Render Debug] Channel ${i} trim changed for key "${key}". Invalidating cache.`);
                  invalidateChannelWaveformCache(i, `Trim changed for ${key} in main render`);
              } else if (DEBUG_CACHE) {
                  // console.log(`[UI Render Debug] Channel ${i} changed key "${key}" from`, prevCh[key], 'to', currentCh[key]);
              }
              // No break here, allow logging all changed keys if DEBUG_CACHE is on
            }
          }
        }
        if (fullUpdateNeeded) anyChannelDataRequiresFullUpdate = true;
      }
    });

    if (anyChannelDataRequiresFullUpdate) {
      if (DEBUG_CACHE) console.log("[UI Render] Full update triggered due to deep channel data change.");
      updateAllChannels(currentChannelsState, prevChannelsState, s.currentStep, playActuallyDidChange, stepActuallyDidChange, true);
    } else if (stepActuallyDidChange || playActuallyDidChange) {
      if (DEBUG_CACHE) console.log("[UI Render] Light update triggered due to step or play state change.");
      updateAllChannels(currentChannelsState, prevChannelsState, s.currentStep, playActuallyDidChange, stepActuallyDidChange, false);
    }
  }
}

function animateTransport() {
  const currentGlobalState = State.get();
  const { channels, playing } = currentGlobalState;
  const audioContextTimeNow = ctx.currentTime;

  channels.forEach((currentSeqChannelConfig, channelIdx) => {
    const channelElement = container.children[channelIdx];
    const canvasElement = channelElement?.querySelector('.waveform');

    if (!canvasElement || canvasElement.clientWidth === 0 || canvasElement.clientHeight === 0) {
      mainTransportPlayheadRatios.delete(channelIdx);
      return;
    }

    let playheadInfo = {
        bufferRatio: null,
        bufferForDisplay: currentSeqChannelConfig.buffer,
        trimStartForDisplay: currentSeqChannelConfig.trimStart,
        trimEndForDisplay: currentSeqChannelConfig.trimEnd,
        isReversedForDisplay: currentSeqChannelConfig.reverse,
        fadeInForDisplay: currentSeqChannelConfig.fadeInTime,
        fadeOutForDisplay: currentSeqChannelConfig.fadeOutTime,
    };

    const globallyPlayingInstance = globalActiveAudio.find(
      sound => sound.channelIndex === channelIdx &&
               audioContextTimeNow >= sound.audioContextStartTime &&
               audioContextTimeNow < sound.audioContextStartTime + sound.audioContextDuration
    );

    if (playing && globallyPlayingInstance) {
        const elapsed = audioContextTimeNow - globallyPlayingInstance.audioContextStartTime;
        const progress = elapsed / globallyPlayingInstance.audioContextDuration;

        const { sampleTrimStartRatio, sampleTrimEndRatio, isReversed: instanceIsReversed,
                sampleBufferIdentity, instanceFadeInTime, instanceFadeOutTime } = globallyPlayingInstance;
        const trimmedDurationRatio = sampleTrimEndRatio - sampleTrimStartRatio;

        if (trimmedDurationRatio > 0 && progress >= 0 && progress < 1) {
            playheadInfo.bufferRatio = instanceIsReversed
                ? sampleTrimEndRatio - (progress * trimmedDurationRatio)
                : sampleTrimStartRatio + (progress * trimmedDurationRatio);
            playheadInfo.bufferRatio = clamp(playheadInfo.bufferRatio, 0, 1);
        }
        
        playheadInfo.bufferForDisplay = sampleBufferIdentity;
        playheadInfo.trimStartForDisplay = sampleTrimStartRatio;
        playheadInfo.trimEndForDisplay = sampleTrimEndRatio;
        playheadInfo.isReversedForDisplay = instanceIsReversed;
        playheadInfo.fadeInForDisplay = instanceFadeInTime;
        playheadInfo.fadeOutForDisplay = instanceFadeOutTime;

    } else if (playing && currentSeqChannelConfig.activePlaybackScheduledTime != null && currentSeqChannelConfig.activePlaybackDuration > 0) {
        // Fallback for notes triggered and contained within the current sequence's display
        const elapsed = audioContextTimeNow - currentSeqChannelConfig.activePlaybackScheduledTime;
        const progress = elapsed / currentSeqChannelConfig.activePlaybackDuration;

        if (progress >= 0 && progress < 1) {
            const { activePlaybackTrimStart, activePlaybackTrimEnd, activePlaybackReversed } = currentSeqChannelConfig;
            const trimStart = activePlaybackTrimStart ?? currentSeqChannelConfig.trimStart ?? 0;
            const trimEnd = activePlaybackTrimEnd ?? currentSeqChannelConfig.trimEnd ?? 1;
            const isReversed = activePlaybackReversed ?? currentSeqChannelConfig.reverse;
            const trimmedDuration = trimEnd - trimStart;

            if (trimmedDuration > 0) {
                playheadInfo.bufferRatio = isReversed
                    ? trimEnd - (progress * trimmedDuration)
                    : trimStart + (progress * trimmedDuration);
                playheadInfo.bufferRatio = clamp(playheadInfo.bufferRatio, 0, 1);
            }
            // Properties for display are already set from currentSeqChannelConfig by default initialisation of playheadInfo
        }
    }

    const previousPlayheadRatio = mainTransportPlayheadRatios.get(channelIdx);
    const newPlayheadRatio = playheadInfo.bufferRatio;

    const playheadMovedSignificantly = newPlayheadRatio == null
      ? previousPlayheadRatio != null
      : previousPlayheadRatio == null || Math.abs((previousPlayheadRatio || 0) - newPlayheadRatio) > 0.0001;
    
    // Force redraw if a global sound is active, to ensure the correct waveform image is used,
    // or if the playhead moved significantly.
    if (playheadMovedSignificantly || (playing && globallyPlayingInstance)) {
      if (newPlayheadRatio == null) {
        mainTransportPlayheadRatios.delete(channelIdx);
      } else {
        mainTransportPlayheadRatios.set(channelIdx, newPlayheadRatio);
      }

      // Prepare a config object that getChannelWaveformImage can use.
      // This config reflects the sound that is *actually playing* if a global one is active.
      const configForWaveformImage = {
          buffer: playheadInfo.bufferForDisplay,
          trimStart: playheadInfo.trimStartForDisplay,
          trimEnd: playheadInfo.trimEndForDisplay,
          // getChannelWaveformImage primarily uses these for the cache key and drawing
      };
      
      const waveformImageToRender = getChannelWaveformImage(channelIdx, configForWaveformImage, canvasElement);

      renderWaveformToCanvas(canvasElement, 
        playheadInfo.bufferForDisplay,       // Actual buffer to display
        playheadInfo.trimStartForDisplay,    // Its trim settings
        playheadInfo.trimEndForDisplay,
        {
          cachedWaveformImage: waveformImageToRender,
          mainPlayheadRatio: playheadInfo.bufferRatio, // Calculated playhead position
          previewPlayheadRatio: previewPlayheads.get(channelIdx),
          fadeInTime: playheadInfo.fadeInForDisplay,    // Actual fades for this sound
          fadeOutTime: playheadInfo.fadeOutForDisplay,
          isReversed: playheadInfo.isReversedForDisplay,// Actual reverse state
          zoomTrim: !!channelZoomStates[channelIdx]     // UI zoom state
        });
    }
  });

  requestAnimationFrame(animateTransport);
}

export function init() {
  projectNameInput = document.getElementById('project-name-input');
  if (projectNameInput) {
    projectNameInput.addEventListener('input',
      debounce(e => State.update({ projectName: e.target.value || "Untitled Audional Composition" }), 300));
  }

  State.subscribe(render, { defer: true });
  render(State.get(), null); // Initial render

  requestAnimationFrame(animateTransport); // Start waveform animation loop

  const loadButton = document.getElementById('load-btn');
  const loadInput = document.getElementById('load-input');
  if (loadButton && loadInput) {
    loadButton.addEventListener('click', () => loadInput.click());
  }
}
