// visor-js/fade.js
import { ANIMATION_CONFIG } from './config.js';

export const getDurationInSeconds = (v, u) =>
  u === 'ms' ? v / 1e3 : (v * ((60 / (window.fxInitialBPM || 104.15)) * (window.fxInitialBeatsPerBar || 4)));

export function checkAndTriggerFade(key, element, currentTime, animationState) {
  const config = ANIMATION_CONFIG[key]; if (config.mode !== 'fade') return;
  const state = animationState[key], timeInUnit = config.fadeIn.unit === 'ms' ? (performance.now() - animationState.startTime) : currentTime.bar;
  if (!state.fadeInTriggered && timeInUnit >= config.fadeIn.start) {
    const d = getDurationInSeconds(config.fadeIn.duration, config.fadeIn.unit);
    element.style.transition = `opacity ${d.toFixed(2)}s linear`, element.style.opacity = '1', state.fadeInTriggered = !0;
  }
  if (!state.fadeOutTriggered && timeInUnit >= config.fadeOut.start) {
    const d = getDurationInSeconds(config.fadeOut.duration, config.fadeOut.unit);
    element.style.transition = `opacity ${d.toFixed(2)}s linear`, element.style.opacity = '0', state.fadeOutTriggered = !0;
  }
}
