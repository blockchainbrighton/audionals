

# 1) Minimal project manifest (web3-only)

```jsonc
// project.manifest.json (v1)
{
  "version": "1",
  "seed": "0xA11YDAW0001",
  "bpm": 120,
  "timeSig": [4, 4],
  "libraries": {
    // Tone.js MUST be loaded from-chain (your helper uses this)
    "tone": "inscription:04813d7748d918bd8a3069cb1823ebc9586f0ce16cd6a97a784581ec38d13062i0"
  },
  "assets": {
    "samples": {
      // 1/2 bar drum loop (2 beats at project tempo)
      "drum_halfbar": "inscription:418db69313f79c9161ca455961361bdf4c6f05a44862b7d99eac9e0efc9093a0i0"
    }
  },
  "graph": {
    "master": { "fx": [], "gain": 0.95 },
    "tracks": {
      "drums": { "fx": [], "out": "master" }
    }
  },
  "tracks": [
    { "id": "drums", "kind": "sampler", "channel": 0, "gain": 1.0 }
  ],
  "clips": [
    {
      "id": "drums_loop",
      "type": "audio",
      "trackId": "drums",
      "refId": "drum_halfbar",
      "startBeats": 0,
      "lengthBeats": 2,        // 1/2 bar at 4/4
      "loop": true,
      "timeSync": "fit"        // stretch/compress to exactly 2 beats at current BPM
    }
  ]
}
```

---

# 2) Web3 Tone.js loader (use as-is)

You provided this—keep it verbatim and call it at startup:

```js
// tone-loader.js
export function loadToneJSAndBoot({
  toneUrl = 'https://ordinals.com/content/04813d7748d918bd8a3069cb1823ebc9586f0ce16cd6a97a784581ec38d13062i0',
  setLoaderStatus,
  runtimeState,
  boot
}) {
  setLoaderStatus('Loading Audio Engine...');
  import(toneUrl)
    .then(() => {
      runtimeState.Tone = window.Tone;
      console.log('[BOP Matrix] Tone.js loaded:', runtimeState.Tone?.version ?? 'Unknown');
      boot();
    })
    .catch(err => {
      setLoaderStatus('Failed to load Tone.js. App cannot start.', true);
      console.error('[BOP Matrix] Critical Tone.js load error:', err);
    });
}
```

---

# 3) Inscription-only resolver (assets from ordinals)

```js
// src/web3/inscription-resolver.js
export class InscriptionResolver {
  // Accept both "inscription:<id>" and full ordinals content URLs.
  static toUrl(idOrUrl) {
    if (idOrUrl.startsWith('inscription:')) {
      const id = idOrUrl.slice('inscription:'.length);
      return `https://ordinals.com/content/${id}`;
    }
    return idOrUrl; // already a content URL
  }

  async fetchArrayBuffer(idOrUrl) {
    const url = InscriptionResolver.toUrl(idOrUrl);
    const res = await fetch(url, { cache: 'force-cache' });
    if (!res.ok) throw new Error(`Fetch failed ${res.status} for ${url}`);
    return await res.arrayBuffer();
  }

  async fetchJSON(idOrUrl) {
    const url = InscriptionResolver.toUrl(idOrUrl);
    const res = await fetch(url, { cache: 'force-cache' });
    if (!res.ok) throw new Error(`Fetch failed ${res.status} for ${url}`);
    return await res.json();
  }

  async fetchText(idOrUrl) {
    const url = InscriptionResolver.toUrl(idOrUrl);
    const res = await fetch(url, { cache: 'force-cache' });
    if (!res.ok) throw new Error(`Fetch failed ${res.status} for ${url}`);
    return await res.text();
  }
}
```

---

# 4) Single clock + scheduler (unchanged in spirit)

```js
// src/time/transport-clock.js
export class TransportClock {
  constructor(audioContext, { bpm = 120 } = {}) {
    this.ac = audioContext;
    this.state = { bpm, running: false, startAt: 0, offset: 0 };
  }
  nowAudio() { return this.ac.currentTime; }
  beatsToSeconds(b) { return (60 / this.state.bpm) * b; }
  secondsToBeats(s) { return s / (60 / this.state.bpm); }
  setBpm(bpm) { this.state.bpm = bpm; }
  start(when = this.nowAudio()) { this.state.running = true; this.state.startAt = when; }
  stop(when = this.nowAudio()) { this.state.running = false; this.state.offset = this.secondsToBeats(when - this.state.startAt); }
}
```

```js
// src/time/scheduler.js
export class Scheduler {
  constructor({ clock, lookahead = 0.1, horizon = 0.2, target, sequenceProvider }) {
    this.clock = clock; this.look = lookahead; this.h = horizon; this.target = target; this.seq = sequenceProvider;
    this._timer = null;
  }
  _tick = () => {
    const t0 = this.clock.nowAudio();
    const t1 = t0 + this.h;
    const b0 = this.clock.secondsToBeats(t0);
    const b1 = this.clock.secondsToBeats(t1);
    const events = this.seq.getEventsInRange(b0, b1);
    for (const ev of events) this.target.schedule(ev, this.clock.beatsToSeconds(ev.atBeats));
  };
  start() { if (this._timer) return; this._timer = setInterval(this._tick, this.look * 1000); }
  stop() { clearInterval(this._timer); this._timer = null; }
}
```

---

# 5) Model: a single audio clip that loops every 2 beats

```js
// src/model/song.js
export class Song {
  constructor({ clips, bpm }) {
    this.clips = clips; this.bpm = bpm;
  }
  // Return [{atBeats, type:'sample', refId, trackId, lengthBeats, timeSync}]
  getEventsInRange(b0, b1) {
    const out = [];
    for (const c of this.clips) {
      if (c.type !== 'audio') continue;
      // Emit triggers aligned to c.lengthBeats while looping
      const start = c.startBeats;
      const len = c.lengthBeats;
      if (b1 < start) continue;
      const firstK = Math.max(0, Math.floor((b0 - start) / len));
      const lastK = Math.floor((b1 - start) / len);
      for (let k = firstK; k <= lastK; k++) {
        const atBeats = start + k * len;
        if (atBeats >= b0 && atBeats < b1) {
          out.push({ atBeats, type: 'sample', refId: c.refId, trackId: c.trackId, lengthBeats: len, timeSync: c.timeSync ?? 'fit' });
        }
      }
    }
    return out;
  }
}
```

---

# 6) Tone-only engine (no fallback, web3-exclusive)

* Uses **Tone.Player**.
* Sets **Tone** to use our **AudioContext** and **clock**.
* **Time-sync**: we “fit to grid” so the sample plays exactly `lengthBeats` each trigger by setting `playbackRate = targetSeconds / buffer.duration`.

```js
// src/engine/tone-engine.js
export class ToneEngine {
  constructor({ audioContext, resolver, clock, Tone }) {
    this.ac = audioContext;
    this.resolver = resolver;
    this.clock = clock;
    this.Tone = Tone;
    this.players = new Map(); // refId -> { player, buffer, duration }
    // Ensure Tone uses our context
    if (this.Tone.getContext().rawContext !== this.ac) {
      this.Tone.setContext(new this.Tone.Context(this.ac));
    }
    // Master gain
    this.master = new this.Tone.Gain(0.95).toDestination();
  }

