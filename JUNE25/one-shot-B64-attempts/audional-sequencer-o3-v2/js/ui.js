import State from './state.js';
import { loadSample } from './utils.js';

const channelsContainer = document.getElementById('channels-container');
const channelTemplate = document.getElementById('channel-template');

export function init() {
  State.subscribe(render);
  render(State.get());
}

function drawWaveform(canvas, buffer) {
  const c = canvas.getContext('2d');
  const width = canvas.width = canvas.clientWidth;
  const height = canvas.height = canvas.clientHeight || 60;
  c.clearRect(0, 0, width, height);
  c.strokeStyle = '#4caf50';
  c.beginPath();
  c.moveTo(0, height/2);
  const data = buffer.getChannelData(0);
  const step = Math.ceil(data.length / width);
  for (let i = 0; i < width; i++) {
    const v = data[i * step] || 0;
    const y = (1 - v) * height / 2;
    c.lineTo(i, y);
  }
  c.stroke();
}

function render(state) {
  // Ensure DOM length
  while (channelsContainer.children.length > state.channels.length) {
    channelsContainer.removeChild(channelsContainer.lastChild);
  }

  state.channels.forEach((ch, idx) => {
    let el = channelsContainer.children[idx];
    if (!el) {
      el = channelTemplate.content.cloneNode(true).firstElementChild;
      channelsContainer.appendChild(el);
      attachChannelListeners(el, idx);
    }
    updateChannelEl(el, ch, state.currentStep);
  });
}

function attachChannelListeners(el, idx) {
  el.querySelector('.channel-name').addEventListener('input', e => {
    State.updateChannel(idx, { name: e.target.value });
  });

  el.querySelector('.mute-btn').addEventListener('click', () => {
    const ch = State.get().channels[idx];
    State.updateChannel(idx, { mute: !ch.mute });
  });

  el.querySelector('.solo-btn').addEventListener('click', () => {
    const ch = State.get().channels[idx];
    State.updateChannel(idx, { solo: !ch.solo });
  });

  el.querySelector('.volume-slider').addEventListener('input', e => {
    State.updateChannel(idx, { volume: parseFloat(e.target.value) });
  });

  el.querySelector('.file-input').addEventListener('change', async e => {
    const f = e.target.files[0];
    if (f) {
      const buf = await loadSample(f);
      State.updateChannel(idx, { buffer: buf });
    }
  });

  const urlInput = el.querySelector('.url-input');
  el.querySelector('.load-url-btn').addEventListener('click', async () => {
    const url = urlInput.value.trim();
    if (!url) return;
    try {
      const buf = await loadSample(url);
      State.updateChannel(idx, { buffer: buf });
    } catch (err) {
      alert('Failed to load sample: ' + err.message);
    }
  });

  const stepGrid = el.querySelector('.step-grid');
  for (let s = 0; s < 64; s++) {
    const step = document.createElement('div');
    step.className = 'step';
    step.dataset.step = s;
    step.addEventListener('click', () => {
      const ch = State.get().channels[idx];
      const newSteps = [...ch.steps];
      newSteps[s] = !newSteps[s];
      State.updateChannel(idx, { steps: newSteps });
    });
    stepGrid.appendChild(step);
  }
}

function updateChannelEl(el, ch, currentStep) {
  el.querySelector('.channel-name').value = ch.name;
  el.querySelector('.mute-btn').classList.toggle('active', ch.mute);
  el.querySelector('.solo-btn').classList.toggle('active', ch.solo);
  el.querySelector('.volume-slider').value = ch.volume;

  const steps = el.querySelectorAll('.step');
  steps.forEach((sEl, i) => {
    sEl.classList.toggle('on', ch.steps[i]);
    sEl.classList.toggle('playhead', i === currentStep);
  });

  if (ch.buffer && !el.querySelector('.waveform').dataset.drawn) {
    drawWaveform(el.querySelector('.waveform'), ch.buffer);
    el.querySelector('.waveform').dataset.drawn = '1';
  }
}
