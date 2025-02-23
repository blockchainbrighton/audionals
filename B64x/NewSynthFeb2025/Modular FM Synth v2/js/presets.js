// presets.js

export const presets = [
  {name:'Classic Bell',carrierWaveform:'sine',modulators:[{waveform:'sine',ratio:2,depth:200,enabled:true}],adsr:{attack:0.01,decay:0.2,sustain:0.1,release:0.5},lfoEnabled:false,lfoRate:0,lfoDepth:0,lfoWaveform:'sine',lfoDelay:0,lfoRamp:0,filterType:'lowpass',cutoffFrequency:1000,resonance:1},
  {name:'Bright Bell',carrierWaveform:'sine',modulators:[{waveform:'square',ratio:3,depth:150,enabled:true}],adsr:{attack:0.02,decay:0.3,sustain:0.2,release:0.6},lfoEnabled:false,lfoRate:0,lfoDepth:0,lfoWaveform:'sine',lfoDelay:0,lfoRamp:0,filterType:'lowpass',cutoffFrequency:1000,resonance:1},
  {name:'Metallic Bell',carrierWaveform:'sawtooth',modulators:[{waveform:'sine',ratio:4,depth:300,enabled:true}],adsr:{attack:0.01,decay:0.25,sustain:0.15,release:0.7},lfoEnabled:false,lfoRate:0,lfoDepth:0,lfoWaveform:'sine',lfoDelay:0,lfoRamp:0,filterType:'lowpass',cutoffFrequency:1000,resonance:1},
  {name:'Deep Bass',carrierWaveform:'triangle',modulators:[{waveform:'sine',ratio:0.5,depth:50,enabled:true}],adsr:{attack:0.01,decay:0.1,sustain:0.8,release:0.1},lfoEnabled:false,lfoRate:0,lfoDepth:0,lfoWaveform:'sine',lfoDelay:0,lfoRamp:0,filterType:'lowpass',cutoffFrequency:1000,resonance:1},
  {name:'Fat Bass',carrierWaveform:'square',modulators:[{waveform:'triangle',ratio:0.25,depth:80,enabled:true}],adsr:{attack:0.02,decay:0.15,sustain:0.9,release:0.2},lfoEnabled:false,lfoRate:0,lfoDepth:0,lfoWaveform:'sine',lfoDelay:0,lfoRamp:0,filterType:'lowpass',cutoffFrequency:1000,resonance:1},
  {name:'Growly Bass',carrierWaveform:'sawtooth',modulators:[{waveform:'square',ratio:0.33,depth:100,enabled:true}],adsr:{attack:0.03,decay:0.2,sustain:0.7,release:0.3},lfoEnabled:false,lfoRate:0,lfoDepth:0,lfoWaveform:'sine',lfoDelay:0,lfoRamp:0,filterType:'lowpass',cutoffFrequency:1000,resonance:1},
  {name:'Bright Lead',carrierWaveform:'sawtooth',modulators:[{waveform:'square',ratio:1,depth:100,enabled:true}],adsr:{attack:0.05,decay:0.1,sustain:0.7,release:0.2},lfoEnabled:false,lfoRate:0,lfoDepth:0,lfoWaveform:'sine',lfoDelay:0,lfoRamp:0,filterType:'lowpass',cutoffFrequency:1000,resonance:1},
  {name:'Smooth Lead',carrierWaveform:'triangle',modulators:[{waveform:'sine',ratio:1.5,depth:70,enabled:true}],adsr:{attack:0.1,decay:0.2,sustain:0.8,release:0.4},lfoEnabled:false,lfoRate:0,lfoDepth:0,lfoWaveform:'sine',lfoDelay:0,lfoRamp:0,filterType:'lowpass',cutoffFrequency:1000,resonance:1},
  {name:'Sharp Lead',carrierWaveform:'square',modulators:[{waveform:'sawtooth',ratio:2,depth:120,enabled:true}],adsr:{attack:0.03,decay:0.15,sustain:0.6,release:0.3},lfoEnabled:false,lfoRate:0,lfoDepth:0,lfoWaveform:'sine',lfoDelay:0,lfoRamp:0,filterType:'lowpass',cutoffFrequency:1000,resonance:1},
  {name:'Warm Pad',carrierWaveform:'sine',modulators:[{waveform:'sine',ratio:0.5,depth:30,enabled:true}],adsr:{attack:0.5,decay:0.3,sustain:0.9,release:1},lfoEnabled:false,lfoRate:0,lfoDepth:0,lfoWaveform:'sine',lfoDelay:0,lfoRamp:0,filterType:'lowpass',cutoffFrequency:1000,resonance:1},
  {name:'Ethereal Pad',carrierWaveform:'triangle',modulators:[{waveform:'sine',ratio:1,depth:40,enabled:true}],adsr:{attack:0.7,decay:0.4,sustain:0.85,release:1.2},lfoEnabled:false,lfoRate:0,lfoDepth:0,lfoWaveform:'sine',lfoDelay:0,lfoRamp:0,filterType:'lowpass',cutoffFrequency:1000,resonance:1},
  {name:'Sweeping Pad',carrierWaveform:'sawtooth',modulators:[{waveform:'triangle',ratio:0.75,depth:50,enabled:true}],adsr:{attack:0.6,decay:0.5,sustain:0.8,release:1.5},lfoEnabled:false,lfoRate:0,lfoDepth:0,lfoWaveform:'sine',lfoDelay:0,lfoRamp:0,filterType:'lowpass',cutoffFrequency:1000,resonance:1},
  {name:'Pluck',carrierWaveform:'sine',modulators:[{waveform:'sine',ratio:3,depth:150,enabled:true}],adsr:{attack:0.01,decay:0.1,sustain:0,release:0.2},lfoEnabled:false,lfoRate:0,lfoDepth:0,lfoWaveform:'sine',lfoDelay:0,lfoRamp:0,filterType:'lowpass',cutoffFrequency:1000,resonance:1},
  {name:'Drum Hit',carrierWaveform:'square',modulators:[{waveform:'sawtooth',ratio:4,depth:200,enabled:true}],adsr:{attack:0.005,decay:0.05,sustain:0,release:0.1},lfoEnabled:false,lfoRate:0,lfoDepth:0,lfoWaveform:'sine',lfoDelay:0,lfoRamp:0,filterType:'lowpass',cutoffFrequency:1000,resonance:1},
  {name:'Snap',carrierWaveform:'triangle',modulators:[{waveform:'square',ratio:5,depth:100,enabled:true}],adsr:{attack:0.005,decay:0.03,sustain:0,release:0.05},lfoEnabled:false,lfoRate:0,lfoDepth:0,lfoWaveform:'sine',lfoDelay:0,lfoRamp:0,filterType:'lowpass',cutoffFrequency:1000,resonance:1},
  {name:'Complex Bell',carrierWaveform:'sine',modulators:[{waveform:'sine',ratio:2,depth:200,enabled:true},{waveform:'square',ratio:4,depth:100,enabled:true}],adsr:{attack:0.01,decay:0.25,sustain:0.1,release:0.6},lfoEnabled:false,lfoRate:0,lfoDepth:0,lfoWaveform:'sine',lfoDelay:0,lfoRamp:0,filterType:'lowpass',cutoffFrequency:1000,resonance:1},
  {name:'Rich Bass',carrierWaveform:'triangle',modulators:[{waveform:'sine',ratio:0.5,depth:60,enabled:true},{waveform:'triangle',ratio:1,depth:40,enabled:true}],adsr:{attack:0.02,decay:0.15,sustain:0.85,release:0.2},lfoEnabled:false,lfoRate:0,lfoDepth:0,lfoWaveform:'sine',lfoDelay:0,lfoRamp:0,filterType:'lowpass',cutoffFrequency:1000,resonance:1},
  {name:'Vibrant Lead',carrierWaveform:'sawtooth',modulators:[{waveform:'square',ratio:1,depth:90,enabled:true},{waveform:'sine',ratio:2,depth:50,enabled:true}],adsr:{attack:0.05,decay:0.2,sustain:0.7,release:0.3},lfoEnabled:false,lfoRate:0,lfoDepth:0,lfoWaveform:'sine',lfoDelay:0,lfoRamp:0,filterType:'lowpass',cutoffFrequency:1000,resonance:1},
  {name:'Pure Sine',carrierWaveform:'sine',modulators:[],adsr:{attack:0.1,decay:0.2,sustain:0.8,release:0.4},lfoEnabled:false,lfoRate:0,lfoDepth:0,lfoWaveform:'sine',lfoDelay:0,lfoRamp:0,filterType:'lowpass',cutoffFrequency:1000,resonance:1},
  {name:'Pure Square',carrierWaveform:'square',modulators:[],adsr:{attack:0.05,decay:0.1,sustain:0.7,release:0.3},lfoEnabled:false,lfoRate:0,lfoDepth:0,lfoWaveform:'sine',lfoDelay:0,lfoRamp:0,filterType:'lowpass',cutoffFrequency:1000,resonance:1},
  {name:'Deep LFO Bell',carrierWaveform:'sine',modulators:[{waveform:'sine',ratio:2,depth:200,enabled:true}],adsr:{attack:0.01,decay:0.2,sustain:0.1,release:0.5},lfoEnabled:true,lfoRate:0.1,lfoDepth:30,lfoWaveform:'sine',lfoDelay:2,lfoRamp:8,filterType:'lowpass',cutoffFrequency:1000,resonance:1},
  {name:'Eternal Vibrato',carrierWaveform:'sawtooth',modulators:[{waveform:'square',ratio:1,depth:150,enabled:true}],adsr:{attack:0.05,decay:0.3,sustain:0.6,release:1},lfoEnabled:true,lfoRate:0.05,lfoDepth:50,lfoWaveform:'triangle',lfoDelay:3,lfoRamp:10,filterType:'lowpass',cutoffFrequency:1000,resonance:1},
  {name:'Oceanic Pulse',carrierWaveform:'triangle',modulators:[{waveform:'sine',ratio:0.8,depth:100,enabled:true}],adsr:{attack:0.3,decay:0.4,sustain:0.8,release:1.2},lfoEnabled:true,lfoRate:0.08,lfoDepth:40,lfoWaveform:'sawtooth',lfoDelay:2.5,lfoRamp:9,filterType:'lowpass',cutoffFrequency:1000,resonance:1},
  {name:'Vibrato Bell',carrierWaveform:'sine',modulators:[{waveform:'sine',ratio:2,depth:200,enabled:true}],adsr:{attack:0.01,decay:0.2,sustain:0.1,release:0.5},lfoEnabled:true,lfoRate:5,lfoDepth:10,lfoWaveform:'sine',lfoDelay:0.5,lfoRamp:2,filterType:'lowpass',cutoffFrequency:1000,resonance:1},
  {name:'Vibrato Lead',carrierWaveform:'sawtooth',modulators:[{waveform:'square',ratio:1,depth:100,enabled:true}],adsr:{attack:0.05,decay:0.1,sustain:0.7,release:0.2},lfoEnabled:true,lfoRate:6,lfoDepth:10,lfoWaveform:'sine',lfoDelay:0.5,lfoRamp:2,filterType:'lowpass',cutoffFrequency:1000,resonance:1},
  {name:'Wobbly Bass',carrierWaveform:'triangle',modulators:[{waveform:'sine',ratio:0.5,depth:150,enabled:true}],adsr:{attack:0.01,decay:0.1,sustain:0.8,release:0.1},lfoEnabled:true,lfoRate:4,lfoDepth:20,lfoWaveform:'triangle',lfoDelay:1,lfoRamp:3,filterType:'lowpass',cutoffFrequency:1000,resonance:1},
  {name:'Shimmering Pad',carrierWaveform:'sine',modulators:[{waveform:'sine',ratio:0.5,depth:30,enabled:true},{waveform:'sine',ratio:1.5,depth:20,enabled:true}],adsr:{attack:0.5,decay:0.3,sustain:0.9,release:1},lfoEnabled:true,lfoRate:0.5,lfoDepth:5,lfoWaveform:'sine',lfoDelay:2,lfoRamp:6,filterType:'lowpass',cutoffFrequency:1000,resonance:1},
  {name:'Percussive Pluck',carrierWaveform:'square',modulators:[{waveform:'sawtooth',ratio:3,depth:200,enabled:true}],adsr:{attack:0.01,decay:0.1,sustain:0,release:0.2},lfoEnabled:false,lfoRate:0,lfoDepth:0,lfoWaveform:'sine',lfoDelay:0,lfoRamp:0,filterType:'lowpass',cutoffFrequency:1000,resonance:1},
  {name:'Metallic Drone',carrierWaveform:'square',modulators:[{waveform:'sine',ratio:7,depth:300,enabled:true}],adsr:{attack:0.3,decay:0.5,sustain:1,release:0.8},lfoEnabled:true,lfoRate:2,lfoDepth:15,lfoWaveform:'sawtooth',lfoDelay:1,lfoRamp:3,filterType:'lowpass',cutoffFrequency:1000,resonance:1},
  {name:'Evolving Sweep',carrierWaveform:'sawtooth',modulators:[{waveform:'triangle',ratio:0.25,depth:50,enabled:true},{waveform:'sine',ratio:2,depth:100,enabled:true}],adsr:{attack:1,decay:0.5,sustain:0.8,release:1.5},lfoEnabled:true,lfoRate:1,lfoDepth:25,lfoWaveform:'triangle',lfoDelay:1.5,lfoRamp:4,filterType:'lowpass',cutoffFrequency:1000,resonance:1},
  {name:'Chiming Echo',carrierWaveform:'sine',modulators:[{waveform:'square',ratio:4,depth:150,enabled:true}],adsr:{attack:0.02,decay:0.3,sustain:0.2,release:0.4},lfoEnabled:true,lfoRate:3,lfoDepth:8,lfoWaveform:'sine',lfoDelay:0.5,lfoRamp:2,filterType:'lowpass',cutoffFrequency:1000,resonance:1},
  {name:'Pulsing Pad',carrierWaveform:'triangle',modulators:[{waveform:'sine',ratio:1.5,depth:80,enabled:true}],adsr:{attack:0.4,decay:0.2,sustain:0.9,release:0.6},lfoEnabled:true,lfoRate:0.8,lfoDepth:12,lfoWaveform:'square',lfoDelay:1,lfoRamp:3,filterType:'lowpass',cutoffFrequency:1000,resonance:1},
  {name:'Glassy Stab',carrierWaveform:'sine',modulators:[{waveform:'sawtooth',ratio:5,depth:250,enabled:true}],adsr:{attack:0.01,decay:0.15,sustain:0,release:0.3},lfoEnabled:false,lfoRate:0,lfoDepth:0,lfoWaveform:'sine',lfoDelay:0,lfoRamp:0,filterType:'lowpass',cutoffFrequency:1000,resonance:1},
  {name:'Symphonic Strings',carrierWaveform:'sawtooth',modulators:[{waveform:'sine',ratio:1,depth:50,enabled:true},{waveform:'sine',ratio:2,depth:30,enabled:true}],adsr:{attack:0.5,decay:0.3,sustain:0.8,release:1},lfoEnabled:false,lfoRate:0,lfoDepth:0,lfoWaveform:'sine',lfoDelay:0,lfoRamp:0,filterType:'lowpass',cutoffFrequency:1000,resonance:1},
  {name:'Brassy Fanfare',carrierWaveform:'square',modulators:[{waveform:'sawtooth',ratio:2,depth:100,enabled:true},{waveform:'sine',ratio:3,depth:50,enabled:true}],adsr:{attack:0.05,decay:0.2,sustain:0.7,release:0.3},lfoEnabled:false,lfoRate:0,lfoDepth:0,lfoWaveform:'sine',lfoDelay:0,lfoRamp:0,filterType:'lowpass',cutoffFrequency:1000,resonance:1},
  {name:'Woodwind Whispers',carrierWaveform:'triangle',modulators:[{waveform:'sine',ratio:1.5,depth:40,enabled:true},{waveform:'triangle',ratio:2.5,depth:20,enabled:true}],adsr:{attack:0.2,decay:0.4,sustain:0.6,release:0.5},lfoEnabled:false,lfoRate:0,lfoDepth:0,lfoWaveform:'sine',lfoDelay:0,lfoRamp:0,filterType:'lowpass',cutoffFrequency:1000,resonance:1},
  {name:'Sweeping Filter',carrierWaveform:'sawtooth',modulators:[{waveform:'sine',ratio:1,depth:100,enabled:true}],adsr:{attack:0.1,decay:0.2,sustain:0.8,release:0.5},lfoEnabled:true,lfoRate:0.5,lfoDepth:50,lfoWaveform:'triangle',lfoDelay:0,lfoRamp:2,filterType:'lowpass',cutoffFrequency:1000,resonance:1},
  {name:'Wobble Bass',carrierWaveform:'square',modulators:[{waveform:'sine',ratio:0.5,depth:150,enabled:true}],adsr:{attack:0.01,decay:0.1,sustain:0.8,release:0.2},lfoEnabled:true,lfoRate:3,lfoDepth:30,lfoWaveform:'sawtooth',lfoDelay:0,lfoRamp:1,filterType:'lowpass',cutoffFrequency:1000,resonance:1},
  {name:'Glassy Ambience',carrierWaveform:'sine',modulators:[{waveform:'triangle',ratio:4,depth:200,enabled:true},{waveform:'sine',ratio:6,depth:100,enabled:true}],adsr:{attack:0.5,decay:0.5,sustain:0.7,release:1.5},lfoEnabled:true,lfoRate:0.1,lfoDepth:10,lfoWaveform:'sine',lfoDelay:2,lfoRamp:5,filterType:'lowpass',cutoffFrequency:1000,resonance:1},
  {name:'Plucked Harp',carrierWaveform:'triangle',modulators:[{waveform:'sine',ratio:2,depth:100,enabled:true}],adsr:{attack:0.01,decay:0.3,sustain:0,release:0.4},lfoEnabled:false,lfoRate:0,lfoDepth:0,lfoWaveform:'sine',lfoDelay:0,lfoRamp:0,filterType:'lowpass',cutoffFrequency:1000,resonance:1},
  {name:'Metallic Clang',carrierWaveform:'sawtooth',modulators:[{waveform:'square',ratio:3.5,depth:300,enabled:true}],adsr:{attack:0.001,decay:0.1,sustain:0,release:0.2},lfoEnabled:false,lfoRate:0,lfoDepth:0,lfoWaveform:'sine',lfoDelay:0,lfoRamp:0,filterType:'lowpass',cutoffFrequency:1000,resonance:1},
  {name:'Vibrato Violin',carrierWaveform:'sawtooth',modulators:[{waveform:'sine',ratio:1,depth:50,enabled:true}],adsr:{attack:0.2,decay:0.3,sustain:0.8,release:0.5},lfoEnabled:true,lfoRate:6,lfoDepth:15,lfoWaveform:'sine',lfoDelay:0.5,lfoRamp:2,filterType:'lowpass',cutoffFrequency:1000,resonance:1},
  {name:'Tremolo Organ',carrierWaveform:'sine',modulators:[{waveform:'sine',ratio:2,depth:100,enabled:true}],adsr:{attack:0.1,decay:0.2,sustain:0.9,release:0.3},lfoEnabled:true,lfoRate:5,lfoDepth:20,lfoWaveform:'triangle',lfoDelay:0,lfoRamp:1,filterType:'lowpass',cutoffFrequency:1000,resonance:1},
  {name:'Slow Morph',carrierWaveform:'triangle',modulators:[{waveform:'sine',ratio:0.5,depth:50,enabled:true},{waveform:'sawtooth',ratio:1.5,depth:100,enabled:true}],adsr:{attack:1,decay:0.5,sustain:0.8,release:2},lfoEnabled:true,lfoRate:0.1,lfoDepth:30,lfoWaveform:'sine',lfoDelay:3,lfoRamp:10,filterType:'lowpass',cutoffFrequency:1000,resonance:1},
  {name:'Buzzing Bee',carrierWaveform:'square',modulators:[{waveform:'sawtooth',ratio:2,depth:200,enabled:true}],adsr:{attack:0.01,decay:0.1,sustain:0.5,release:0.2},lfoEnabled:true,lfoRate:20,lfoDepth:50,lfoWaveform:'square',lfoDelay:0,lfoRamp:0.5,filterType:'lowpass',cutoffFrequency:1000,resonance:1},
  {name:'Layered Pad',carrierWaveform:'sine',modulators:[{waveform:'sine',ratio:0.5,depth:40,enabled:true},{waveform:'triangle',ratio:2,depth:60,enabled:true}],adsr:{attack:0.8,decay:0.4,sustain:0.9,release:1.2},lfoEnabled:true,lfoRate:0.2,lfoDepth:10,lfoWaveform:'sine',lfoDelay:1,lfoRamp:4,filterType:'lowpass',cutoffFrequency:1000,resonance:1},
  {name:'Trance Lead',carrierWaveform:'sawtooth',modulators:[{waveform:'square',ratio:2,depth:120,enabled:true},{waveform:'sine',ratio:3,depth:80,enabled:true}],adsr:{attack:0.05,decay:0.2,sustain:0.7,release:0.4},lfoEnabled:false,lfoRate:0,lfoDepth:0,lfoWaveform:'sine',lfoDelay:0,lfoRamp:0,filterType:'lowpass',cutoffFrequency:1000,resonance:1},
  {name:'Dubstep Growl',carrierWaveform:'sawtooth',modulators:[{waveform:'square',ratio:1.2,depth:200,enabled:true}],adsr:{attack:0.01,decay:0.1,sustain:0.8,release:0.3},lfoEnabled:true,lfoRate:2,lfoDepth:40,lfoWaveform:'sawtooth',lfoDelay:0,lfoRamp:1,filterType:'lowpass',cutoffFrequency:1000,resonance:1},
  {name:'Bird Call',carrierWaveform:'sine',modulators:[{waveform:'sine',ratio:5,depth:150,enabled:true}],adsr:{attack:0.005,decay:0.1,sustain:0,release:0.2},lfoEnabled:true,lfoRate:10,lfoDepth:20,lfoWaveform:'sine',lfoDelay:0,lfoRamp:0.5,filterType:'lowpass',cutoffFrequency:1000,resonance:1},
  {name:'Water Droplet',carrierWaveform:'triangle',modulators:[{waveform:'sine',ratio:3,depth:100,enabled:true}],adsr:{attack:0.001,decay:0.05,sustain:0,release:0.1},lfoEnabled:false,lfoRate:0,lfoDepth:0,lfoWaveform:'sine',lfoDelay:0,lfoRamp:0,filterType:'lowpass',cutoffFrequency:1000,resonance:1},
  {name:'Laser Blast',carrierWaveform:'sawtooth',modulators:[{waveform:'square',ratio:4,depth:250,enabled:true}],adsr:{attack:0.001,decay:0.2,sustain:0,release:0.3},lfoEnabled:true,lfoRate:15,lfoDepth:30,lfoWaveform:'sawtooth',lfoDelay:0,lfoRamp:0.2,filterType:'lowpass',cutoffFrequency:1000,resonance:1},
  {name:'Retro Game',carrierWaveform:'square',modulators:[],adsr:{attack:0.01,decay:0.1,sustain:0.5,release:0.1},lfoEnabled:false,lfoRate:0,lfoDepth:0,lfoWaveform:'sine',lfoDelay:0,lfoRamp:0,filterType:'lowpass',cutoffFrequency:1000,resonance:1},
  {name:'Bass Foundation',carrierWaveform:'triangle',modulators:[{waveform:'sine',ratio:0.5,depth:60,enabled:true}],adsr:{attack:0.01,decay:0.1,sustain:0.9,release:0.2},lfoEnabled:false,lfoRate:0,lfoDepth:0,lfoWaveform:'sine',lfoDelay:0,lfoRamp:0,filterType:'lowpass',cutoffFrequency:1000,resonance:1},
  {name:'Mid Harmony',carrierWaveform:'sawtooth',modulators:[{waveform:'square',ratio:1,depth:80,enabled:true}],adsr:{attack:0.05,decay:0.2,sustain:0.7,release:0.3},lfoEnabled:false,lfoRate:0,lfoDepth:0,lfoWaveform:'sine',lfoDelay:0,lfoRamp:0,filterType:'lowpass',cutoffFrequency:1000,resonance:1},
  {name:'High Accent',carrierWaveform:'sine',modulators:[{waveform:'sine',ratio:3,depth:100,enabled:true}],adsr:{attack:0.01,decay:0.15,sustain:0,release:0.2},lfoEnabled:false,lfoRate:0,lfoDepth:0,lfoWaveform:'sine',lfoDelay:0,lfoRamp:0,filterType:'lowpass',cutoffFrequency:1000,resonance:1}
];

