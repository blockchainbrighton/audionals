// src/BopVstHost.js
import { BopEngine } from './BopEngine.js';

export class BopVstHost {
  constructor({ sampleRate = 44100, bufferSize = 128, maxPolyphony = 16 } = {}) {
    this.sampleRate = sampleRate;
    this.bufferSize = bufferSize;

    // private engine instance
    this._engine = new BopEngine({
      Tone: null,                // we’ll polyfill later
      outputNode: null
    });

    this._paramCache = new Map(); // 0-1 normalized values
    this._voices = new Map();     // midiNote -> voiceId
  }

  /* ---------- Audio ---------- */
  setSampleRate(sr) { this.sampleRate = sr; }
  setBlockSize(bs) { this.bufferSize = bs; }

  // Very small dummy process: in a real VST this would fill the output buffers
  process(inputs, outputs) {
    // outputs[0] and [1] are Float32Array[bufferSize]
    const outL = outputs[0];
    const outR = outputs[1] || outL;
    for (let i = 0; i < outL.length; i++) {
      outL[i] = 0;    // silence for now
      if (outR !== outL) outR[i] = 0;
    }
  }

  /* ---------- Parameters ---------- */
  setParameter(id, value01) {
    this._paramCache.set(id, value01);
    // map 0-1 to real range inside engine
    this._engine.setParameter(id, value01);
  }
  getParameter(id) {
    return this._paramCache.get(id) ?? 0;
  }

  /* ---------- MIDI ---------- */
  noteOn(midi, velocity = 0.8) {
    // stub: allocate voice, trigger engine
    this._voices.set(midi, Date.now());
    this._engine.noteOn(midi, velocity);
  }
  noteOff(midi) {
    if (this._voices.has(midi)) {
      this._voices.delete(midi);
      this._engine.noteOff(midi);
    }
  }

  /* ---------- State ---------- */
  saveState() {
    return {
      parameters: Object.fromEntries(this._paramCache),
      voices: [...this._voices.keys()]
    };
  }
  loadState(obj) {
    if (obj.parameters) {
      for (const [k, v] of Object.entries(obj.parameters)) {
        this.setParameter(k, v);
      }
    }
  }
}

// Parameter schema (static helper)
export const ParamSchema = [
  { id: 'osc1.type',   name: 'Osc Type',   type: 'enum',  min:0, max:5, labels:['sine','triangle','saw','square','fatsaw','fatsquare'] },
  { id: 'filter.cut',  name: 'Cutoff',     type: 'float', min:20, max:20000, log:true },
  { id: 'filter.res',  name: 'Resonance',  type: 'float', min:0.1, max:18 },
  { id: 'env.attack',  name: 'Attack',     type: 'float', min:0.001, max:10, log:true },
  { id: 'env.release', name: 'Release',    type: 'float', min:0.001, max:10, log:true },
  { id: 'master.vol',  name: 'Volume',     type: 'float', min:0, max:1 },
  { id: 'reverb.wet',  name: 'Reverb',     type: 'float', min:0, max:1 }
];