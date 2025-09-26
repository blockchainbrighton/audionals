import {ctx} from'./audio.js';
export class FMSynth{
  constructor(carrierWaveform,modulators,adsr){
    this.carrier=ctx.createOscillator(); this.carrier.type=carrierWaveform;
    this.envelope=ctx.createGain(); this.envelope.gain.value=0;
    this.carrier.connect(this.envelope);
    this.modulators=modulators.map(({waveform,ratio,depth,enabled=true})=>{
      const osc=ctx.createOscillator(); osc.type=waveform;
      const gain=ctx.createGain(); gain.gain.value=depth;
      osc.connect(gain); gain.connect(this.carrier.frequency);
      return {osc,ratio,gain,enabled,oscStarted:false};
    });
    this.adsr={...adsr}; this.isActive=false;
  }
  connect(dest){this.envelope.connect(dest);}
  triggerAttack(freq){
    const now=ctx.currentTime; this.carrier.frequency.value=freq;
    this.modulators.forEach(mod=>{
      if(mod.enabled){ mod.osc.frequency.value=freq*mod.ratio; mod.osc.start(now); mod.oscStarted=true; }
    });
    this.envelope.gain.cancelScheduledValues(now);
    this.envelope.gain.setValueAtTime(0,now);
    this.envelope.gain.linearRampToValueAtTime(1,now+this.adsr.attack);
    this.envelope.gain.setTargetAtTime(this.adsr.sustain,now+this.adsr.attack,this.adsr.decay/3);
    this.carrier.start(now); this.isActive=true;
  }
  triggerRelease(){
    if(!this.isActive)return; 
    const now=ctx.currentTime;
    this.envelope.gain.cancelScheduledValues(now);
    this.envelope.gain.setTargetAtTime(0,now,this.adsr.release/3);
    const stopTime=now+this.adsr.release+0.1;
    this.envelope.gain.setValueAtTime(0,stopTime);
    this.carrier.stop(stopTime);
    this.modulators.forEach(mod=>{
      if(mod.enabled&&mod.oscStarted){ mod.osc.stop(stopTime); mod.oscStarted=false; }
    });
    setTimeout(()=>{
      this.carrier.disconnect();
      this.envelope.disconnect();
      this.modulators.forEach(mod=>{
        if(mod.enabled){ mod.osc.disconnect(); mod.gain.disconnect(); }
      });
      this.isActive=false;
    },(stopTime-now)*1000+50);
  }
  updateCarrierWaveform(waveform){this.carrier.type=waveform;}
  addModulator({waveform,ratio,depth,enabled=true}){
    const osc=ctx.createOscillator(); osc.type=waveform;
    const gain=ctx.createGain(); gain.gain.value=depth;
    osc.connect(gain); gain.connect(this.carrier.frequency);
    const mod={osc,ratio,gain,enabled,oscStarted:false};
    this.modulators.push(mod);
    if(this.isActive&&enabled){ osc.frequency.value=this.carrier.frequency.value*ratio; osc.start(ctx.currentTime); mod.oscStarted=true; }
  }
  removeModulator(index){
    if(index<0||index>=this.modulators.length)return;
    const mod=this.modulators[index];
    if(mod.enabled&&mod.oscStarted){ mod.osc.stop(ctx.currentTime); mod.osc.disconnect(); mod.gain.disconnect(); mod.oscStarted=false; }
    this.modulators.splice(index,1);
  }
  updateModulator(index,{waveform,ratio,depth,enabled}){
    if(index<0||index>=this.modulators.length)return;
    const mod=this.modulators[index],now=ctx.currentTime;
    mod.osc.type=waveform; mod.ratio=ratio;
    if(this.isActive&&enabled) mod.osc.frequency.setValueAtTime(this.carrier.frequency.value*ratio,now);
    mod.gain.gain.cancelScheduledValues(now);
    mod.gain.gain.setValueAtTime(depth,now);
    if(mod.enabled!==enabled){
      mod.enabled=enabled;
      if(this.isActive){
        if(enabled&&!mod.oscStarted){ mod.osc.frequency.value=this.carrier.frequency.value*ratio; mod.osc.start(now); mod.oscStarted=true; }
        else if(!enabled&&mod.oscStarted){ mod.osc.stop(now); mod.oscStarted=false; }
      }
    }
  }
  updateADSR({attack,decay,sustain,release}){
    const now=ctx.currentTime; this.adsr={attack,decay,sustain,release};
    if(this.isActive){
      this.envelope.gain.cancelScheduledValues(now);
      const currentGain=this.envelope.gain.value;
      currentGain>sustain
        ? (this.envelope.gain.setValueAtTime(currentGain,now),
           this.envelope.gain.setTargetAtTime(sustain,now,decay/3))
        : this.envelope.gain.setValueAtTime(currentGain,now);
    }
  }
}



