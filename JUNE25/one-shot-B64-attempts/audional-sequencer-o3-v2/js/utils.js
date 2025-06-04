import { ctx } from './audioEngine.js';

export async function loadSample(source) {
  let arrayBuffer;

  if (source instanceof File) {
    arrayBuffer = await source.arrayBuffer();
  } else {
    const res = await fetch(source);
    arrayBuffer = await res.arrayBuffer();
  }

  return await ctx.decodeAudioData(arrayBuffer);
}
