/*****************************************************************
 *  main.js – single-file drop-in replacement
 *****************************************************************/
import { ogSampleUrls } from './samples.js';

/* ---------- Tone import (once) ---------- */
import('https://ordinals.com/content/04813d7748d918bd8a3069cb1823ebc9586f0ce16cd6a97a784581ec38d13062i0')
  .then(() => boot());

/* ---------- Global state ---------- */
const State = {
  bpm: 120,
  swing: 0,
  channels: [],
  patterns: {},
  playState: 'stopped',
  step: 0,
};

/* ---------- Tone boot & scheduler ---------- */
function boot() {
  const Tone = window.Tone;
  Tone.Transport.bpm.value = State.bpm;
  Tone.Transport.swing = State.swing / 100;

  Tone.Transport.scheduleRepeat(time => {
    State.step = Math.floor(Tone.Transport.seconds * State.bpm / 60 * 4) % 16;
    State.channels.forEach((ch, i) => {
      if (!ch.muted && (State.patterns[i]?.[State.step])) {
        const p = ch.player;
        if (!p || !p.buffer) return;
        p.reverse = !!ch.reversed;
        p.start(time,
                ch.trimStart || 0,
                (ch.trimEnd || p.buffer.duration) - (ch.trimStart || 0));
        p.playbackRate = ch.speed || 1;
      }
    });
  }, '16n');
}

/* ---------- Waveform mini + modal editor ---------- */
const WaveformUI = (() => {
  let trimCanvas, trimCtx, waveBuffer, currentChannel;

  /* mini inline canvas */
  function addMiniWave(channelEl, channelIdx) {
    const canvas = document.createElement('canvas');
    canvas.width = 150;
    canvas.height = 30;
    canvas.style.cursor = 'pointer';
    channelEl.prepend(canvas);

    const draw = () => {
      const ch = State.channels[channelIdx];
      if (!ch.player?.buffer) return;
      const data = ch.player.buffer.getChannelData(0);
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#0f0';
      const step = data.length / canvas.width;
      for (let x = 0; x < canvas.width; x++) {
        const h = Math.abs(data[Math.floor(x * step)]) * canvas.height;
        ctx.fillRect(x, (canvas.height - h) / 2, 1, h);
      }
    };
    channelEl.addEventListener('refreshWave', draw, false);
    draw();
  }

  /* open full editor */
  function openModal(channelIdx) {
    const ch = State.channels[channelIdx];
    if (!ch.player?.buffer) return;
    currentChannel = ch;
    waveBuffer = ch.player.buffer;

    const modal = document.createElement('div');
    modal.id = 'waveModal';
    Object.assign(modal.style, {
      position: 'fixed', inset: 0, zIndex: 999,
      background: 'rgba(0,0,0,.8)',
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    });
    modal.innerHTML = `
      <div style="background:#111;color:#0f0;font-family:mono;padding:20px;border-radius:8px;width:90vw;max-width:800px">
        <h3>Edit ${ch.name}</h3>
        <canvas id="trimCanvas" width="760" height="120" style="background:#000;width:100%"></canvas><br>
        <label>Speed (pitch): <input id="speedRange" type="range" min=".25" max="4" step=".01" value="${ch.speed || 1}"></label>
        <span id="speedVal">${(ch.speed || 1).toFixed(2)}</span><br>
        <label>Gain: <input id="gainRange" type="range" min="-24" max="6" step=".1" value="${ch.gain || 0}"></label>
        <span id="gainVal">${(ch.gain || 0).toFixed(1)} dB</span><br>
        <label><input id="revChk" type="checkbox" ${ch.reversed ? 'checked' : ''}> Reverse</label><br><br>
        <button id="closeModal">Close</button>
      </div>`;
    document.body.appendChild(modal);

    trimCanvas = document.getElementById('trimCanvas');
    trimCtx = trimCanvas.getContext('2d');
    renderTrimCanvas();
    bindModalEvents(modal);
  }

  function renderTrimCanvas() {
    if (!waveBuffer) return;
    const data = waveBuffer.getChannelData(0);
    const w = trimCanvas.width, h = trimCanvas.height;
    trimCtx.clearRect(0, 0, w, h);
    trimCtx.fillStyle = '#0f0';
    const step = data.length / w;
    for (let x = 0; x < w; x++) {
      const y = Math.abs(data[Math.floor(x * step)]) * h / 2;
      trimCtx.fillRect(x, h / 2 - y, 1, y * 2);
    }

    const s = ((currentChannel.trimStart || 0) / waveBuffer.duration) * w;
    const e = ((currentChannel.trimEnd || waveBuffer.duration) / waveBuffer.duration) * w;
    trimCtx.fillStyle = 'rgba(0,255,0,.3)';
    trimCtx.fillRect(s, 0, e - s, h);
    trimCtx.fillStyle = '#fff';
    trimCtx.fillRect(s - 2, 0, 4, h);
    trimCtx.fillRect(e - 2, 0, 4, h);
  }

  function bindModalEvents(modal) {
    let dragging = null;
    const getPos = e => (e.offsetX / trimCanvas.width) * waveBuffer.duration;

    trimCanvas.onmousedown = e => {
      const s = ((currentChannel.trimStart || 0) / waveBuffer.duration) * trimCanvas.width;
      const end = ((currentChannel.trimEnd || waveBuffer.duration) / waveBuffer.duration) * trimCanvas.width;
      const click = e.offsetX;
      if (Math.abs(click - s) < 8) dragging = 'start';
      else if (Math.abs(click - end) < 8) dragging = 'end';
    };
    window.onmousemove = e => {
      if (!dragging) return;
      const pos = Math.max(0, Math.min(getPos(e), waveBuffer.duration));
      if (dragging === 'start') currentChannel.trimStart = pos;
      else currentChannel.trimEnd = pos;
      renderTrimCanvas();
    };
    window.onmouseup = () => dragging = null;

    document.getElementById('speedRange').oninput = e => {
      currentChannel.speed = +e.target.value;
      document.getElementById('speedVal').textContent = (+e.target.value).toFixed(2);
    };
    document.getElementById('gainRange').oninput = e => {
      currentChannel.gain = +e.target.value;
      document.getElementById('gainVal').textContent = (+e.target.value).toFixed(1) + ' dB';
      currentChannel.player.volume.value = window.Tone.gainToDb(currentChannel.gain);
    };
    document.getElementById('revChk').onchange = e => { currentChannel.reversed = e.target.checked; };
    document.getElementById('closeModal').onclick = () => modal.remove();
  }

  return { addMiniWave, openModal };
})();

