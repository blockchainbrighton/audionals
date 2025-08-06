// audional-base64-sample-loader.js (Optimized, with by-index API and caching)


/**
 * audional-base64-sample-loader.js
 * ------------------------------------------------------------------------
 * OG Audional Ordinals Sample Loader & Caching Utility
 *
 * This module provides:
 *   - A curated array (`ogSampleUrls`) of on-chain Ordinals sample inscriptions (music/audio, e.g., OB1 kit)
 *   - Robust utilities for fetching and decoding those samples as Web Audio `AudioBuffer` objects in the browser
 *   - By-index and batch APIs, with built-in caching for efficient interactive and real-time use
 *   - Fully browser-native (no Node dependencies), works with live URLs or on-chain Ordinals endpoints
 *
 * Core features:
 *   • Handles raw Ordinals URLs, with or without trailing hashes/queries (e.g. ...i0#)
 *   • Normalizes input URLs for reliability (production: ordinals.com, on-chain: your own gateway or domainless)
 *   • Supports JSON audioData, direct audio files, and embedded audio in HTML
 *   • Suitable for dApps, sequencers, DAWs, samplers, and interactive music/NFT projects
 *
 * Futureproofing:
 *   • To migrate to fully on-chain or gatewayless mode, adjust `normalizeOrdUrl()` to resolve content from your
 *     chosen storage or Ordinals node, removing/prepending domains as needed (see comments in code).
 *
 * Usage Example:
 *     import { SimpleSampleLoader } from './sampleLoader.js';
 *     const buffer = await SimpleSampleLoader.getSampleByIndex(0); // Loads first OB1 sample as AudioBuffer
 *
 * Author: jim.btc
 *
 * ------------------------------------------------------------------------
 */


