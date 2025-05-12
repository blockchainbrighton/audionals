// js/module_factory/modules/gain.js

import { createSlider, slider } from '../ui/slider.js';

export function createGainModule(audioCtx, el) {
  const audioNode = audioCtx.createGain();
  audioNode.gain.value = 0.5;

  createSlider({
    parent: el,
    labelText: 'Gain:',
    min: 0, max: 1, step: 0.01, value: 0.5,
    onInput: v => (audioNode.gain.value = v)
  });

  return { audioNode };
}
