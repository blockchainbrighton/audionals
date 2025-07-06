// visor-js/setupState.js
import { ANIMATION_CONFIG } from './config.js';

export function setupAnimationState(isPlaying, animationState, helmet, cvs) {
  animationState.startTime = isPlaying ? performance.now() : 0;
  animationState.helmet = { fadeInTriggered: 0, fadeOutTriggered: 0 };
  animationState.hud = { fadeInTriggered: 0, fadeOutTriggered: 0 };
  for (const [key, el] of Object.entries({ helmet, hud: cvs })) {
    const mode = ANIMATION_CONFIG[key]?.mode;
    if (!el) continue;
    el.style.transition = 'none';
    el.style.opacity = isPlaying ? (mode === 'fade' ? '0' : mode === 'visible' ? '1' : '0') : mode === 'hidden' ? '0' : '1';
  }
}