/*
<details>
<summary>fmSynth.js Summary</summary>

### Module Role
Implements an FM (Frequency Modulation) synthesizer class using the Web Audio API. Manages a carrier oscillator, multiple modulator oscillators, and an ADSR envelope to generate and control sound based on preset configurations.

### Dependencies
- `./audio.js`: `{ ctx }` - Audio context for Web Audio API nodes.

### Exported Definitions
- `FMSynth`: Class - FM synthesizer with methods for sound generation and manipulation.

### Class: FMSynth
#### Constructor
- `constructor(carrierWaveform, modulators, adsr)`:
  - Initializes carrier oscillator (`this.carrier`), envelope gain (`this.envelope`), and modulator array (`this.modulators`).
  - Sets `this.carrier.type` to `carrierWaveform` and `this.envelope.gain.value` to 0.
  - Maps `modulators` to objects with oscillator (`osc`), gain (`gain`), and state (`enabled`, `oscStarted`).
  - Copies `adsr` to `this.adsr` and sets `this.isActive` to false.

#### Properties
- `carrier`: OscillatorNode - Main sound source.
- `envelope`: GainNode - Controls amplitude with ADSR.
- `modulators`: Array - Modulator objects (`osc`, `ratio`, `gain`, `enabled`, `oscStarted`).
- `adsr`: Object - Envelope settings (`attack`, `decay`, `sustain`, `release`).
- `isActive`: Boolean - Tracks whether the synth is playing.

#### Methods
- `connect(dest)`: Connects `this.envelope` to an audio destination.
- `triggerAttack(freq)`: Starts the synth:
  - Sets carrier frequency, starts modulators if enabled, and applies ADSR attack/decay/sustain.
- `triggerRelease()`: Stops the synth:
  - Applies ADSR release, stops carrier/modulators, and cleans up connections after delay.
- `updateCarrierWaveform(waveform)`: Updates `this.carrier.type`.
- `addModulator({waveform, ratio, depth, enabled})`: Adds a modulator:
  - Creates and connects new oscillator/gain, starts it if synth is active and enabled.
- `removeModulator(index)`: Removes a modulator:
  - Stops and disconnects if active, then splices from array.
- `updateModulator(index, {waveform, ratio, depth, enabled})`: Updates a modulator:
  - Adjusts properties, starts/stops oscillator based on `enabled` state if active.
- `updateADSR({attack, decay, sustain, release})`: Updates `this.adsr`:
  - Applies new envelope settings, adjusts gain if active.

### Audio Flow
- Carrier -> Envelope -> Destination (via `connect`).
- Modulators -> Carrier.frequency (FM modulation).

### Potential Optimizations
- **Node Cleanup**: `triggerRelease` disconnects nodes after a timeout; could leak if interrupted—consider immediate cleanup or a dispose method.
- **ADSR Scheduling**: Repeated `cancelScheduledValues` calls could be consolidated or optimized with fewer updates.
- **Modulator Management**: Array-based modulators with dynamic add/remove could use a Map for better indexing efficiency.
- **Redundant Starts**: Modulators restart unnecessarily if `enabled` toggles during playback; could track state more precisely.
- **Magic Numbers**: `decay/3`, `release/3`, `+0.1`, `+50` in timing calculations could be parameterized.
- **Memory Usage**: Inactive synths retain node references until timeout; could free resources sooner.

</summary>
</details>
*/