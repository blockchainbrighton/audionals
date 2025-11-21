import { describe, it, expect } from 'vitest';

const MODULES = [
  { label: 'sequencer-main', path: '../modules/sequencer/sequencer-main.js' },
  { label: 'sequencer-ui', path: '../modules/sequencer/sequencer-ui.js' },
  { label: 'sequencer-state', path: '../modules/sequencer/sequencer-state.js' },
  { label: 'sequencer-save-load', path: '../modules/sequencer/sequencer-save-load.js' },
  { label: 'sequencer-audio-time-scheduling', path: '../modules/sequencer/sequencer-audio-time-scheduling.js' },
  { label: 'sequencer-scheduler-host', path: '../modules/sequencer/sequencer-scheduler-host.js' },
  { label: 'sequencer-sampler-playback', path: '../modules/sequencer/sequencer-sampler-playback.js' },
  { label: 'simple-synth-logic', path: '../modules/simple-synth/simple-synth-logic.js' },
  { label: 'simple-synth-component', path: '../modules/simple-synth/simple-synth-component.js' },
  { label: 'simple-synth-engine', path: '../modules/simple-synth/simple-synth-engine.js' },
  { label: 'synth-enhanced-recorder', path: '../modules/synth/synth-enhanced-recorder.js' },
  { label: 'synth-midi', path: '../modules/synth/synth-midi.js' },
  { label: 'synth-keyboard', path: '../modules/synth/synth-keyboard.js' },
  { label: 'synth-piano-roll', path: '../modules/synth/synth-piano-roll.js' }
];

describe('public module imports', () => {
  MODULES.forEach(({ label, path, skip, note }) => {
    const runner = skip ? it.skip : it;

    runner(`imports ${label}`, async () => {
      try {
        const mod = await import(path);
        expect(mod).toBeDefined();
      } catch (error) {
        throw new Error(`Failed to import ${label}: ${error?.message || error}`);
      }
    });

    if (skip && note) {
      // eslint-disable-next-line no-console
      console.warn(`TODO(${label}): ${note}`);
    }
  });
});
