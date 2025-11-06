import { describe, it, expect } from 'vitest';

const MODULES = [
  { label: 'sequencer-main', path: '../modules/sequencer/sequencer-main.js' },
  { label: 'sequencer-ui', path: '../modules/sequencer/sequencer-ui.js' },
  { label: 'sequencer-state', path: '../modules/sequencer/sequencer-state.js' },
  { label: 'sequencer-save-load', path: '../modules/sequencer/sequencer-save-load.js' },
  { label: 'sequencer-audio-time-scheduling', path: '../modules/sequencer/sequencer-audio-time-scheduling.js' },
  { label: 'sequencer-scheduler-host', path: '../modules/sequencer/sequencer-scheduler-host.js' },
  { label: 'sequencer-sampler-playback', path: '../modules/sequencer/sequencer-sampler-playback.js' },
  { label: 'synth-engine', path: '../modules/synth/synth-engine.js' },
  { label: 'synth-transport', path: '../modules/synth/synth-transport.js' },
  {
    label: 'synth-core',
    path: '../modules/synth/synth-core.js',
    skip: true,
    note: 'requires Vite alias for ./SynthEngine.js (case-sensitive import); add shim before enabling'
  },
  { label: 'synth-preset-manager', path: '../modules/synth/synth-preset-manager.js' },
  { label: 'synth-presets', path: '../modules/synth/synth-presets.js' },
  { label: 'synth-save-load', path: '../modules/synth/synth-save-load.js' },
  { label: 'synth-ui-components', path: '../modules/components/synth-ui-components.js' }
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
