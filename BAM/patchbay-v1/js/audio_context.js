// audio_context.js
export const audioCtx = new (window.AudioContext || window.webkitAudioContext)();