// Optimized Preset Generation (Updated to include enabled, lfoEnabled, and filter settings)
const generatePresets = () => {
  const carrierWaves = ['sine', 'square', 'sawtooth', 'triangle'];
  const modWaves = ['sine', 'square', 'sawtooth', 'triangle'];
  const lfoWaves = ['sine', 'triangle', 'square', 'sawtooth'];

  for (let i = 0; i < 70; i++) {
    const isExtreme = i % 10 === 0;
    presets.push({
      name: `Generated Preset ${i + 1}`,
      carrierWaveform: carrierWaves[i % 4],
      modulators: [{
        waveform: modWaves[(i + 1) % 4],
        ratio: 0.25 + (i % 16) * 0.25,
        depth: 50 + (i % 6) * 50,
        enabled: true,
      }],
      adsr: {
        attack: 0.01 + (i % 10) * 0.05,
        decay: 0.05 + (i % 8) * 0.05,
        sustain: 0.1 + (i % 9) * 0.1,
        release: 0.1 + (i % 7) * 0.2,
      },
      lfoEnabled: isExtreme,
      lfoRate: isExtreme ? 0.05 : (i % 6) * 2,
      lfoDepth: isExtreme ? 60 : (i % 5) * 10,
      lfoWaveform: lfoWaves[i % 4],
      lfoDelay: isExtreme ? 3 : 0.5,
      lfoRamp: isExtreme ? 8 : 2,
      filterType: 'lowpass',
      cutoffFrequency: 1000,
      resonance: 1
    });
  }
};

