/**
 * Module: BOP-Sequencer-V10-Modular/config.js
 * Purpose: Configuration constants and settings
 * Exports: TOTAL_STEPS, INITIAL_INSTRUMENT_CHANNELS, INITIAL_SEQUENCES, TONE_ORDINALS_URL, MAX_SEQUENCES
 * Depends on: none
 */

export const TONE_ORDINALS_URL = 'https://ordinals.com/content/04813d7748d918bd8a3069cb1823ebc9586f0ce16cd6a97a784581ec38d13062i0';
export const SYNTH_PATH = '../BOP-SYNTH-V12/'; // Relative path to the synth project

export const STEPS_PER_BAR = 16;
export const BARS_PER_SEQUENCE = 4;
export const TOTAL_STEPS = STEPS_PER_BAR * BARS_PER_SEQUENCE;

export const INITIAL_SEQUENCES = 1;
export const INITIAL_SAMPLER_CHANNELS = 8;
export const INITIAL_INSTRUMENT_CHANNELS = 4;  // synth tracks  ← NEW

export const MAX_SEQUENCES = 32;
export const MAX_CHANNELS = 32;

export const ROWS_LAYOUTS = [
  { maxWidth: 9999, rows: 1, stepsPerRow: 64 },
  { maxWidth: 1250, rows: 2, stepsPerRow: 32 },
  { maxWidth: 820,  rows: 4, stepsPerRow: 16 },
  { maxWidth: 540,  rows: 8, stepsPerRow: 8 }
];