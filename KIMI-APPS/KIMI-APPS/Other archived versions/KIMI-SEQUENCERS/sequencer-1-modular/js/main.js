import { ogSampleUrls } from './samples.js';

(async () => {
  await import('https://ordinals.com/content/04813d7748d918bd8a3069cb1823ebc9586f0ce16cd6a97a784581ec38d13062i0');
  const Tone = window.Tone;

  const State = {
    bpm: 120,
    swing: 0,
    channels: [],
    patterns: {},
    playState: 'stopped',
    step: 0,
  };

  Tone.Transport.bpm.value = State.bpm;
  Tone.Transport.swing = State.swing / 100;

  const audioEngine = {
    init() {
      Tone.start();
      Tone.Transport.scheduleRepeat(time => {
        State.step = Math.floor(Tone.Transport.seconds * State.bpm / 60 * 4) % 16;
        State.channels.forEach((ch, i) => {
          if (!ch.muted && State.patterns[i]?.[State.step]) {
            let p = ch.player;
            p.reverse = !!ch.reversed;
            p.start(time, ch.trimStart || 0);
          }
        });
      }, '16n');
    },
    play: () => Tone.Transport.start(),
    pause: () => Tone.Transport.pause(),
    stop: () => { Tone.Transport.stop(); State.step = 0; },
    setBpm: b => Tone.Transport.bpm.value = (State.bpm = b),
    setSwing: s => Tone.Transport.swing = (State.swing = s) / 100,
  };

  function buildSlimJSON() {
    const channels = State.channels.map((ch, i) => ({
      name: ch.name,
      volume: ch.volume,
      muted: ch.muted,
      solo: ch.solo,
      sampleUrl: ch.sampleUrl,
      trimStart: ch.trimStart || 0,
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
      ch.volume = c.volume;
      ch.muted = c.muted;
      ch.solo = c.solo;
      ch.trimStart = c.trimStart;
      ch.reversed = c.reversed;
      State.patterns[i] = c.sequence.slice();
      ch.player.volume.value = Tone.gainToDb(ch.volume);
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

  // ========== UI AGENT ==========
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
      this.canvas.addEventListener('click', e => {
        const { left, top } = this.canvas.getBoundingClientRect();
        const col = Math.floor((e.clientX - left) / this.cellW);
        const row = Math.floor((e.clientY - top) / this.cellH);
        if (State.channels[row]) {
          const pat = State.patterns[row] ||= Array(16).fill(0);
          pat[col] = +!pat[col];
          this.draw();
        }
      });
      requestAnimationFrame(() => this.drawLoop());
    },

    drawLoop() {
      this.draw();
      requestAnimationFrame(() => this.drawLoop());
    },

    draw() {
      const { ctx, cellW, cellH, canvas } = this;
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
      this.channelListEl.replaceChildren(...State.channels.map((ch, i) => {
        const row = document.createElement('div');
        row.className = 'channelRow';
        row.innerHTML = `
          <span style="width:80px">${ch.name}</span>
          <input class="vol" type="range" min="0" max="1" step="0.01" value="${ch.volume}">
          <label><input class="mute" type="checkbox"${ch.muted?' checked':''}>M</label>
          <label><input class="solo" type="checkbox"${ch.solo?' checked':''}>S</label>
          <button class="addSound">➕</button>
          <button class="del">🗑</button>
        `;

        row.querySelector('.vol').oninput = e => {
          ch.volume = +e.target.value;
          ch.player.volume.value = Tone.gainToDb(ch.volume);
        };
        ['mute','solo'].forEach(c => {
          row.querySelector(`.${c}`).onchange = e => { ch[c] = e.target.checked; };
        });

        row.querySelector('.del').onclick = () => {
          State.channels.splice(i, 1);
          delete State.patterns[i];
          this.renderChannels();
        };

        row.querySelector('.addSound').onclick = e => {
          const sel = buildInlineSampleSelect(async (src, label) => {
            try {
              const p = await loader.loadSample(src);
              p.volume.value = Tone.gainToDb(ch.volume);
              ch.player = p;
              ch.name = `OG ${label}`;
              this.renderChannels();
            } catch(err) {
              console.error('loadSound err', err);
            }
          });
          e.target.after(sel);
        };

        return row;
      }));
    }
  };

  // ========== DROPDOWN HELPER ==========
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

  // ========== LOADER ==========
  const loader = {
    async loadSample(src) {
      const isOrd = /^\/content\/[a-f0-9]{64}i0$/i.test(src)
        || src.startsWith('https://ordinals.com/content/');
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
      const m = html.match(/<audio[^>]+src=["']([^"']+)["']/i)
             || html.match(/src=["'](data:audio\/[^"']+)["']/i);
      if (m) return this.loadSample(m[1].startsWith('data:') ? m[1] : new URL(m[1], url).href);

      throw new Error('Unsupported source');
    }
  };

  // ========== CONTROLLER ==========
  async function addChannel(name = 'Channel', src) {
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

  // ========== UI WIRING ==========
  document.getElementById('playBtn').onclick = audioEngine.play;
  document.getElementById('pauseBtn').onclick = audioEngine.pause;
  document.getElementById('stopBtn').onclick = audioEngine.stop;
  document.getElementById('bpmInput').oninput = e => {
    State.bpm = +e.target.value;
    audioEngine.setBpm(State.bpm);
  };
  document.getElementById('swingInput').oninput = e => {
    State.swing = +e.target.value;
    audioEngine.setSwing(State.swing);
  };
  document.getElementById('addChannelBtn').onclick = () =>
    addChannel(`Ch ${State.channels.length + 1}`, ogSampleUrls[0].value);


    document.getElementById('saveBtn').onclick = saveToFile;
    document.getElementById('fileInput').onchange = e => e.target.files[0] && loadFromFile(e.target.files[0]);

    audioEngine.init();
    ui.init();
    ui.renderChannels();

  })();
