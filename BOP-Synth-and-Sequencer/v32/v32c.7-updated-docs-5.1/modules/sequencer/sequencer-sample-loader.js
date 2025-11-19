// Audionaut Ordinals sample loader with caching helpers


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
  { value: 'https://ordinals.com/content/228947e9fc52e44d3a22e84aed7bbaeff08d60c5f925aa6be7e265d210425c28i0', text: 'OB1 #12 - DJ Scratch', duration: 3.658, bpm: null, isLoop: false },
  { value: 'https://ordinals.com/content/578aa9d3b29ceceafc659ecee22cb7ef1a063ba5b71474db8fe84949746cdeefi0', text: 'OB1 #13 - Glockenspiel', duration: 3.153, bpm: null, isLoop: false },
  { value: 'https://ordinals.com/content/3e5fe7bc10e37a145a75f7ddd71debd9079b05568c5b9c5e6b4de3d959a4c46bi0', text: 'OB1 #14 - Cowbell', duration: 0.122, bpm: null, isLoop: false },
  { value: 'https://ordinals.com/content/b77fb3b299477ca55ab2626dbbc12c0d5fa9d4cf51ae00850caae6e36baef745i0', text: 'OB1 #16 - Bass Drop', duration: 5.039, bpm: null, isLoop: false },
  { value: 'https://ordinals.com/content/752bd66406185690c6f14311060785170df91a887b42740e1dde27e5fbf351cbi0#', text: 'MS10 Woop.mp3', duration: 0.470, bpm: null, isLoop: false },
  { value: 'https://ordinals.com/content/6d962189218b836cf33e2dc1adbc981e90242aa395f0868178773065f76f144ei0', text: 'audinalSample#1', duration: 0.549, bpm: null, isLoop: false },
  { value: 'https://ordinals.com/content/0b8eff3f39f4095d0f129bb8dd75f29159f8725c7e66046bf41f70ebb9f60d93i0', text: 'melophonicSynthBassSample1', duration: 0.313, bpm: null, isLoop: false },
  { value: 'https://ordinals.com/content/6d8be8186e63b4557e51edd66184a567bc6f5f9f5ba4bb34ba8c67e652c1934ei0', text: 'Step for man.mp3', duration: 2.560, bpm: null, isLoop: false },
  { value: 'https://ordinals.com/content/6c01b1214fc4d4016d683380d066849e6bc645276b102604c098bd35fd77f791i0', text: 'melophonic_Snare_1.mp3', duration: 0.313, bpm: null, isLoop: false },
  { value: 'https://ordinals.com/content/43efcebb84113c6df56bf5b8a455685c043492de9f5635d4108c4211c1f6841fi0', text: 'PumpIt_COLOR.mp3', duration: 0.601, bpm: null, isLoop: false },
  { value: 'https://ordinals.com/content/3364803cb3032ce95f4138a214c15a9b36dcb70f574a477f27615d448e1cdeb8i0', text: 'Drums 8 bit beat - 2.429 - Bitcoin Step - Longstreet.btc.mp3', duration: 2.429, bpm: 105, isLoop: true },
  { value: 'https://ordinals.com/content/fef956676f3cbd6019a03d75c1a4a295c25b33653644b8f6ebde387971f9a677i0', text: 'wobble-bass.mp3', duration: 0.470, bpm: null, isLoop: false },
  { value: 'https://ordinals.com/content/8fa54ad2d9e297c79b225eff67a481ebc8682dacf4fe9dbf5b692a60b237c163i0', text: 'Entertainment - Quiet Loop (2) (1).mp3', duration: 1.019, bpm: 125, isLoop: true },
  { value: 'https://ordinals.com/content/695368ae1092c0633ef959dc795ddb90691648e43f560240d96da0e2753a0a08i0', text: 'Melody O  - 1.254 - Bitcoin Step - Longstreet.btc.mp3', duration: 1.254, bpm: 105, isLoop: true },
  { value: 'https://ordinals.com/content/d4ce1d1e80e90378d8fc49fd7e0e24e7f2310b2f5eb95d0c2318c47b6c9cd645i0', text: 'Melody K - 1.254 - Bitcoin Step - Longstreet.btc.mp3', duration: 1.254, bpm: 105, isLoop: true },
  { value: 'https://ordinals.com/content/e4cb3caff3b4a5192adf0f2ab5cd9da378bacfbafce56c3d4fb678a313607970i0', text: 'Melody I - 1.254 - Bitcoin Step - Longstreet.btc.mp3', duration: 1.254, bpm: 105, isLoop: true },
  { value: 'https://ordinals.com/content/898cba6dc32faab5be09f13092b7500b13eb22f1e7b3d604c8e6e47b0becd139i0', text: 'Melody C-MP3 - 1.254 - Bitcoin Step - Longstreet.btc.mp3', duration: 1.254, bpm: 105, isLoop: true },
  { value: 'https://ordinals.com/content/ed13d5389ae6273839342698b6d5bd3342c51eb472f32b8306e60f8e1e903ce8i0', text: 'Mel Fill 3 - 2.429 - Bitcoin Step - Longstreet.btc.mp3', duration: 2.429, bpm: 105, isLoop: true },
  { value: 'https://ordinals.com/content/c41587924f9d93d01cb71ca925fd664d6e50f1ac8e3c975d5e1e1f1bb0ff11b3i0', text: 'Audional-Jim.mp3', duration: 0.679, bpm: null, isLoop: false },
  { value: 'https://ordinals.com/content/b0fb7f9eb0fe6c368a8d140b1117234431da0cd8725e9f78e6573bb7f0f61dadi0', text: 'Melody N  - 1.254 - Bitcoin Step - Longstreet.btc.mp3', duration: 1.254, bpm: 105, isLoop: true },
  { value: 'https://ordinals.com/content/0e38f29c76b29e471f5f0022a5e98f9ae64b5b1d8f25673f85e02851daf22526i0', text: 'Mel Fill 4 - 2.429 - Bitcoin Step - Longstreet.btc.mp3', duration: 2.429, bpm: 105, isLoop: true },
  { value: 'https://ordinals.com/content/244c785d6df173f8425d654cfc6d2b006c7bb47a605c7de576ed87022e42c7dfi0', text: 'Melody D - 1.254 - Bitcoin Step - Longstreet.btc.mp3', duration: 1.254, bpm: 105, isLoop: true },
  { value: 'https://ordinals.com/content/a72adee5a07200a623c40831ae5979bc7562b542788c3ded35d9e81e39c6014fi0', text: 'Melody B-MP3 - 1.254 - Bitcoin Step - Longstreet.btc.mp3', duration: 1.254, bpm: 105, isLoop: true },
  { value: 'https://ordinals.com/content/6a84401579707b76d9b9a77cc461e767f7ea8f08cc0e46dee0d21e5023cdde33i0', text: 'Melody J - 1.254 - Bitcoin Step - Longstreet.btc.mp3', duration: 1.254, bpm: 105, isLoop: true },
  { value: 'https://ordinals.com/content/c6decce29948ea64df9a24e689340c5907b6da207d74d13973fc5ca4dd3bd80ai0', text: 'Melody G - 1.254 - Bitcoin Step - Longstreet.btc.mp3', duration: 1.254, bpm: 105, isLoop: true },
  { value: 'https://ordinals.com/content/83174080310b0ab71c7a725461f3bd9e486bb62727b73134ee2c67f191d9d586i0', text: 'Mel Fill 5 - 2.429 - Bitcoin Step - Longstreet.btc.mp3', duration: 2.429, bpm: 105, isLoop: true },
  { value: 'https://ordinals.com/content/4f9bed6449d99ef3cbb0fabefac6890c20ef17db2bfe7c07f1386cb43277f220i0', text: 'Melody H - 1.254 - Bitcoin Step - Longstreet.btc.mp3', duration: 1.254, bpm: 105, isLoop: true },
  { value: 'https://ordinals.com/content/e9885c35376ae95dd291bb02075b0763fb3e655d51dc981984130b8366a6d3c8i0', text: 'Mel Fill 2 - 2.429 - Bitcoin Step - Longstreet.btc.mp3', duration: 2.429, bpm: 105, isLoop: true },
  { value: 'https://ordinals.com/content/34e73ef718034a3c0fdeba53899a2af8ee7771f252c419ab63cd13b0a39f6b10i0', text: 'Mel Fill 1 - 2.429 - Bitcoin Step - Longstreet.btc.mp3', duration: 2.429, bpm: 105, isLoop: true },
  { value: 'https://ordinals.com/content/435c5c22eaf0c1791e09cb46d56ce942eb312372376abf5b5420200b1424ff7fi0', text: 'Melody E - 1.254 - Bitcoin Step - Longstreet.btc.mp3', duration: 1.254, bpm: 105, isLoop: true },
  { value: 'https://ordinals.com/content/ccf99852fb85d63b5f65124fe506b08c11eb400a7b1da75cd3e0c9538fc49977i0', text: 'Drums Beat - 1.254 - Bitcoin Step - Longstreet.btc.mp3', duration: 1.254, bpm: 105, isLoop: true },
  { value: 'https://ordinals.com/content/ef8fdd599beee731e06aba4a9ed02d9c7bfe62147b27f6b6deaf22c8c067ab11i0', text: 'Melody A-MP3 - 1.254 - Bitcoin Step - Longstreet.btc.mp3', duration: 1.254, bpm: 105, isLoop: true },
  { value: 'https://ordinals.com/content/187a8c18ebfe07c18aea0e86cd99b3100474c1c53f56f02ee096723f1a35ce70i0', text: 'Drums Crash  - 1.254 - Bitcoin Step - Longstreet.btc.mp3', duration: 1.254, bpm: 105, isLoop: true },
  { value: 'https://ordinals.com/content/2b6b23199eae0760ee26650a0cc02c49b94fc8fd1f519a95417f0f8478246610i0', text: 'Melody M  - 1.254 - Bitcoin Step - Longstreet.btc.mp3', duration: 1.254, bpm: 105, isLoop: true },
  { value: 'https://ordinals.com/content/474f2b0aab9020757826b168ce58725871fd2abb26c6ca805de4b07e314416d1i0', text: 'Outro Fill 1 - 1.254 - Bitcoin Step - Longstreet.btc.mp3', duration: 1.254, bpm: 105, isLoop: true },
  { value: 'https://ordinals.com/content/1aa69c9d3b451ab3b584dba57ba6d6fedc6e9cb3df6830b9da270e84e51ea72di0', text: 'Melody L - 1.254 - Bitcoin Step - Longstreet.btc.mp3', duration: 1.254, bpm: 105, isLoop: true },
  { value: 'https://ordinals.com/content/81f9e6afc38b8c647d4ea258c29f13b81f6c1a2d40afd9c0a385d03126b4d11di0', text: 'Melody F - 1.254 - Bitcoin Step - Longstreet.btc.mp3', duration: 1.254, bpm: 105, isLoop: true },
  { value: 'https://ordinals.com/content/4c40da69e783cfa96d2900bd15622c1ea60ad31e8ce9459cec13d155f39c463fi0', text: 'Intro Fill 1 - 1.254 - Bitcoin Step - Longstreet.btc.mp3', duration: 1.254, bpm: 105, isLoop: true }
];


