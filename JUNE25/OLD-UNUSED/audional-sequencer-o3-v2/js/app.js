// js/app.js

import State from './state.js';
import * as UI from './ui.js';
import { start, stop } from './audioEngine.js';

function createChannel(idx) {
  return {
    name: 'Channel ' + (idx + 1),
    steps: new Array(64).fill(false),
    buffer: null,
    volume: 0.8,
    mute: false,
    solo: false,
    pitch: 1,
    trimStart: 0,
    trimEnd: 1
  };
}

// Initial setup
UI.init();
for (let i = 0; i < 16; i++) State.addChannel(createChannel(i));

document.getElementById('add-channel-btn').addEventListener('click', () => {
  const idx = State.get().channels.length;
  State.addChannel(createChannel(idx));
});

document.getElementById('play-btn').addEventListener('click', start);
document.getElementById('stop-btn').addEventListener('click', stop);

document.getElementById('bpm-input').addEventListener('change', e => {
  State.update({ bpm: parseInt(e.target.value, 10) || 120 });
});

// Save / Load
document.getElementById('save-btn').addEventListener('click', () => {
  const data = JSON.stringify(State.get());
  const blob = new Blob([data], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'audional-project.json';
  a.click();
});

document.getElementById('load-btn').addEventListener('click', () => {
  document.getElementById('load-input').click();
});

document.getElementById('load-input').addEventListener('change', async e => {
  const f = e.target.files[0];
  if (!f) return;
  const text = await f.text();
  try {
    const obj = JSON.parse(text);
    State.update(obj);
  } catch (err) {
    alert('Invalid project file');
  }
});