/* ---------- Audio engine ---------- */
const audioEngine = {
  init() { window.Tone.start(); },
  play: () => window.Tone.Transport.start(),
  pause: () => window.Tone.Transport.pause(),
  stop() { window.Tone.Transport.stop(); State.step = 0; },
  setBpm: b => window.Tone.Transport.bpm.value = (State.bpm = b),
  setSwing: s => window.Tone.Transport.swing = (State.swing = s) / 100,
};

/* ---------- Save / Load ---------- */
function buildSlimJSON() {
  const channels = State.channels.map((ch, i) => ({
    name: ch.name,
    volume: ch.volume,
    muted: ch.muted,
    solo: ch.solo,
    sampleUrl: ch.sampleUrl,
    trimStart: ch.trimStart || 0,
    trimEnd: ch.trimEnd || null,
    speed: ch.speed || 1,
    gain: ch.gain || 0,
    reversed: !!ch.reversed,
    sequence: State.patterns[i] || Array(16).fill(0),
  }));
  return JSON.stringify({ bpm: State.bpm, swing: State.swing, channels });
}

async function applySlimJSON(json) {
  const slim = JSON.parse(json);
  audioEngine.setBpm(slim.bpm);
  audioEngine.setSwing(slim.swing);
  State.channels.length = 0;
  State.patterns = {};
  for (let i = 0; i < slim.channels.length; i++) {
    const c = slim.channels[i];
    await addChannel(c.name, c.sampleUrl);
    const ch = State.channels[i];
    Object.assign(ch, c);
    ch.player.volume.value = window.Tone.gainToDb(ch.volume);
    State.patterns[i] = c.sequence.slice();
  }
  ui.renderChannels();
}

