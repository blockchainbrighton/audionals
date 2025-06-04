export async function decodeAudioData(arrayBuffer) {
  return new Promise((resolve, reject) => {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    ctx.decodeAudioData(arrayBuffer, resolve, reject);
  });
}