generatePresets();



/*
<details>
<summary>presets.js Summary</summary>

### Module Role
Defines and exports a collection of synthesizer presets with predefined and dynamically generated configurations. Provides sound design templates (e.g., bells, basses, leads, pads) with carrier waveforms, modulators, ADSR envelopes, LFO settings, and filter parameters for use in the synthesizer application.

### Dependencies
- None (standalone module).

### Exported Definitions
- `presets`: Array - Collection of preset objects, each defining a synth configuration.

### Local Definitions
- `presets`: Array - Initial static list of 66 preset objects, extended by `generatePresets`.
- `carrierWaves`: Array - ['sine', 'square', 'sawtooth', 'triangle'] - Waveform options for carrier.
- `modWaves`: Array - ['sine', 'square', 'sawtooth', 'triangle'] - Waveform options for modulators.
- `lfoWaves`: Array - ['sine', 'triangle', 'square', 'sawtooth'] - Waveform options for LFO.

### Functions
- `generatePresets()`: Dynamically generates 70 additional presets with varied parameters:
  - Iterates 70 times, creating unique configs using modulo operations.
  - Sets `carrierWaveform`, single modulator (`waveform`, `ratio`, `depth`, `enabled`), ADSR, and LFO settings.
  - Applies extreme LFO settings every 10th preset (`isExtreme`).
  - Adds generated presets to the `presets` array.

### Preset Structure
- **Fields**: 
  - `name`: String - Preset identifier (e.g., "Classic Bell").
  - `carrierWaveform`: String - Carrier oscillator waveform.
  - `modulators`: Array - List of modulator objects (`waveform`, `ratio`, `depth`, `enabled`).
  - `adsr`: Object - Envelope settings (`attack`, `decay`, `sustain`, `release`).
  - `lfoEnabled`: Boolean - LFO on/off state.
  - `lfoRate`: Number - LFO frequency.
  - `lfoDepth`: Number - LFO intensity.
  - `lfoWaveform`: String - LFO waveform.
  - `lfoDelay`: Number - LFO delay time.
  - `lfoRamp`: Number - LFO ramp time.
  - `filterType`: String - Filter type (static: "lowpass").
  - `cutoffFrequency`: Number - Filter cutoff (static: 1000).
  - `resonance`: Number - Filter resonance (static: 1).

### Preset Stats
- **Static Presets**: 66 manually defined presets (e.g., "Classic Bell", "Deep Bass").
- **Generated Presets**: 70 dynamically created presets (e.g., "Generated Preset 1").
- **Total**: 136 presets after `generatePresets()` executes.

### Potential Optimizations
- **Redundant Static Values**: `filterType`, `cutoffFrequency`, and `resonance` are constant across all presets (always "lowpass", 1000, 1); could be moved to a default config.
- **Preset Duplication**: Some static presets (e.g., "Pure Sine", "Pure Square") have no modulators, potentially redundant with generated presets.
- **Generation Logic**: `generatePresets` uses fixed modulo patterns; could be parameterized for flexibility or randomness.
- **Memory Usage**: Large preset array (136 entries) could be lazy-loaded or split into categories.
- **LFO Consistency**: Many presets disable LFO (`lfoEnabled: false`) but still define unused LFO params; could omit these fields when disabled.

</summary>
</details>
*/