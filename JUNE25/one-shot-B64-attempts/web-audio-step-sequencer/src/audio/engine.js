const ctx = new (window.AudioContext || window.webkitAudioContext)();
const gainPool = [];

function getGain() {
  return gainPool.pop() || ctx.createGain();
}

function releaseGain(node) {
  node.disconnect();
  gainPool.push(node);
}

export function playStep(channel, time, velocity = 1) {
  if (!channel.buffer || channel.mute) return;
  const src = ctx.createBufferSource();
  src.buffer = channel.buffer;
  const gain = getGain();
  gain.gain.value = channel.gain * velocity;
  src.connect(gain).connect(ctx.destination);
  src.start(time);
  src.onended = () => releaseGain(gain);
}

export const audioCtx = ctx;
