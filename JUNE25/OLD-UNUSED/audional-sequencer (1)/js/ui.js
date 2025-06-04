import { appState } from './state.js';

export function renderSequencer() {
  const main = document.getElementById('sequencer');
  if (!main) return;
  main.innerHTML = '';
  const channels = appState.channels.get();
  channels.forEach((ch, cIdx) => {
    const strip = document.createElement('div');
    strip.className = 'channel-strip';

    const header = document.createElement('div');
    header.className = 'channel-header';
    header.innerHTML = `
      <span class="channel-title">${ch.name}</span>
      <button class="solo" data-c="${cIdx}">${ch.solo ? "🔊" : "🔈"}</button>
      <button class="mute" data-c="${cIdx}">${ch.mute ? "🚫" : "🔉"}</button>
    `;
    strip.appendChild(header);

    const waveform = document.createElement('div');
    waveform.className = 'waveform';
    strip.appendChild(waveform);

    const grid = document.createElement('div');
    grid.className = 'step-grid';
    ch.steps.forEach((step, sIdx) => {
      const btn = document.createElement('button');
      btn.className = 'step' + (step.on ? ' on' : '') + (step.reverse ? ' reverse' : '');
      btn.dataset.c = cIdx;
      btn.dataset.s = sIdx;
      btn.onclick = () => toggleStep(cIdx, sIdx);
      grid.appendChild(btn);
    });
    strip.appendChild(grid);
    main.appendChild(strip);
  });
}

function toggleStep(cIdx, sIdx) {
  const channels = appState.channels.get().slice();
  const step = channels[cIdx].steps[sIdx];
  step.on = !step.on;
  appState.channels.set(channels);
}
