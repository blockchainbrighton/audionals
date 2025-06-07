/***********************************************************************
 * ui.js – Entry, orchestrates channel UI and global UI state
 ***********************************************************************/
import State from './state.js';
import { ctx } from './audioEngine.js';
import { renderWaveformToCanvas } from './waveformDisplay.js';
import { debounce } from './uiHelpers.js';
// Removed updateChannelStepHighlighting, using modified updateChannelUI
import { wireChannel, updateChannelUI, previewPlayheads, mainTransportPlayheadRatios, channelZoomStates } from './channelUI.js';

const container = document.getElementById('channels-container');
const template = document.getElementById('channel-template');
let projectNameInput = null;

// --- Core UI ---
function renderGlobalUI(newState, prevState) {
  if (projectNameInput && (!prevState || newState.projectName !== prevState.projectName)) {
    projectNameInput.value = newState.projectName;
    document.title = newState.projectName + " - Audional Sequencer";
  }
  const bpmInput = document.getElementById('bpm-input');
  if (bpmInput && (!prevState || newState.bpm !== prevState.bpm)) {
    bpmInput.value = newState.bpm;
  }
}

function render(newState, prevState) {
  // console.time('ui.render');

  renderGlobalUI(newState, prevState);

  const prevChannels = prevState ? prevState.channels : [];
  const channelsLengthChanged = !prevState || newState.channels.length !== prevChannels.length;
  const currentStepChanged = !prevState || newState.currentStep !== prevState.currentStep;
  const playingStateChanged = !prevState || newState.playing !== prevState.playing;

  if (channelsLengthChanged) {
    // console.log('[ui.js] Channels length changed, performing full re-render of channels container.');
    while (container.children.length > newState.channels.length) {
      const old = container.lastChild;
      if (old?.dataset.channelIndex) {
        const idx = +old.dataset.channelIndex;
        previewPlayheads.delete(idx);
        mainTransportPlayheadRatios.delete(idx);
        // channelZoomStates[idx] = undefined; // Or splice if it's an array managed by index
      }
      old?.remove();
    }
    newState.channels.forEach((channelState, i) => {
      let channelElement = container.children[i];
      if (!channelElement) {
        channelElement = template.content.firstElementChild.cloneNode(true);
        channelElement.dataset.channelIndex = i;
        container.append(channelElement);
        wireChannel(channelElement, i);
      }
      updateChannelUI(channelElement, channelState, newState.currentStep, i, true); // Full update for new/restructured channels
    });
  } else {
    // Channels length is the same
    let channelDataActuallyChangedSomewhere = false;
    for (let i = 0; i < newState.channels.length; i++) {
        if (newState.channels[i] !== prevChannels[i]) {
            channelDataActuallyChangedSomewhere = true;
            break;
        }
    }

    if (channelDataActuallyChangedSomewhere) {
        // If any channel's data object itself changed, iterate and fully update those that did.
        // For others, if only step/play changed, do a light update.
        newState.channels.forEach((channelState, i) => {
            const channelElement = container.children[i];
            if (channelState !== prevChannels[i]) {
                // console.debug(`[ui.js] Channel ${i} data changed, calling full updateChannelUI.`);
                updateChannelUI(channelElement, channelState, newState.currentStep, i, true);
            } else if (currentStepChanged || playingStateChanged) {
                // Channel data same, but step/play changed - light update
                // console.debug(`[ui.js] Only currentStep/playing changed for channel ${i}, calling partial updateChannelUI.`);
                updateChannelUI(channelElement, channelState, newState.currentStep, i, false);
            }
        });
    } else if (currentStepChanged || playingStateChanged) {
        // No channel data changed, only global step/play state. Light update for all.
        // console.debug('[ui.js] Only global currentStep/playing changed, partial update for all channels.');
        newState.channels.forEach((channelState, i) => {
            const channelElement = container.children[i];
            updateChannelUI(channelElement, channelState, newState.currentStep, i, false);
        });
    }
  }
  // console.timeEnd('ui.render');
}

function animateTransport() {
  const state = State.get();
  const { playing, channels } = state; // No need for currentStep here if step UI is handled by `render`
  const now = ctx.currentTime;

  channels.forEach((ch, idx) => {
    const el = container.children[idx];
    if (!el) return; // Channel element might not exist yet if channels are being added
    const canvas = el.querySelector('.waveform');
    let curRatio = null;

    if (playing && ch.activePlaybackScheduledTime != null && ch.activePlaybackDuration > 0) {
      const elapsed = now - ch.activePlaybackScheduledTime;
      const totalSampleSegmentDuration = ch.activePlaybackTrimEnd - ch.activePlaybackTrimStart;

      if (elapsed >= 0 && elapsed < ch.activePlaybackDuration && totalSampleSegmentDuration > 0) {
        const progressWithinSegment = elapsed / ch.activePlaybackDuration;
        curRatio = ch.activePlaybackReversed ?
          (ch.activePlaybackTrimEnd - progressWithinSegment * totalSampleSegmentDuration) :
          (ch.activePlaybackTrimStart + progressWithinSegment * totalSampleSegmentDuration);
      }
    }

    const prevRatio = mainTransportPlayheadRatios.get(idx);
    let needsRedraw = false;

    if (curRatio === null) {
      if (prevRatio != null) {
        mainTransportPlayheadRatios.delete(idx);
        needsRedraw = true;
      }
    } else {
      if (prevRatio == null || Math.abs((prevRatio || 0) - curRatio) > 0.0001) {
        mainTransportPlayheadRatios.set(idx, curRatio);
        needsRedraw = true;
      }
    }
    
    if (needsRedraw && canvas?.clientWidth && canvas?.clientHeight) {
      renderWaveformToCanvas(
        canvas, ch.buffer, ch.trimStart, ch.trimEnd,
        {
          mainPlayheadRatio: curRatio,
          previewPlayheadRatio: previewPlayheads.get(idx),
          fadeInTime: ch.fadeInTime, 
          fadeOutTime: ch.fadeOutTime,
          isReversed: ch.activePlaybackReversed, 
          zoomTrim: !!channelZoomStates[idx]
        }
      );
    }
  });
  requestAnimationFrame(animateTransport);
}

export function init() {
  projectNameInput = document.getElementById('project-name-input');
  projectNameInput.addEventListener('input', debounce(e => State.update({ projectName: e.target.value || "Untitled Audional Composition" }), 300));
  
  State.subscribe(render);
  render(State.get(), null); 
  requestAnimationFrame(animateTransport);
  document.getElementById('load-btn').addEventListener('click', () => document.getElementById('load-input').click());
}