/*****************************************************************
 * OG Audional Sample List & Dropdown
 ****************************************************************/

 // New Dropdown for Og Audional sample inscriptions
 export const ogSampleUrls = [
  { value: 'https://ordinals.com/content/e7d344ef3098d0889856978c4d2e81ccf2358f7f8b66feecc71e03036c59ad48i0#', text:'OB1 #1 - 808 Kick', duration: 1.116, bpm: null, isLoop: false },
  { value: 'https://ordinals.com/content/ef5707e6ecf4d5b6edb4c3a371ca1c57b5d1057c6505ccb5f8bdc8918b0c4d94i0', text: 'OB1 #2 - 808 Snare', duration: 0.137, bpm: null, isLoop: false },
  { value: 'https://ordinals.com/content/d030eb3d8bcd68b0ed02b0c67fdb981342eea40b0383814f179a48e76927db93i0', text: 'OB1 #3 - Closed Hat', duration: 0.066, bpm: null, isLoop: false },
  { value: 'https://ordinals.com/content/3b7482a832c4f27c32fc1da7cc4249bbbac1cbdfbdb8673079cad0c33486d233i0', text: 'OB1 #4 - 808 Clap',  duration: 0.241, bpm: null, isLoop: false },
  { value: 'https://ordinals.com/content/5a42d7b2e2fe01e4f31cbad5dd671997f87339d970faaab37f6355c4a2f3be5ai0', text: 'OB1 #5 - Crash', duration: 2.038, bpm: null, isLoop: false },
  { value: 'https://ordinals.com/content/ddc1838c1a6a3c45b2c6e19ff278c3b51b0797c3f1339c533370442d23687a68i0', text: 'OB1 #6 - Synth Bass 1', duration: 0.162, bpm: null, isLoop: false },
  { value: 'https://ordinals.com/content/91f52a4ca00bb27383ae149f24b605d75ea99df033a6cbb6de2389455233bf51i0', text: 'OB1 #7 - Synth Bass 2', duration: 0.174, bpm: null, isLoop: false },
  { value: 'https://ordinals.com/content/1e3c2571e96729153e4b63e2b561d85aec7bc5ba372d293af469a525dfa3ed59i0', text: 'OB1 #8 - Synth Bass 3', duration: 0.333, bpm: null, isLoop: false },
  { value: 'https://ordinals.com/content/437868aecce108d49f9b29c2f477987cb5834ffdf639a650335af7f0fdd5e55bi0', text: 'OB1 #9 - Hard Kick', duration: 0.462, bpm: null, isLoop: false },
  { value: 'https://ordinals.com/content/3be1f8e37b718f5b9874aecad792504c5822dc8dfc727ad4928594f7725db987i0', text: 'OB1 #10 - Hard Snare', duration: 0.308, bpm: null, isLoop: false },
  { value: 'https://ordinals.com/content/1bda678460ef08fb64435b57c9b69fd78fd4556822ccd8e9839b4eb71b3621edi0', text: 'OB1 #11 - Small Click', duration: 0.001, bpm: null, isLoop: false },
  { value: 'https://ordinals.com/content/578aa9d3b29ceceafc659ecee22cb7ef1a063ba5b71474db8fe84949746cdeefi0', text: 'OB1 #13 - Glockenspiel', duration: 3.153, bpm: null, isLoop: false },
  { value: 'https://ordinals.com/content/3e5fe7bc10e37a145a75f7ddd71debd9079b05568c5b9c5e6b4de3d959a4c46bi0', text: 'OB1 #14 - Cowbell', duration: 0.122, bpm: null, isLoop: false },
  { value: 'https://ordinals.com/content/b77fb3b299477ca55ab2626dbbc12c0d5fa9d4cf51ae00850caae6e36baef745i0', text: 'OB1 #16 - Bass Drop', duration: 5.039, bpm: null, isLoop: false },
  { value: 'https://ordinals.com/content/752bd66406185690c6f14311060785170df91a887b42740e1dde27e5fbf351cbi0#', text: 'MS10 Woop.mp3', duration: 0.470, bpm: null, isLoop: false },
  { value: 'https://ordinals.com/content/6c01b1214fc4d4016d683380d066849e6bc645276b102604c098bd35fd77f791i0', text: 'melophonic_Snare_1.mp3', duration: 0.313, bpm: null, isLoop: false },
  { value: 'https://ordinals.com/content/43efcebb84113c6df56bf5b8a455685c043492de9f5635d4108c4211c1f6841fi0', text: 'PumpIt_COLOR.mp3', duration: 0.601, bpm: null, isLoop: false },
  { value: 'https://ordinals.com/content/fef956676f3cbd6019a03d75c1a4a295c25b33653644b8f6ebde387971f9a677i0', text: 'wobble-bass.mp3', duration: 0.470, bpm: null, isLoop: false },
  { value: 'https://ordinals.com/content/c41587924f9d93d01cb71ca925fd664d6e50f1ac8e3c975d5e1e1f1bb0ff11b3i0', text: 'Audional-Jim.mp3', duration: 0.679, bpm: null, isLoop: false },
  { value: 'https://ordinals.com/content/c0d20ad9becc89268dca53971c5ea2affc7c8d865c0ed98e8f1ca876737a6258i0', text:'OB1 #17 - Yeah!', duration: 0.35, bpm: null, isLoop: false },
  { value: 'https://ordinals.com/content/c3c53fec4835ed33257135de88e58a7419231ba42d2b344402e075ad844fffabi0', text:'OB1 #18 - Cricket', duration: 0.15, bpm: null, isLoop: false },
  { value: 'https://ordinals.com/content/69cf77ef4aefca5915d5958dd73942d66e5972e13165e0d57cf837afb953c38fi0', text:'OB1 #19 - Digital Noise', duration: 0.20, bpm: null, isLoop: false },
  { value: 'https://ordinals.com/content/746604d866388226e205739982d693a37a8b1540c168fa74f7862454b691f382i0', text:'OB1 #20 - Rimshot', duration: 0.21, bpm: null, isLoop: false },
  { value: 'https://ordinals.com/content/53394da84c3f108487449f162000d86ee8d1a47b01cbc32e93cd984b31926c67i0', text:'OB1 #21 - Pop', duration: 0.21, bpm: null, isLoop: false },
  { value: 'https://ordinals.com/content/22311e3c97bd8e491cea9dc1677ffe3c7aa100cb1fe94f37ad49f2e84c6da733i0', text:'OB1 #22 - Metal Guitar', duration: 0.78, bpm: null, isLoop: false },
  { value: 'https://ordinals.com/content/6f95768b34ed4c47189e0a23cf5702c9fe75f4848450ef40b65ce37c48b4b650i0', text:'OB1 #23 - Steel Drum', duration: 0.95, bpm: null, isLoop: false },
  { value: 'https://ordinals.com/content/67c17b569a6cc8d81b1d3f4322f66aa5a72956add1d66de21c4934a76da84008i0', text:'OB1 #24 - Brass Hit', duration: 0.55, bpm: null, isLoop: false },
  { value: 'https://ordinals.com/content/bafec5a9087b21f9bf00cfc7c1d1d3c4c244215f8697dcbe7d60eb683a57b7b7i0', text:'OB1 #25 - Open Hat', duration: 0.40, bpm: null, isLoop: false },
  { value: 'https://ordinals.com/content/10cc7642e418e5181724d22113cf5635df2663b8b70a0506c9514b9e132ff748i0', text:'OB1 #26 - Tom Drum', duration: 0.25, bpm: null, isLoop: false },
  { value: 'https://ordinals.com/content/c66f87c8a113993f37fec326659de357a37dbf656ab3e4d267f9404568d59c43i0', text:'OB1 #27 - Tambourine', duration: 0.28, bpm: null, isLoop: false },
  { value: 'https://ordinals.com/content/e4c6e53577c9623bd4988d1969fb1dcbd790da4b004733e7c0d79d5e7fad843ai0', text:'OB1 #1 - Wood Block', duration: 0.05, bpm: null, isLoop: false }
  
];


const getAudioContext = () => new (window.AudioContext || window.webkitAudioContext)();
const bufferCache = new Map();

/**
 * Normalizes a given URL string:
 * - strips any trailing hash/query
 * - prepends ordinals.com if not already present
 */
function normalizeOrdUrl(url) {
  // Strip after first "i0" (anything after)
  const m = url.match(/(\/content\/[a-f0-9]{64}i0)/i);
  if (m) return `https://ordinals.com${m[1]}`;
  // Remove any trailing hash from a full URL
  return url.replace(/([a-f0-9]{64}i0)[#?]?.*$/i, '$1');
}

/**
 * Loads a sample URL and decodes as AudioBuffer.
 */
async function loadSample(src) {
  // Normalize OB1-style URLs and ordinals.com URLs
  const url = normalizeOrdUrl(src);
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
}

export const SimpleSampleLoader = {
  ogSampleUrls,

  loadSample,

  /**
   * Get AudioBuffer for a given sample index.
   * @param {number} index
   * @returns {Promise<AudioBuffer>}
   */
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

  /**
   * Load all samples, returns array of { name, url, success, audioBuffer?, error? }
   */
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