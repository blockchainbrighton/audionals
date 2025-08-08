// Headless, de-clicked drone synth with instant preset switching via crossfade.
export class OscSynth {
  /**
   * @param {typeof Tone} Tone
   * @param {object} preset
   */
  constructor(Tone, preset){
    if (!Tone) throw new Error('OscSynth requires Tone');
    this.Tone = Tone;
    this._disposed = false;

    // Audio nodes
    const T = Tone;
    this._gainA = new T.Gain(0).toDestination();
    this._gainB = new T.Gain(0).toDestination();
    this._xf = new T.CrossFade(0);
    this._xf.a.connect(this._gainA);
    this._xf.b.connect(this._gainB);
    this._out = new T.Gain(1);
    this._xf.connect(this._out);
    this._out.connect(T.Destination);

    // Analyser for visuals (mono)
    this._an = new T.Analyser('waveform', 1024);
    this._out.connect(this._an);

    // Two lanes for seamless swapping
    this._laneA = this._buildLane();
    this._laneB = this._buildLane();

    this._activeLane = 'A';
    this._noteFreq = null;

    // Initialize
    this.setPreset(preset, true);
  }

  _clamp(x,min,max){ return Math.max(min, Math.min(max, x)); }

  _buildLane(){
    const T = this.Tone;
    const osc1 = new T.Oscillator({ type:'sine', frequency:220, detune:0 }).start();
    const osc2 = new T.Oscillator({ type:'triangle', frequency:220, detune:0 }).start();
    const mix = new T.Gain(0.5);

    const sum = new T.Gain(1);
    osc1.connect(sum);
    osc2.connect(sum);

    const filter = new T.Filter({ type:'lowpass', frequency: 2000, Q: 0.7 });
    const vca = new T.Gain(0);
    const out = new T.Gain(1);

    // LFOs
    const lfoA = new T.LFO({ frequency:0.2, min:0, max:1 });
    const lfoB = new T.LFO({ frequency:1.0, min:0, max:1 });
    lfoA.connect(filter.frequency);
    lfoB.connect(vca.gain);
    lfoA.start(); lfoB.start();

    // Wiring
    sum.connect(mix);
    mix.connect(filter);
    filter.connect(vca);
    vca.connect(out);

    return { osc1, osc2, mix, sum, filter, vca, out, lfoA, lfoB };
  }

  /** Smoothly swap to a new preset (instant for first load). */
  setPreset(preset, instant=false){
    if (this._disposed) return;
    const p = preset || {};
    const T = this.Tone;

    const laneFrom = this._activeLane === 'A' ? this._laneA : this._laneB;
    const laneTo   = this._activeLane === 'A' ? this._laneB : this._laneA;

    // Configure laneTo
    const freq = this._clamp(p.freq ?? 220, 40, 8000);
    laneTo.osc1.type = p.oscA?.type ?? 'sine';
    laneTo.osc2.type = p.oscB?.type ?? 'triangle';
    laneTo.osc1.frequency.rampTo(freq, instant?0:0.02);
    laneTo.osc2.frequency.rampTo(freq, instant?0:0.02);
    laneTo.osc1.detune.rampTo(p.oscA?.detune ?? 0, 0.02);
    laneTo.osc2.detune.rampTo(p.oscB?.detune ?? 0, 0.02);
    laneTo.mix.gain.rampTo(this._clamp(p.oscB?.mix ?? 0.5, 0, 1), 0.02);

    const fFreq = this._clamp(p.filter?.frequency ?? 1800, 120, 10000);
    const fQ = this._clamp(p.filter?.Q ?? 0.8, 0.2, 12);
    laneTo.filter.set({ type: p.filter?.type ?? 'lowpass', Q: fQ });
    laneTo.filter.frequency.rampTo(fFreq, 0.05);

    laneTo.lfoA.set({ type: p.lfoA?.type ?? 'sine' });
    laneTo.lfoB.set({ type: p.lfoB?.type ?? 'triangle' });
    laneTo.lfoA.frequency.rampTo(this._clamp(p.lfoA?.freq ?? 0.2, 0.005, 5), 0.05);
    laneTo.lfoB.frequency.rampTo(this._clamp(p.lfoB?.freq ?? 0.8, 0.02, 12), 0.05);
    laneTo.lfoB.min = 0; laneTo.lfoB.max = this._clamp(p.lfoB?.depth ?? 0.3, 0.02, 0.95);

    // Amplitude guardrails to avoid silence and clipping
    const gain = this._clamp(p.amp?.gain ?? 0.7, 0.05, 0.95);
    laneTo.vca.gain.rampTo(gain, instant?0:0.02);

    // Switch crossfade target
    const xf = this._xf;
    if (instant){
      xf.fade.value = this._activeLane === 'A' ? 1 : 0;
    } else {
      // Short crossfade to avoid clicks
      const target = this._activeLane === 'A' ? 1 : 0;
      xf.fade.rampTo(target, 0.035);
    }

    // Connect lanes to crossfade
    laneTo.out.disconnect();
    laneFrom.out.disconnect();
    if (this._activeLane === 'A'){
      laneTo.out.connect(this._xf.b);
      laneFrom.out.connect(this._xf.a);
      this._activeLane = 'B';
    } else {
      laneTo.out.connect(this._xf.a);
      laneFrom.out.connect(this._xf.b);
      this._activeLane = 'A';
    }

    this._preset = p;
  }

  noteOn(freq){
    if (this._disposed) return;
    const f = this._clamp(freq || this._preset?.freq || 220, 40, 12000);
    const lane = this._activeLane === 'A' ? this._laneA : this._laneB;
    lane.osc1.frequency.rampTo(f, 0.002);
    lane.osc2.frequency.rampTo(f, 0.002);
    // Tiny gain nudge to ensure audibility without clicks
    const g = lane.vca.gain.value;
    lane.vca.gain.rampTo(Math.max(g, 0.12), 0.005);
  }

  noteOff(){
    if (this._disposed) return;
    const lane = this._activeLane === 'A' ? this._laneA : this._laneB;
    lane.vca.gain.rampTo(Math.max(0.08, (this._preset?.amp?.gain??0.6)*0.6), 0.03);
  }

  connect(dest){ this._out.connect(dest); }
  getAnalyser(){ return this._an; }

  dispose(){
    if (this._disposed) return;
    const all = [this._laneA,this._laneB];
    for (const L of all){
      try {
        L.osc1.dispose(); L.osc2.dispose(); L.mix.dispose(); L.sum.dispose();
        L.filter.dispose(); L.vca.dispose(); L.out.dispose(); L.lfoA.dispose(); L.lfoB.dispose();
      } catch{}
    }
    try{ this._an.dispose(); }catch{}
    try{ this._out.dispose(); }catch{}
    try{ this._xf.dispose(); }catch{}
    try{ this._gainA.dispose(); this._gainB.dispose(); }catch{}
    this._disposed = true;
  }
}
window.OscSynth = OscSynth;
export default OscSynth;