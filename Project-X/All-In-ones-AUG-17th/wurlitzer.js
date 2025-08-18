// wurlitzer.js - Warm, gritty Wurlitzer 200A emulation

export default function createWurlitzer(ctx) {
  const master = ctx.createGain();
  master.gain.value = 0.8;
  master.connect(ctx.destination);

  // Pre-filter: high-pass to simulate speaker box
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 120;

  // Overdrive section
  const driveGain = ctx.createGain();
  const ws = ctx.createWaveShaper();
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 4800;

  // Chorus: single LFO modulating delay
  const chorusDelay = ctx.createDelay(1);
  chorusDelay.delayTime.value = 0.004;
  const chorusLFO = ctx.createOscillator();
  const chorusGain = ctx.createGain();
  chorusLFO.type = 'triangle';
  chorusLFO.frequency.value = 3.5;
  chorusGain.gain.value = 0.003;
  chorusLFO.connect(chorusGain).connect(chorusDelay.delayTime);
  chorusLFO.start();

  // Reverb send
  const reverbSend = ctx.createGain();
  reverbSend.gain.value = 0.3;

  // Routing
  driveGain.connect(ws).connect(lp).connect(hp);
  hp.connect(master);
  hp.connect(chorusDelay).connect(master);
  hp.connect(reverbSend);

  // Drive curve
  function makeCurve(amount) {
    const k = 20 * amount + 1;
    const n = 256;
    const curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1;
      curve[i] = (1 + k) * x / (1 + k * Math.abs(x));
    }
    return curve;
  }

  // Parameters
  const params = {
    level: 0.85,
    attack: 0.008,
    release: 0.3,
    drive: 0.6,
    chorusDepth: 0.7,
    chorusRate: 3.5,
    reverb: 0.3,
    brightness: 0.6,
    keyClick: 0.15,
  };

  const paramsSchema = [
    { key: 'level', label: 'Level', type: 'range', min: 0, max: 1, step: 0.01 },
    { key: 'attack', label: 'Attack (s)', type: 'range', min: 0.001, max: 0.05, step: 0.001 },
    { key: 'release', label: 'Release (s)', type: 'range', min: 0.1, max: 1.5, step: 0.01 },
    { key: 'drive', label: 'Drive', type: 'range', min: 0, max: 1, step: 0.01 },
    { key: 'brightness', label: 'Brightness', type: 'range', min: 0, max: 1, step: 0.01 },
    { key: 'chorusDepth', label: 'Chorus Depth', type: 'range', min: 0, max: 1, step: 0.01 },
    { key: 'chorusRate', label: 'Chorus Rate', type: 'range', min: 0.5, max: 8, step: 0.1 },
    { key: 'reverb', label: 'Reverb Send', type: 'range', min: 0, max: 1, step: 0.01 },
    { key: 'keyClick', label: 'Key Click', type: 'range', min: 0, max: 0.5, step: 0.01 },
  ];

  function applyParams() {
    master.gain.value = params.level;
    ws.curve = makeCurve(params.drive);
    chorusGain.gain.value = 0.001 + params.chorusDepth * 0.008;
    chorusLFO.frequency.value = params.chorusRate;
    lp.frequency.value = 2000 + params.brightness * 2800;
    reverbSend.gain.value = params.reverb;
  }

  function setParams(next) { Object.assign(params, next); applyParams(); }

  // Click noise buffer
  const clickBuf = (function () {
    const n = ctx.sampleRate * 0.03;
    const b = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < n; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (n * 0.2));
    }
    return b;
  })();

  function noteOn(midi, t = ctx.currentTime, dur = 0.25, vel = 1) {
    const freq = 440 * Math.pow(2, (midi - 69) / 12);
    const v = vel * 1.3;

    // Main oscillator: sawtooth with formant-like filtering
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    osc.start(t);

    // Key click
    if (params.keyClick > 0) {
      const click = ctx.createBufferSource();
      click.buffer = clickBuf;
      const clickGain = ctx.createGain();
      clickGain.gain.setValueAtTime(params.keyClick * v * 0.8, t);
      clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.02);
      click.connect(clickGain).connect(driveGain);
      click.start(t);
    }

    // VCA with envelope
    const vca = ctx.createGain();
    vca.gain.setValueAtTime(0, t);
    vca.gain.linearRampToValueAtTime(v * 0.7, t + params.attack);
    vca.gain.setTargetAtTime(0.001, t + params.attack, 0.1);
    const holdEnd = t + Math.max(dur, 0.1);
    vca.gain.setValueAtTime(v * 0.02, holdEnd);
    vca.gain.setTargetAtTime(0, holdEnd, params.release);

    osc.connect(vca).connect(driveGain);

    const stopTime = holdEnd + params.release * 3;
    osc.stop(stopTime);
  }

  applyParams();

  return {
    noteOn,
    setParams,
    getParams: () => ({ ...params }),
    paramsSchema,
    output: master,
    reverbSend,
  };
}