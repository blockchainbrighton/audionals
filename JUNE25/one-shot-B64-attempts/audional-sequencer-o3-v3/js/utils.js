import { ctx } from './audioEngine.js';
export async function loadSample(src){
  const buf= src instanceof File? await src.arrayBuffer() : await (await fetch(src)).arrayBuffer();
  return await ctx.decodeAudioData(buf);
}