function saveToFile() {
  const blob = new Blob([buildSlimJSON()], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'session.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

function loadFromFile(file) {
  const fr = new FileReader();
  fr.onload = () => applySlimJSON(fr.result);
  fr.readAsText(file);
}

/* ---------- UI agent ---------- */
const ui = {
  canvas: document.getElementById('gridCanvas'),
  ctx: null,
  cellW: 40,
  cellH: 30,
  channelListEl: document.getElementById('channelList'),

  init() {
    this.ctx = this.canvas.getContext('2d');
    this.canvas.width = 16 * this.cellW;
    this.canvas.height = 16 * this.cellH;
    this.canvas.onclick = e => {
      const { left, top } = this.canvas.getBoundingClientRect();
      const col = Math.floor((e.clientX - left) / this.cellW);
      const row = Math.floor((e.clientY - top) / this.cellH);
      if (!State.channels[row]) return;
      const pat = (State.patterns[row] ||= Array(16).fill(0));
      pat[col] = +!pat[col];
      this.draw();
    };
    this.drawLoop();
  },

  drawLoop() {
    this.draw();
    requestAnimationFrame(() => this.drawLoop());
  },

  draw() {
    const { ctx, canvas, cellW, cellH } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#222';
    for (let c = 0; c < 16; c++) ctx.fillRect(c * cellW, 0, 1, canvas.height);
    for (let r = 0; r < State.channels.length; r++) {
      ctx.fillRect(0, r * cellH, canvas.width, 1);
      const pat = State.patterns[r] || [];
      for (let c = 0; c < 16; c++) {
        ctx.fillStyle = pat[c] ? '#0f0' : (c === State.step ? '#555' : '#111');
        ctx.fillRect(c * cellW + 1, r * cellH + 1, cellW - 1, cellH - 1);
      }
    }
  },

  renderChannels() {
  this.channelListEl.replaceChildren(
    ...State.channels.map((ch, i) => {
      const row = document.createElement('div');
      row.className = 'channelRow';
      row.innerHTML = `
        <span style="width:80px">${ch.name}</span>
        <canvas class="miniWave" width="150" height="30" title="Click to edit"></canvas>
        <input class="vol" type="range" min="0" max="1" step="0.01" value="${ch.volume}">
        <label><input class="mute" type="checkbox"${ch.muted ? ' checked' : ''}>M</label>
        <label><input class="solo" type="checkbox"${ch.solo ? ' checked' : ''}>S</label>
        <button class="addSound">➕</button>
        <button class="del">🗑</button>`;

      // Always show and update miniWave (even if no sample)
      WaveformUI.addMiniWave(row.querySelector('.miniWave'), i);
      row.querySelector('.miniWave').onclick = () => WaveformUI.openModal(i);

      row.querySelector('.vol').oninput = e => {
        ch.volume = +e.target.value;
        if (ch.player) ch.player.volume.value = window.Tone.gainToDb(ch.volume);
      };
      ['mute', 'solo'].forEach(k => {
        row.querySelector(`.${k}`).onchange = e => { ch[k] = e.target.checked; };
      });
      row.querySelector('.del').onclick = () => {
        State.channels.splice(i, 1);
        delete State.patterns[i];
        ui.renderChannels();
      };
      row.querySelector('.addSound').onclick = e => {
        const sel = buildInlineSampleSelect(async (src, label) => {
          try {
            const p = await loader.loadSample(src);
            p.volume.value = window.Tone.gainToDb(1);
            ch.player = p;
            ch.name = `OG ${label}`;
            ui.renderChannels();
          } catch (err) {
            console.error(err);
          }
        });
        e.target.after(sel);
      };
      return row;
    })
  );
}

};

/* ---------- Inline sample picker ---------- */
function buildInlineSampleSelect(onChange) {
  const sel = document.createElement('select');
  sel.innerHTML = `<option disabled selected>🎵 pick sound…</option>`;
  ogSampleUrls.forEach(({ value, text }) => sel.append(new Option(text, value)));
  sel.onchange = () => {
    onChange(sel.value, sel.selectedOptions[0].textContent);
    sel.remove();
  };
  return sel;
}

/* ---------- Loader ---------- */
const loader = {
  async loadSample(src) {
    const Tone = window.Tone;
    const isOrd = /^\/content\/[a-f0-9]{64}i0$/i.test(src) || src.startsWith('https://ordinals.com/content/');
    const url = isOrd && !src.startsWith('http') ? `https://ordinals.com${src}` : src;
    const res = await fetch(url);
    if (!res.ok) throw new Error(res.statusText);
    const ct = res.headers.get('Content-Type') || '';
    if (ct.includes('application/json')) {
      const { audioData } = await res.json();
      return new Tone.Player(audioData).toDestination();
    }
    if (ct.startsWith('audio/')) {
      const blob = await res.blob();
      return new Tone.Player(URL.createObjectURL(blob)).toDestination();
    }
    const html = await res.text();
    const m = html.match(/<audio[^>]+src=["']([^"']+)["']/i) || html.match(/src=["'](data:audio\/[^"']+)["']/i);
    if (m) return this.loadSample(m[1].startsWith('data:') ? m[1] : new URL(m[1], url).href);
    throw new Error('Unsupported source');
  }
};

/* ---------- Controller ---------- */
async function addChannel(name = 'Channel', src) {
  const Tone = window.Tone;
  const ch = { name, volume: 1, muted: false, solo: false };
  try {
    const p = await loader.loadSample(src);
    p.volume.value = Tone.gainToDb(1);
    ch.player = p;
  } catch (err) {
    console.error('Load failed', err);
  }
  State.channels.push(ch);
  ui.renderChannels();
}

/* ---------- UI wiring ---------- */
document.getElementById('playBtn').onclick = audioEngine.play;
document.getElementById('pauseBtn').onclick = audioEngine.pause;
document.getElementById('stopBtn').onclick = audioEngine.stop;
document.getElementById('bpmInput').oninput = e => audioEngine.setBpm(+e.target.value);
document.getElementById('swingInput').oninput = e => audioEngine.setSwing(+e.target.value);
document.getElementById('addChannelBtn').onclick = () =>
  addChannel(`Ch ${State.channels.length + 1}`, ogSampleUrls[0].value);
document.getElementById('saveBtn').onclick = saveToFile;
document.getElementById('fileInput').onchange = e =>
  e.target.files[0] && loadFromFile(e.target.files[0]);

/* ---------- INIT ---------- */
ui.init();
ui.renderChannels();