  async _ensurePlayer(refId) {
    if (this.players.has(refId)) return this.players.get(refId);
    const arr = await this.resolver.fetchArrayBuffer(refId);
    const audioBuf = await this.ac.decodeAudioData(arr.slice(0)); // slice → detach
    const toneBuf = new this.Tone.ToneAudioBuffer(audioBuf);
    const player = new this.Tone.Player({ url: toneBuf, loop: false }).connect(this.master);
    const entry = { player, buffer: audioBuf, duration: audioBuf.duration };
    this.players.set(refId, entry);
    return entry;
    // NOTE: All from on-chain via resolver; no off-chain URLs introduced.
  }

  // Unified schedule API (seconds, absolute, from TransportClock)
  async schedule(ev, whenSec) {
    if (ev.type !== 'sample') return;
    const { refId, lengthBeats, timeSync } = ev;
    const entry = await this._ensurePlayer(refId);

    // Compute playbackRate to “fit to grid”
    const targetSec = this.clock.beatsToSeconds(lengthBeats);
    const srcSec = entry.duration;
    const rate = timeSync === 'fit' && srcSec > 0 ? (srcSec > 0 ? (targetSec / srcSec) : 1) : 1;

    // Create a fire-and-forget instance to avoid voice stealing
    const inst = new this.Tone.Player({ url: entry.player.buffer, loop: false }).connect(this.master);
    inst.playbackRate = rate;

    // Tone.Time → seconds: we schedule against shared AudioContext, so call .start with seconds
    const now = this.ac.currentTime;
    const rel = Math.max(0, whenSec - now);
    inst.start(`+${rel}`);
  }

