// js/FX/delays.js

import { ctx } from '../audio.js';

export class DelayFX {
  constructor() {
    this.input = ctx.createGain();
    this.output = ctx.createGain();
    this.splitter = ctx.createChannelSplitter(2);
    this.merger = ctx.createChannelMerger(2);
    this.leftDelay = ctx.createDelay(5.0);
    this.rightDelay = ctx.createDelay(5.0);
    this.feedback = ctx.createGain();
    this.feedbackFilter = ctx.createBiquadFilter();
    this.wetGain = ctx.createGain();
    this.dryGain = ctx.createGain();
    this.lfo = ctx.createOscillator();
    this.lfoAmp = ctx.createGain();
    this.lfoDepth = ctx.createGain();

    this.delayTime = 0.5;
    this.feedbackValue = 0.4;
    this.mix = 0.5;
    this.lastMix = this.mix;
    this.active = false;
    this.lfoFrequency = 0.5; // Default LFO rate
    this.lfoDepthValue = 0.05; // Default LFO depth

    this.feedbackFilter.type = "lowpass";
    this.feedbackFilter.frequency.value = 2000; // Default cutoff frequency

    this.lfo.frequency.value = this.lfoFrequency;
    this.lfo.type = "sine";
    this.lfoDepth.gain.value = this.lfoDepthValue;
    this.lfoAmp.gain.value = 0; // LFO off by default

    // Signal routing
    this.input.connect(this.dryGain).connect(this.output);
    this.input.connect(this.splitter);
    this.splitter.connect(this.leftDelay, 0);
    this.splitter.connect(this.rightDelay, 1);
    this.leftDelay.connect(this.feedbackFilter);
    this.rightDelay.connect(this.feedbackFilter);
    this.feedbackFilter.connect(this.feedback);
    this.feedback.connect(this.leftDelay);
    this.feedback.connect(this.rightDelay);
    this.leftDelay.connect(this.merger, 0, 0);
    this.rightDelay.connect(this.merger, 0, 1);
    this.merger.connect(this.wetGain).connect(this.output);

    // LFO routing
    this.lfo.connect(this.lfoAmp);
    this.lfoAmp.connect(this.lfoDepth);
    this.lfoDepth.connect(this.leftDelay.delayTime);
    this.lfoDepth.connect(this.rightDelay.delayTime);
    this.lfo.start();

    this.updateParameters();
    this.toggle(false);
  }

  updateParameters() {
    const now = ctx.currentTime;
    this.leftDelay.delayTime.setValueAtTime(this.delayTime, now);
    this.rightDelay.delayTime.setValueAtTime(this.delayTime + 0.1, now); // Stereo offset
    this.feedback.gain.setValueAtTime(this.feedbackValue, now);
    this.wetGain.gain.setValueAtTime(this.active ? this.mix : 0, now);
    this.dryGain.gain.setValueAtTime(this.active ? 1 - this.mix : 1, now);
  }

  setDelayTime(time) {
    this.delayTime = time;
    this.updateParameters();
  }

  setFeedback(value) {
    this.feedbackValue = value;
    this.updateParameters();
  }

  setMix(mix) {
    this.mix = mix;
    this.lastMix = mix;
    this.updateParameters();
  }

  toggle(active) {
    this.active = active;
    this.updateParameters();
  }
}




/*
<details>
<summary>js/FX/delay.js Summary</summary>

### Module Role
Implements a stereo delay effect with LFO modulation using the Web Audio API. Provides adjustable delay time, feedback, and wet/dry mix, with an optional LFO for delay time variation.

### Dependencies
- `../audio.js`: `{ ctx }` - Audio context for Web Audio API nodes.

### Exported Definitions
- `DelayFX`: Class - Stereo delay effect with LFO modulation.

### Class: DelayFX
#### Constructor
- `constructor()`:
  - Initializes audio nodes: `input`, `output`, `splitter`, `merger`, `leftDelay`, `rightDelay`, `feedback`, `feedbackFilter`, `wetGain`, `dryGain`, `lfo`, `lfoAmp`, `lfoDepth`.
  - Sets defaults: `delayTime` (0.5s), `feedbackValue` (0.4), `mix` (0.5), `lfoFrequency` (0.5Hz), `lfoDepthValue` (0.05).
  - Configures `feedbackFilter` as lowpass (2000Hz) and `lfo` as sine wave (off by default).
  - Routes signal: input -> dry -> output; input -> splitter -> left/right delays -> feedback loop -> merger -> wet -> output.
  - Routes LFO: `lfo` -> `lfoAmp` -> `lfoDepth` -> delay times.
  - Starts LFO and sets initial parameters.

#### Properties
- Audio nodes: `input`, `output`, `splitter`, `merger`, `leftDelay`, `rightDelay`, `feedback`, `feedbackFilter`, `wetGain`, `dryGain`, `lfo`, `lfoAmp`, `lfoDepth`.
- Parameters: `delayTime`, `feedbackValue`, `mix`, `lastMix`, `active`, `lfoFrequency`, `lfoDepthValue`.

#### Methods
- `updateParameters()`: Updates delay times (stereo offset +0.1s), feedback, and wet/dry gains based on `active` and `mix`.
- `setDelayTime(time)`: Sets `delayTime` and updates parameters.
- `setFeedback(value)`: Sets `feedbackValue` and updates parameters.
- `setMix(mix)`: Sets `mix`, stores `lastMix`, and updates parameters.
- `toggle(active)`: Toggles effect on/off and updates parameters.

### Audio Flow
- Dry: input -> `dryGain` -> output.
- Wet: input -> `splitter` -> `leftDelay`/`rightDelay` -> `feedbackFilter` -> `feedback` (loop) -> `merger` -> `wetGain` -> output.
- LFO: `lfo` -> `lfoAmp` -> `lfoDepth` -> `leftDelay.delayTime`/`rightDelay.delayTime`.

### Potential Optimizations
- **LFO Usage**: LFO runs constantly but is muted (`lfoAmp.gain.value = 0`); could start/stop dynamically.
- **Stereo Offset**: Hardcoded 0.1s offset in `rightDelay`; could be configurable.
- **Parameter Updates**: Repeated `setValueAtTime` calls in `updateParameters`; could batch or debounce.
- **Node Overhead**: Many nodes (13) per instance; could simplify for basic delay use cases.
- **Feedback Filter**: Static lowpass at 2000Hz; could be adjustable or optional.

</summary>
</details>
*/