const getAudioContext = () => new (window.AudioContext || window.webkitAudioContext)();
const bufferCache = new Map();
const dynamicSampleSources = new Map();
const dynamicUrlToIndex = new Map();
const BASE_SAMPLE_COUNT = ogSampleUrls.length;
const baseOrdinalToIndex = new Map();
const dynamicOrdinalToIndex = new Map();

ogSampleUrls.forEach((item, index) => {
  const ordinalId = extractOrdinalId(item?.value);
  if (ordinalId) {
    baseOrdinalToIndex.set(ordinalId, index);
  }
});

function extractOrdinalId(url) {
  if (!url || typeof url !== 'string') return null;
  const match = url.match(/([a-f0-9]{64}i\d+)/i);
  return match ? match[1].toLowerCase() : null;
}

/**
 * Normalizes a given URL string:
 * - strips any trailing hash/query
 * - prepends ordinals.com if not already present
 */
function normalizeOrdUrl(input) {
  if (!input || typeof input !== 'string') {
    throw new Error('Missing Ordinal ID or URL');
  }

  const raw = input.trim();
  if (!raw) throw new Error('Missing Ordinal ID or URL');

  if (raw.startsWith('data:')) {
    return raw;
  }

  const idMatch = raw.match(/([a-f0-9]{64}i\d+)/i);
  if (idMatch) {
    const id = idMatch[1].toLowerCase();
    return `https://ordinals.com/content/${id}`;
  }

  if (!/^https?:/i.test(raw)) {
    throw new Error('Invalid Ordinal ID or URL');
  }

  const url = new URL(raw, 'https://ordinals.com');
  const pathMatch = url.pathname.match(/\/content\/([a-f0-9]{64}i\d+)/i);
  if (pathMatch) {
    return `https://ordinals.com/content/${pathMatch[1].toLowerCase()}`;
  }

  const trailingMatch = raw.match(/([a-f0-9]{64}i\d+)[#?]?.*$/i);
  if (trailingMatch) {
    return `https://ordinals.com/content/${trailingMatch[1].toLowerCase()}`;
  }

  return raw;
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

  if (type.startsWith('audio/') || type.startsWith('video/')) {
    const arrayBuffer = await res.arrayBuffer();
    try {
      return await getAudioContext().decodeAudioData(arrayBuffer.slice(0));
    } catch (err) {
      if (!type.startsWith('video/')) {
        throw err;
      }
      return await extractAudioFromVideo(arrayBuffer, type);
    }
  }

  const html = await res.text();
  let m = html.match(/<audio[^>]+src=["']([^"']+)["']/i) || html.match(/src=["'](data:audio\/[^"']+)["']/i);
  if (m) return loadSample(m[1].startsWith('http') ? m[1] : new URL(m[1], url).href);

  throw new Error(`Unsupported format: ${type}`);
}

async function extractAudioFromVideo(arrayBuffer, mimeType) {
  if (typeof MediaRecorder !== 'function') {
    throw new Error('MediaRecorder API not available; unable to extract audio from video.');
  }
  const blob = new Blob([arrayBuffer], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const video = document.createElement('video');
  try {
    video.src = url;
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;

    await new Promise((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error('Failed to load video metadata'));
    });

    const audioCtx = getAudioContext();
    const destination = audioCtx.createMediaStreamDestination();
    const source = audioCtx.createMediaElementSource(video);
    source.connect(destination);
    source.connect(audioCtx.destination);

    const recorderChunks = [];
    const recorder = new MediaRecorder(destination.stream);
    recorder.ondataavailable = e => { if (e.data?.size) recorderChunks.push(e.data); };

    const recordingPromise = new Promise((resolve, reject) => {
      recorder.onstop = () => resolve();
      recorder.onerror = event => reject(event.error || new Error('MediaRecorder error while capturing audio from video'));
    });

    recorder.start();
    await video.play().catch(err => {
      throw err || new Error('Browser prevented video playback for capture');
    });

    await new Promise(resolve => {
      video.onended = () => resolve();
    });

    recorder.stop();
    await recordingPromise;
    source.disconnect();

    const recordedBlob = new Blob(recorderChunks, { type: recorder.mimeType || 'audio/webm' });
    const recordedBuffer = await recordedBlob.arrayBuffer();
    return await audioCtx.decodeAudioData(recordedBuffer);
  } finally {
    video.pause();
    video.removeAttribute('src');
    video.load();
    video.remove();
    URL.revokeObjectURL(url);
  }
}

function registerDynamicSample({ url, name, bpm, isLoop }) {
  const normalizedUrl = normalizeOrdUrl(url);
  if (dynamicUrlToIndex.has(normalizedUrl)) {
    const index = dynamicUrlToIndex.get(normalizedUrl);
    const descriptor = dynamicSampleSources.get(index);
    if (descriptor) {
      if (name && name !== descriptor.text) descriptor.text = name;
      if (typeof bpm === 'number') descriptor.bpm = bpm;
      if (typeof isLoop === 'boolean') descriptor.isLoop = isLoop;
    }
    const ordinalId = extractOrdinalId(descriptor?.value || normalizedUrl);
    if (ordinalId) {
      dynamicOrdinalToIndex.set(ordinalId, index);
    }
    return { index, descriptor: descriptor ?? null };
  }

  const descriptor = {
    value: normalizedUrl,
    text: name || `Ordinal ${normalizedUrl.slice(-12)}`,
    bpm: typeof bpm === 'number' ? bpm : null,
    isLoop: Boolean(isLoop)
  };

  const index = ogSampleUrls.length + dynamicSampleSources.size;
  dynamicSampleSources.set(index, descriptor);
  dynamicUrlToIndex.set(normalizedUrl, index);
  const ordinalId = extractOrdinalId(normalizedUrl);
  if (ordinalId) {
    dynamicOrdinalToIndex.set(ordinalId, index);
  }
  return { index, descriptor };
}

function getDescriptorForIndex(index) {
  if (index < ogSampleUrls.length) {
    return ogSampleUrls[index];
  }
  return dynamicSampleSources.get(index) ?? null;
}

function resetDynamicSamples() {
  for (const key of Array.from(bufferCache.keys())) {
    if (key >= BASE_SAMPLE_COUNT) {
      bufferCache.delete(key);
    }
  }
  dynamicSampleSources.clear();
  dynamicUrlToIndex.clear();
  dynamicOrdinalToIndex.clear();
}

function getDynamicSamplesSnapshot() {
  return Array.from(dynamicSampleSources.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([index, descriptor]) => ({
      index,
      url: descriptor?.value ?? null,
      name: descriptor?.text ?? null,
      bpm: typeof descriptor?.bpm === 'number' ? descriptor.bpm : null,
      isLoop: Boolean(descriptor?.isLoop),
      ordinalId: extractOrdinalId(descriptor?.value),
      sourceType: 'dynamic'
    }));
}

function restoreDynamicSamples(snapshot = []) {
  resetDynamicSamples();
  const list = Array.isArray(snapshot) ? [...snapshot] : [];
  list.sort((a, b) => {
    const ai = typeof a?.index === 'number' ? a.index : BASE_SAMPLE_COUNT;
    const bi = typeof b?.index === 'number' ? b.index : BASE_SAMPLE_COUNT;
    return ai - bi;
  });

  const restored = [];
  for (const entry of list) {
    if (!entry) continue;
    const source = entry.url || entry.ordinalId;
    if (!source) continue;
    try {
      const { index, descriptor } = registerDynamicSample({
        url: source,
        name: entry.name,
        bpm: entry.bpm,
        isLoop: entry.isLoop
      });
      if (typeof entry.index === 'number' && index !== entry.index) {
        console.warn('[SAMPLE-LOADER] Restored sample index mismatch', { saved: entry.index, assigned: index, ordinal: entry.ordinalId || entry.url });
      }
      restored.push({ index, descriptor });
    } catch (err) {
      console.warn('[SAMPLE-LOADER] Failed to restore dynamic sample', entry, err);
    }
  }
  return restored;
}

function getOrdinalIdByIndex(index) {
  const descriptor = getDescriptorForIndex(index);
  return descriptor ? extractOrdinalId(descriptor.value) : null;
}

function getIndexForOrdinal(ordinalId) {
  if (!ordinalId || typeof ordinalId !== 'string') return -1;
  const normalized = ordinalId.toLowerCase();
  if (baseOrdinalToIndex.has(normalized)) {
    return baseOrdinalToIndex.get(normalized);
  }
  if (dynamicOrdinalToIndex.has(normalized)) {
    return dynamicOrdinalToIndex.get(normalized);
  }
  return -1;
}

function getSampleDescriptorSnapshot(index) {
  const descriptor = getDescriptorForIndex(index);
  if (!descriptor) return null;
  const ordinalId = getOrdinalIdByIndex(index);
  return {
    index,
    url: descriptor.value ?? null,
    name: descriptor.text ?? null,
    bpm: typeof descriptor.bpm === 'number' ? descriptor.bpm : null,
    isLoop: Boolean(descriptor.isLoop),
    ordinalId,
    sourceType: index < BASE_SAMPLE_COUNT ? 'builtin' : 'dynamic'
  };
}

export const SimpleSampleLoader = {
  ogSampleUrls,

  loadSample,

  releaseSampleBuffer(index) {
    if (!Number.isInteger(index) || index < 0) return;
    bufferCache.delete(index);
  },

  resetDynamicSamples,

  getDynamicSamplesSnapshot,

  restoreDynamicSamples,

  getSampleDescriptorSnapshot,

  /**
   * Get AudioBuffer for a given sample index.
   * @param {number} index
   * @returns {Promise<AudioBuffer>}
   */
  async getSampleByIndex(index) {
    if (!Number.isInteger(index) || index < 0) {
      throw new Error(`Invalid sample index: ${index}`);
    }
    const descriptor = getDescriptorForIndex(index);
    if (!descriptor) throw new Error(`Unknown sample descriptor for index ${index}`);
    if (bufferCache.has(index)) return bufferCache.get(index);

    const { value: url, text: name } = descriptor;
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
    const totalSamples = ogSampleUrls.length + dynamicSampleSources.size;
    const results = await Promise.all(Array.from({ length: totalSamples }, async (_, idx) => {
      const descriptor = getDescriptorForIndex(idx);
      if (!descriptor) {
        return { name: `Unknown #${idx}`, url: null, success: false, error: 'Missing descriptor' };
      }
      const { text: name, value: url } = descriptor;
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
  },

  registerDynamicSample,

  getDescriptorForIndex,

  getOrdinalIdByIndex,

  getIndexForOrdinal,

  /**
   * Load an ordinal sample by ID/URL and ensure it is registered.
   * @param {string} ordinalInput
   * @param {{ name?: string, bpm?: number, isLoop?: boolean }} [options]
   * @returns {Promise<{ index: number, buffer: AudioBuffer, descriptor: { value: string, text: string, bpm: number|null, isLoop: boolean } }>}
   */
  async loadOrdinalSample(ordinalInput, options = {}) {
    const { index, descriptor } = registerDynamicSample({
      url: ordinalInput,
      name: options.name,
      bpm: options.bpm,
      isLoop: options.isLoop
    });
    const buffer = await this.getSampleByIndex(index);
    const updatedDescriptor = getDescriptorForIndex(index) || descriptor;
    return { index, buffer, descriptor: updatedDescriptor };
  }
};
