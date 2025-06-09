/***********************************************************************
 * ui.js – Minimized & Modernized
 ***********************************************************************/
import State from './state.js';
import { ctx } from './audioEngine.js';
import { renderWaveformToCanvas } from './waveformDisplay.js';
import { debounce } from './uiHelpers.js'; // Assuming uiHelpers.js exists and exports debounce
import { wireChannel, updateChannelUI, previewPlayheads, mainTransportPlayheadRatios, channelZoomStates } from './channelUI.js';

const container = document.getElementById('channels-container');
const template = document.getElementById('channel-template');
let projectNameInput = null;

// --- Helper: update all channel UIs, full/partial as needed
const updateAllChannels = (channels, prevChannels, step, playChanged, full = false) => {
  channels.forEach((ch, i) => {
    const el = container.children[i];
    if (full || ch !== prevChannels[i]) updateChannelUI(el, ch, step, i, true);
    else if (playChanged) updateChannelUI(el, ch, step, i, false);
  });
};

// --- Global/project UI rendering
const renderGlobalUI = (s, ps) => {
  if (projectNameInput && (!ps || s.projectName !== ps.projectName)) {
    projectNameInput.value = s.projectName;
    document.title = s.projectName + " - Audional Sequencer";
  }
  const bpmInput = document.getElementById('bpm-input');
  bpmInput && (!ps || s.bpm !== ps.bpm) && (bpmInput.value = s.bpm);
};

// --- Main render logic
function render(s, ps) {
  // s is the current state, ps is the previous state
  // This function is now called deferred via requestAnimationFrame
  renderGlobalUI(s, ps);
  const prevCh = ps?.channels ?? [], lenChanged = !ps || s.channels.length !== prevCh.length,
        stepChanged = !ps || s.currentStep !== ps.currentStep,
        playChanged = !ps || s.playing !== ps.playing;
  if (lenChanged) {
    while (container.children.length > s.channels.length) {
      const old = container.lastChild;
      if (old?.dataset.channelIndex) {
        const idx = +old.dataset.channelIndex;
        previewPlayheads.delete(idx);
        mainTransportPlayheadRatios.delete(idx);
      }
      old?.remove();
    }
    s.channels.forEach((ch, i) => {
      let el = container.children[i];
      if (!el) {
        el = template.content.firstElementChild.cloneNode(true);
        el.dataset.channelIndex = i;
        container.append(el);
        wireChannel(el, i);
      }
      updateChannelUI(el, ch, s.currentStep, i, true);
    });
  } else {
    const anyChanged = s.channels.some((ch, i) => ch !== prevCh[i]);
    if (anyChanged) updateAllChannels(s.channels, prevCh, s.currentStep, playChanged, true); // Made full update true if any channel data changed
    else if (stepChanged || playChanged) updateAllChannels(s.channels, prevCh, s.currentStep, playChanged, false); // Kept playChanged for partial update
  }
}

// --- Animate transport playheads/waveforms ---
function animateTransport() {
  const { playing, channels } = State.get(), now = ctx.currentTime;
  channels.forEach((ch, idx) => {
    const el = container.children[idx], canvas = el?.querySelector('.waveform');
    let curRatio = null;
    if (playing && ch.activePlaybackScheduledTime != null && ch.activePlaybackDuration > 0) {
      const elapsed = now - ch.activePlaybackScheduledTime,
            segDur = ch.activePlaybackTrimEnd - ch.activePlaybackTrimStart;
      if (elapsed >= 0 && elapsed < ch.activePlaybackDuration && segDur > 0) {
        const prog = elapsed / ch.activePlaybackDuration;
        curRatio = ch.activePlaybackReversed
          ? ch.activePlaybackTrimEnd - prog * segDur
          : ch.activePlaybackTrimStart + prog * segDur;
      }
    }
    const prevRatio = mainTransportPlayheadRatios.get(idx);
    const redraw = curRatio == null ? prevRatio != null : prevRatio == null || Math.abs((prevRatio || 0) - curRatio) > 0.0001;
    
    if (curRatio == null && prevRatio != null) mainTransportPlayheadRatios.delete(idx);
    if (curRatio != null && (prevRatio == null || Math.abs((prevRatio || 0) - curRatio) > 0.0001)) mainTransportPlayheadRatios.set(idx, curRatio);
    
    if (redraw && canvas?.clientWidth && canvas?.clientHeight)
      renderWaveformToCanvas(canvas, ch.buffer, ch.trimStart, ch.trimEnd, {
        mainPlayheadRatio: curRatio,
        previewPlayheadRatio: previewPlayheads.get(idx),
        fadeInTime: ch.fadeInTime,
        fadeOutTime: ch.fadeOutTime,
        isReversed: ch.activePlaybackReversed, // Ensure this reflects actual playback reversal
        zoomTrim: !!channelZoomStates[idx]
      });
  });
  requestAnimationFrame(animateTransport);
}

// --- Entry point ---
export function init() {
  projectNameInput = document.getElementById('project-name-input');
  projectNameInput.addEventListener('input',
    debounce(e => State.update({ projectName: e.target.value || "Untitled Audional Composition" }), 300));
  
  // Subscribe the main render function with the defer option
  State.subscribe(render, { defer: true }); 
  
  // Initial render call still needed, will also be effectively deferred if state emit happens before first rAF
  // Or, to be explicit, we can call render with current state and null previous state.
  // The first call to render should populate the UI based on initial state.
  // Since State.subscribe now defers, the very first render also gets deferred if an emit happens before its rAF.
  // To ensure UI is drawn on startup, we can call render directly once, or ensure initial emit from State is handled.
  // The current State implementation will call emit if any update happens.
  // Let's call render once synchronously for initial setup if needed, or rely on an initial state emit.
  // Given the new deferred nature, if State.get() is up-to-date, this is fine:
  render(State.get(), null); // Render initial state (this call itself won't be deferred by State manager)

  requestAnimationFrame(animateTransport);
  document.getElementById('load-btn').addEventListener('click', () =>
    document.getElementById('load-input').click());
}