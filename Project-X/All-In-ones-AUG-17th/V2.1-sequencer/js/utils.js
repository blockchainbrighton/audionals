// Utilities and Constants Module
'use strict';

// Helper functions
export const $ = sel => document.querySelector(sel);
export const log = m => { $('#status').textContent = m; };
export const clamp = (v, min, max) => v < min ? min : (v > max ? max : v);
export const midiToHz = n => 440 * Math.pow(2, (n - 69) / 12);

// DOM helper function
export const h = (tag, props = {}, ...kids) => {
  const el = document.createElement(tag);
  if (props.class) el.className = props.class;
  if (props.text) el.textContent = props.text;
  if (props.dataset) for (const [k, v] of Object.entries(props.dataset)) el.dataset[k] = v;
  if (props.attrs) for (const [k, v] of Object.entries(props.attrs)) el.setAttribute(k, v);
  if (props.on) for (const [k, fn] of Object.entries(props.on)) el.addEventListener(k, fn);
  kids.flat().forEach(k => k != null && el.appendChild(k.nodeType ? k : document.createTextNode(k)));
  return el;
};

// Constants
export const STEPS = 64;
export const BARS = 16;
export const LOOKAHEAD = 0.05;
export const STEP_DIV = 4;

export const DEFAULT_SYNTH_PARAMS = {
  type: 'rhodes',
  attack: 0.015,
  decay: 0.15,
  sustain: 0.8,
  release: 0.3,
  gain: 0.6,
  brightness: 12000,
  harmonicMix: 0.2
};

