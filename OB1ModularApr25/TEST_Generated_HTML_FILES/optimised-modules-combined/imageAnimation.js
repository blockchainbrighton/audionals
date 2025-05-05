// imageAnimation.js

const IMAGE_ID = 'main-image';
const ANIMATION_CLASS = 'shake-all-directions-animation';
const ANIMATION_DURATION_MS = 150;

const el = document.getElementById(IMAGE_ID);
if (!el) console.warn(`Image animation module: no element with ID "${IMAGE_ID}"`);

export function triggerAnimation() {
  if (!el || el.classList.contains(ANIMATION_CLASS)) return;
  el.classList.add(ANIMATION_CLASS);
  setTimeout(() => {
    if (el.isConnected) el.classList.remove(ANIMATION_CLASS);
  }, ANIMATION_DURATION_MS);
}