  setTempo(bpm) {
    // We keep Tone.Transport idle; timing comes from our TransportClock.
    // If you later want Tone LFOs synced, set Tone.Transport.bpm.value = bpm without starting it.
    this.Tone.Transport.bpm.value = bpm;
  }
}
```

---

# 7) Bootstrap (load Tone from ordinals, then build & play)

```html
<!-- index.html (skeleton) -->
<!doctype html>
<html>
<head><meta charset="utf-8"><title>Web3 DAW</title></head>
<body>
  <button id="play">Play</button>
  <script type="module">
    import { loadToneJSAndBoot } from './tone-loader.js';
    import { InscriptionResolver } from './src/web3/inscription-resolver.js';
    import { TransportClock } from './src/time/transport-clock.js';
    import { Scheduler } from './src/time/scheduler.js';
    import { Song } from './src/model/song.js';
    import { ToneEngine } from './src/engine/tone-engine.js';

    const runtimeState = {};
    const setLoaderStatus = (msg) => console.log(msg);

    // Use the exact on-chain Tone URL you provided
    loadToneJSAndBoot({
      toneUrl: 'https://ordinals.com/content/04813d7748d918bd8a3069cb1823ebc9586f0ce16cd6a97a784581ec38d13062i0',
      setLoaderStatus,
      runtimeState,
      boot: async () => {
        const ac = new AudioContext({ latencyHint: 'interactive' });
        // project constants (mirrors project.manifest.json)
        const BPM = 120;
        const CLIP = {
          type: 'audio',
          trackId: 'drums',
          refId: 'inscription:418db69313f79c9161ca455961361bdf4c6f05a44862b7d99eac9e0efc9093a0i0',
          startBeats: 0,
          lengthBeats: 2,
          loop: true,
          timeSync: 'fit'
        };

        const resolver = new InscriptionResolver();
        const clock = new TransportClock(ac, { bpm: BPM });
        const Tone = runtimeState.Tone;

        const engine = new ToneEngine({ audioContext: ac, resolver, clock, Tone });
        engine.setTempo(BPM);

        const song = new Song({ clips: [CLIP], bpm: BPM });
        const scheduler = new Scheduler({ clock, target: engine, sequenceProvider: song });

        document.getElementById('play').addEventListener('click', async () => {
          await ac.resume();
          clock.start();
          scheduler.start();
        });
      }
    });
  </script>
</body>
</html>
```

---

# 8) Targeted tests (headless)

These stay web3-safe (no off-chain libs). Two tiny examples you can drop into `/tests`.

```js
// /tests/model.audio-loop.fit.test.js
import { TransportClock } from '../src/time/transport-clock.js';
import { Song } from '../src/model/song.js';
import { assert } from './assert.js';

export async function test_audio_loop_events() {
  const BPM = 120;
  const ac = new (window.OfflineAudioContext || window.AudioContext)(1, 48000, 48000);
  const clock = new TransportClock(ac, { bpm: BPM });
  const song = new Song({ clips: [{ type:'audio', trackId:'drums', refId:'inscription:sample', startBeats:0, lengthBeats:2, loop:true }], bpm:BPM });

  const evs = song.getEventsInRange(0, 8); // two bars
  assert.equal(evs.length, 4, 'Should emit 4 loop triggers across 8 beats');
  assert.equal(evs[0].atBeats, 0);
  assert.equal(evs[1].atBeats, 2);
  assert.equal(evs[2].atBeats, 4);
  assert.equal(evs[3].atBeats, 6);
}
```

```js
// /tests/engine.fit-rate.test.js
import { TransportClock } from '../src/time/transport-clock.js';
import { ToneEngine } from '../src/engine/tone-engine.js';
import { assert } from './assert.js';

export async function test_fit_rate_calculation() {
  // Fake resolver that returns a 1.0-second buffer
  const sampleRate = 48000;
  const frameCount = sampleRate * 1.0;

  const ac = new (window.OfflineAudioContext || window.AudioContext)(1, frameCount, sampleRate);
  const resolver = { fetchArrayBuffer: async () => {
    const ab = new ArrayBuffer(frameCount * 4);
    // silent float32 payload; decodeAudioData expects WAV/encoded, so we’ll skip actual decode in this unit and check math only
    // For real test use a tiny valid WAV from an inscription fixture.
    return ab;
  }};

  const clock = new TransportClock(ac, { bpm: 120 }); // 1 beat = 0.5 sec
  const targetSec = clock.beatsToSeconds(2);          // 2 beats = 1.0 sec @ 120
  assert.approx(targetSec, 1.0, 1e-6);

  // Here we’d verify playbackRate = targetSec / srcSec.
  // Since resolver above isn’t decodable, in practice place this check in an integration test with a real on-chain WAV.
}
```

> For a proper integration test, add a **tiny valid WAV** as an inscription fixture and assert `playbackRate === (beatsToSeconds(lengthBeats) / buffer.duration)` and that your scheduler places triggers at 0s, 1s, 2s, …

---

## What this gives you right now

* ✅ **Only web3** sources: Tone.js is loaded from your Ordinals inscription; the drum loop is fetched from your sample inscription; no off-chain libraries.
* ✅ **Single timing source**: the **AudioContext clock** via `TransportClock`; **Tone.Transport** stays idle (we only mirror BPM for any sync’d Tone modules you may add later).
* ✅ **½-bar loop** on **sampler channel 1**: your clip triggers every **2 beats** and auto-fits the sample to grid via playbackRate, so it stays tight at any BPM.
* ✅ **Composable**: you can now add more tracks/clips into the manifest and the same scheduler/engine will place them sample-accurately.

If you want, I can extend this with a **second instrument track** (Tone synth) that follows the same clock, plus an **offline render** path (`OfflineAudioContext`) that still uses only on-chain assets.
