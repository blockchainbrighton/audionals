import { midiToFreq } from './seed.js';
import { choose, clamp } from './utils.js';

export function createAudioGraph(Tone) {
  // Master gain with gentle limiter
  const master = new Tone.Gain(0.9).toDestination();
  const analyser = new Tone.Analyser('waveform', 1024);
  master.connect(analyser);
  // Master compressor/limiter like effect for safety
  const comp = new Tone.Compressor({ threshold: -12, ratio: 3, attack: 0.01, release: 0.25 });
  comp.connect(master);
  return { master, analyser, comp };
}

function makeSynth(Tone, kind, color = 0.5) {
  const oscTypes = ['sine', 'triangle', 'sawtooth', 'square'];
  const filterTypes = ['lowpass', 'bandpass', 'highpass'];
  const baseFilterFreq = 400 + 2400 * color;

  const envelope = { attack: 0.005 + 0.02 * color, decay: 0.08 + 0.1 * color, sustain: 0.2 + 0.6 * (1 - color), release: 0.1 + 0.4 * color };
  const filterEnvelope = { attack: 0.005 + 0.02 * (1 - color), decay: 0.08 + 0.1 * (1 - color), sustain: 0.2 + 0.4 * color, release: 0.2 + 0.4 * (1 - color) };

  switch (kind) {
    case 'mono':
      return new Tone.MonoSynth({
        oscillator: { type: choose(() => color, oscTypes) },
        filter: { type: choose(() => color, filterTypes), Q: 1 + 10 * color, rolloff: -12 },
        filterEnvelope: { attack: filterEnvelope.attack, decay: filterEnvelope.decay, sustain: filterEnvelope.sustain, release: filterEnvelope.release, baseFrequency: baseFilterFreq, octaves: 3 },
        envelope,
        volume: -8,
      });
    case 'fm':
      return new Tone.FMSynth({
        modulationIndex: 5 + 20 * color,
        envelope,
        modulation: { type: choose(() => color, oscTypes) },
        modulationEnvelope: envelope,
        volume: -10,
      });
    case 'am':
      return new Tone.AMSynth({
        harmonicity: 1.5 + color,
        envelope,
        modulationEnvelope: envelope,
        volume: -10,
      });
    case 'duo':
      return new Tone.DuoSynth({
        voice0: { oscillator: { type: choose(() => color, oscTypes) }, envelope },
        voice1: { oscillator: { type: choose(() => 1 - color, oscTypes) }, envelope },
        vibratoAmount: 0.02 + 0.02 * color,
        vibratoRate: 4 + 2 * color,
        volume: -10,
      });
    case 'metal':
      return new Tone.MetalSynth({
        frequency: 200 + 600 * color,
        envelope,
        resonance: 200 + 500 * color,
        harmonicity: 2 + 8 * color,
        volume: -18,
      });
    case 'membrane':
      return new Tone.MembraneSynth({
        pitchDecay: 0.01 + 0.1 * color,
        octaves: 6 + 3 * color,
        envelope,
        volume: -12,
      });
    default:
      return new Tone.Synth({ oscillator: { type: choose(() => color, oscTypes) }, envelope, volume: -8 });
  }
}

function createRecipe(rng, index) {
  // Visual recipe for oscilloscope patterns
  const modes = ['lissajous', 'spiral', 'radial', 'poly'];
  const mode = modes[index % modes.length];
  const hue = Math.floor(rng() * 360);
  const thickness = 1 + Math.floor(rng() * 2);
  const complexity = 2 + Math.floor(rng() * 7);
  return { id: `recipe-${index}`, mode, hue, thickness, complexity };
}

export function createSynthEngines(Tone, rng, scaleInfo) {
  const { master, analyser, comp } = createAudioGraph(Tone);
  const kinds = ['mono', 'fm', 'am', 'duo', 'metal', 'membrane'];

  const engines = [];
  for (let i = 0; i < 10; i++) {
    const color = (i + 1) / 11;
    const kind = kinds[i % kinds.length];
    const synth = makeSynth(Tone, kind, color);
    const gain = new Tone.Gain(0.9);
    synth.connect(gain);
    gain.connect(comp); // comp -> master -> analyser -> destination

    // For zero-click switching, ramp gain
    const trigger = ({ time, degree, length = '8n', velocity = 0.85 }) => {
      const freq = midiToFreq(scaleInfo.degreeToMidi(degree));
      if (synth.triggerAttackRelease) {
        synth.triggerAttackRelease(freq, length, time, clamp(velocity, 0.1, 1));
      } else if (synth.triggerAttack) {
        synth.triggerAttack(freq, time, clamp(velocity, 0.1, 1));
        synth.triggerRelease(time + Tone.Time(length).toSeconds());
      }
    };

    const recipe = createRecipe(rng, i);

    engines.push({ index: i, kind, synth, gain, trigger, recipe });
  }

  return { engines, master, analyser };
}