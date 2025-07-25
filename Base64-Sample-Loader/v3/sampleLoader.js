// sampleLoader.js (Optimized, with by-index API and caching)

import { ogSampleUrls } from './samples.js';

const getAudioContext = () => new (window.AudioContext || window.webkitAudioContext)();

// Internal cache for already-decoded samples (by index)
const bufferCache = new Map();

/**
 * Loads a sample URL and decodes as AudioBuffer.
 */
async function loadSample(src) {
  try {
    const isOrd = /^\/content\/[a-f0-9]{64}i0$/i.test(src) || src.startsWith('https://ordinals.com/content/');
    const url = isOrd && !src.startsWith('http') ? `https://ordinals.com${src}` : src;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
    const type = res.headers.get('Content-Type') || '';

    if (type.includes('application/json')) {
      const { audioData } = await res.json();
      if (!audioData) throw new Error("No 'audioData' in JSON");
      let b64 = audioData.includes(',') ? audioData.split(',')[1] : audioData;
      const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0)).buffer;
      return await getAudioContext().decodeAudioData(bin);
    }
    if (type.startsWith('audio/')) {
      return await getAudioContext().decodeAudioData(await res.arrayBuffer());
    }
    const html = await res.text();
    let m = html.match(/<audio[^>]+src=["']([^"']+)["']/i) || html.match(/src=["'](data:audio\/[^"']+)["']/i);
    if (m) return loadSample(m[1].startsWith('http') ? m[1] : new URL(m[1], url).href);

    throw new Error(`Unsupported format: ${type}`);
  } catch (error) {
    throw error;
  }
}

export const SimpleSampleLoader = {
  loadSample,

  // Request a sample by its index; returns a Promise<AudioBuffer>.
  async getSampleByIndex(index) {
    if (!Number.isInteger(index) || index < 0 || index >= ogSampleUrls.length) {
      throw new Error(`Invalid sample index: ${index}`);
    }
    if (bufferCache.has(index)) return bufferCache.get(index);

    const { value: url, text: name } = ogSampleUrls[index];
    const promise = loadSample(url)
      .then(buffer => {
        console.log(`🎵 Decoded: [${index}] ${name}`);
        return buffer;
      })
      .catch(err => {
        bufferCache.delete(index); // Prevent broken promises from sticking in cache
        throw err;
      });
    bufferCache.set(index, promise);
    return promise;
  },

  // Load all samples, as before, for batch loading.
  async loadAllSamples() {
    const results = await Promise.all(ogSampleUrls.map(async ({ text: name, value: url }, idx) => {
      try {
        const audioBuffer = await this.getSampleByIndex(idx);
        console.log(`✅ Loaded: ${name}`);
        return { name, url, success: true, audioBuffer };
      } catch (error) {
        console.warn(`❌ Failed: ${name} (${url}) – ${error.message || error}`);
        return { name, url, success: false, error: error.message || error };
      }
    }));
    const success = results.filter(r => r.success).length;
    const total = results.length;
    const failed = total - success;
    console.log(`\nSample loading complete: ${success}/${total} succeeded, ${failed} failed.`);
    return results;
  }
};
