// js/FX/reverb.js

import { ctx } from '../audio.js';

function createImpulseResponse(duration, decay) {
  const sampleRate = ctx.sampleRate;
  const length = sampleRate * duration;
  const impulse = ctx.createBuffer(2, length, sampleRate);
  const [left, right] = [impulse.getChannelData(0), impulse.getChannelData(1)];
  const tau = decay / 6.907; // Time constant for 60 dB decay
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const envelope = Math.exp(-t / tau);
    const value = (Math.random() * 2 - 1) * envelope;
    left[i] = value;
    right[i] = value;
  }
  return impulse;
}

export class ReverbFX {
  constructor() {
    this.input = ctx.createGain();
    this.output = ctx.createGain();
    this.preDelay = ctx.createDelay(0.5);
    this.convolver = ctx.createConvolver();
    this.wetGain = ctx.createGain();
    this.dryGain = ctx.createGain();

    this.decay = 2.0;
    this.mix = 0.5;
    this.lastMix = this.mix;
    this.active = false;
    this.preDelayTime = 0.05; // Default pre-delay

    this.convolver.buffer = createImpulseResponse(this.decay * 2, this.decay);
    this.input.connect(this.dryGain).connect(this.output);
    this.input.connect(this.preDelay).connect(this.convolver).connect(this.wetGain).connect(this.output);

    this.preDelay.delayTime.setValueAtTime(this.preDelayTime, ctx.currentTime);
    this.updateMix();
    this.toggle(false);
  }

  updateMix() {
    const now = ctx.currentTime;
    this.wetGain.gain.setValueAtTime(this.active ? this.mix : 0, now);
    this.dryGain.gain.setValueAtTime(this.active ? 1 - this.mix : 1, now);
  }

  setDecay(decay) {
    this.decay = decay;
    this.convolver.buffer = createImpulseResponse(decay * 2, decay);
  }

  setMix(mix) {
    this.mix = mix;
    this.lastMix = mix;
    this.updateMix();
  }

  toggle(active) {
    this.active = active;
    this.updateMix();
  }
}



/*
<details>
<summary>js/FX/reverb.js Summary</summary>

### Module Role
Implements a reverb effect using a convolver node with a generated impulse response. Provides adjustable decay time and wet/dry mix, with a pre-delay for added depth.

### Dependencies
- `../audio.js`: `{ ctx }` - Audio context for Web Audio API nodes.

### Exported Definitions
- `ReverbFX`: Class - Reverb effect with impulse response and pre-delay.

### Local Definitions
- `createImpulseResponse(duration, decay)`: Function - Generates stereo impulse response buffer with exponential decay.

### Class: ReverbFX
#### Constructor
- `constructor()`:
  - Initializes audio nodes: `input`, `output`, `preDelay`, `convolver`, `wetGain`, `dryGain`.
  - Sets defaults: `decay` (2.0s), `mix` (0.5), `preDelayTime` (0.05s).
  - Generates initial impulse response (`decay * 2`, `decay`) for `convolver`.
  - Routes signal: input -> `dryGain` -> output; input -> `preDelay` -> `convolver` -> `wetGain` -> output.
  - Sets initial pre-delay and mix.

#### Properties
- Audio nodes: `input`, `output`, `preDelay`, `convolver`, `wetGain`, `dryGain`.
- Parameters: `decay`, `mix`, `lastMix`, `active`, `preDelayTime`.

#### Methods
- `updateMix()`: Updates `wetGain` and `dryGain` based on `active` and `mix`.
- `setDecay(decay)`: Sets `decay` and regenerates impulse response.
- `setMix(mix)`: Sets `mix`, stores `lastMix`, and updates mix.
- `toggle(active)`: Toggles effect on/off and updates mix.

### Audio Flow
- Dry: input -> `dryGain` -> output.
- Wet: input -> `preDelay` -> `convolver` -> `wetGain` -> output.

### Potential Optimizations
- **Impulse Generation**: `createImpulseResponse` runs on instantiation and `setDecay`; could cache or precompute common values.
- **Pre-Delay**: Fixed max delay (0.5s) and static default (0.05s); could be adjustable.
- **Node Efficiency**: Simple chain (6 nodes); minimal overhead, but pre-delay could be optional.
- **Mix Updates**: Repeated `setValueAtTime` calls in `updateMix`; could optimize with fewer updates.
- **Decay Scaling**: Impulse duration (`decay * 2`) arbitrary; could be parameterized or tested for efficiency.

</summary>
</details>
*/