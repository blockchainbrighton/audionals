/***********************************************************************
 * uiHelpers.js – Pure UI helpers and sample audition
 ***********************************************************************/
export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
export const debounce = (fn, delay) => { let t; return (...a) => (clearTimeout(t), t = setTimeout(() => fn.apply(this, a), delay)); };
export const formatHz = v => {
  v = +v;
  return v >= 10000 && v % 1000 === 0 ? (v/1000).toFixed(0)+'k'
       : v >= 1000 ? (v/1000).toFixed(1)+'k'
       : Math.round(v)+'';
};

export const setSlider = (fx, cls, v, outCls, fmt) => {
  fx.querySelector(`.${cls}`).value = v;
  outCls && (fx.querySelector(`.${outCls}`).textContent = fmt ? fmt(v) : v);
};

export function auditionSample(buf, start, dur) {
  if (!buf || dur <= 0) return;
  const ac = new (window.AudioContext || window.webkitAudioContext)(), src = ac.createBufferSource();
  src.buffer = buf; src.connect(ac.destination);
  src.start(0, start, dur);
  src.onended = () => ac.close().catch(console.warn);
}
