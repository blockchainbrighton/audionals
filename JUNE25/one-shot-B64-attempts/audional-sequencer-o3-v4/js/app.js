import State from './state.js';
import * as UI from './ui.js';
import { start, stop } from './audioEngine.js';
import { loadSample } from './utils.js';

const makeChannel = i => ({
  name: `Channel ${i + 1}`,
  steps: Array(64).fill(false),
  buffer: null,
  src: null,
  volume: 0.8,
  mute: false,
  solo: false,
  pitch: 1,
  trimStart: 0,
  trimEnd: 1
});

// ---------- INIT ----------
UI.init();
for (let i = 0; i < 16; i++) State.addChannel(makeChannel(i));

// ---------- UI EVENTS ----------
document.getElementById('add-channel-btn').addEventListener('click', () => {
  State.addChannel(makeChannel(State.get().channels.length));
});
document.getElementById('play-btn').addEventListener('click', start);
document.getElementById('stop-btn').addEventListener('click', stop);
document.getElementById('bpm-input').addEventListener('change', e => {
  const v = Math.min(Math.max(parseInt(e.target.value) || 120, 1), 420);
  State.update({ bpm: v });
});

// ---------- SAVE ----------
document.getElementById('save-btn').addEventListener('click', () => {
  const snapshot = { ...State.get() };
  snapshot.channels = snapshot.channels.map(ch => ({ ...ch, buffer: null }));
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'audional-project.json';
  a.click();
});

// ---------- LOAD ----------
document.getElementById('load-btn').addEventListener('click', () => {
  document.getElementById('load-input').click();
});

document.getElementById('load-input').addEventListener('change', async e => {
  const f = e.target.files[0];
  if (!f) return;
  try {
    const obj = JSON.parse(await f.text());
    if (Array.isArray(obj.channels)) {
      obj.channels = obj.channels.map(ch => ({ ...ch, buffer: null }));
    }
    State.update(obj);

    // After state applied, asynchronously fetch buffers for channels with URLs
    obj.channels?.forEach((ch, idx) => {
      if (ch.src && typeof ch.src === 'string') {
        loadSample(ch.src)
          .then(buf => State.updateChannel(idx, { buffer: buf }))
          .catch(() => console.warn('Failed to reload sample', ch.src));
      }
    });
  } catch {
    alert('Invalid project file');
  }
});
