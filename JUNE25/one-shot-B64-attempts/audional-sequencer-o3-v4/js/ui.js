/***********************************************************************
 * ui.js – Entry, orchestrates channel UI and global UI state
 ***********************************************************************/
import State from './state.js';
import { ctx } from './audioEngine.js';
import { renderWaveformToCanvas } from './waveformDisplay.js';
import { debounce } from './uiHelpers.js';
import { wireChannel, updateChannelUI, previewPlayheads, mainTransportPlayheadRatios, channelZoomStates } from './channelUI.js';

const container = document.getElementById('channels-container');
const template = document.getElementById('channel-template');
let projectNameInput = null;

// --- Core UI ---
function renderGlobalUI(s, p) {
  if (projectNameInput && (!p || s.projectName !== p.projectName))
    projectNameInput.value = s.projectName, document.title = s.projectName + " - Audional Sequencer";
  const bpmInput = document.getElementById('bpm-input');
  if (bpmInput && (!p || s.bpm !== p.bpm)) bpmInput.value = s.bpm;
}

function render(s, p) {
  renderGlobalUI(s, p);
  if (!p || s.channels.length !== p.channels.length) {
    while (container.children.length > s.channels.length) {
      const old = container.lastChild;
      old?.dataset.channelIndex && (previewPlayheads.delete(+old.dataset.channelIndex), mainTransportPlayheadRatios.delete(+old.dataset.channelIndex));
      old?.remove();
    }
    s.channels.forEach((ch, i) => {
      let el = container.children[i];
      if (!el) el = template.content.firstElementChild.cloneNode(true), el.dataset.channelIndex = i, container.append(el), wireChannel(el, i);
      updateChannelUI(el, ch, s.currentStep, i);
    });
  } else s.channels.forEach((ch, i) => {
    const el = container.children[i], oldCh = p.channels[i];
    if (el && (ch !== oldCh || s.currentStep !== p.currentStep || s.playing !== p.playing))
      updateChannelUI(el, ch, s.currentStep, i);
  });
}

function animateTransport() {
  const { playing, channels } = State.get(), now = ctx.currentTime;
  channels.forEach((ch, idx) => {
    const el = container.children[idx], canvas = el?.querySelector('.waveform');
    let curRatio = null;
    if (playing && ch.activePlaybackScheduledTime != null && ch.activePlaybackDuration > 0) {
      const elapsed = now - ch.activePlaybackScheduledTime, segDur = ch.activePlaybackTrimEnd - ch.activePlaybackTrimStart;
      if (elapsed >= 0 && elapsed < ch.activePlaybackDuration && segDur > 0)
        curRatio = ch.activePlaybackReversed ?
          (ch.activePlaybackTrimEnd - (elapsed / ch.activePlaybackDuration) * segDur) :
          (ch.activePlaybackTrimStart + (elapsed / ch.activePlaybackDuration) * segDur);
    }
    const prev = mainTransportPlayheadRatios.get(idx);
    let needsRedraw = false;
    if (curRatio === null) { prev != null && (mainTransportPlayheadRatios.delete(idx), needsRedraw = true); }
    else if (prev == null || Math.abs((prev || 0) - curRatio) > 0.0001) mainTransportPlayheadRatios.set(idx, curRatio), needsRedraw = true;
    if (needsRedraw && canvas?.clientWidth && canvas?.clientHeight)
      renderWaveformToCanvas(
        canvas, ch.buffer, ch.trimStart, ch.trimEnd,
        {
          mainPlayheadRatio: curRatio,
          previewPlayheadRatio: previewPlayheads.get(idx),
          fadeInTime: ch.fadeInTime, fadeOutTime: ch.fadeOutTime,
          isReversed: ch.activePlaybackReversed, zoomTrim: !!channelZoomStates[idx]
        }
      );
  });
  requestAnimationFrame(animateTransport);
}

export function init() {
  projectNameInput = document.getElementById('project-name-input');
  projectNameInput.addEventListener('input', debounce(e => State.update({ projectName: e.target.value || "Untitled Audional Composition" }), 300));
  State.subscribe(render);
  requestAnimationFrame(animateTransport);
  document.getElementById('load-btn').addEventListener('click', () => document.getElementById('load-input').click());
  render(State.get(), null);
}
