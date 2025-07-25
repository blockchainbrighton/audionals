// audional-sample-metadata-extractor.js

import { SimpleSampleLoader } from './audional-base64-sample-loader.js';

/**
 * Attempts to extract BPM from filename or sample title.
 */
function inferBPM(name, url) {
  // e.g. "1.254 - Bitcoin Step - Longstreet.btc.mp3" → BPM = 1.254 * 100?
  let m = name.match(/(\d{2,3})\s*BPM/i) || name.match(/(\d+\.\d+)/);
  if (m) {
    let bpm = parseFloat(m[1]);
    if (bpm > 30 && bpm < 300) return Math.round(bpm);
    // Sometimes 1.254 actually means 125.4 BPM, so fudge if plausible
    if (bpm > 0.5 && bpm < 3) return Math.round(bpm * 100);
  }
  return null;
}

/**
 * Very crude key inference from filename/text.
 */
function inferKey(name) {
  let m = name.match(/key[\s:-]*([A-G][#b]?m?)/i) || name.match(/- ([A-G][#b]?m?) /i);
  return m ? m[1].toUpperCase() : null;
}

/**
 * Guess if the sample is a loop.
 */
function isLoop(name, buffer, url) {
  if (/loop/i.test(name + url)) return true;
  // If duration < 10s and ends on zero-crossing, plausible loop (optional)
  return false;
}

/**
 * Extracts audio format from URL or response headers.
 */
function inferFormat(url, response) {
  let m = url.match(/\.(\w{2,4})($|\?)/);
  if (m) return m[1].toUpperCase();
  return null;
}

/**
 * Main metadata extractor.
 */
function extractSampleMetadata({ name, url, audioBuffer, error }) {
  const meta = {
    name,
    url,
    duration: audioBuffer?.duration ?? null,
    sampleRate: audioBuffer?.sampleRate ?? null,
    channels: audioBuffer?.numberOfChannels ?? null,
    isLoop: isLoop(name, audioBuffer, url),
    bpm: inferBPM(name, url),
    key: inferKey(name),
    format: inferFormat(url),
    error: error || null,
    success: !!audioBuffer,
  };
  // Optionally add more analysis here (spectral centroid, etc.)
  return meta;
}

/**
 * Runs full process: loads all samples, extracts/enriches metadata.
 * Outputs to console and downloads as JSON file.
 */
async function buildEnrichedSampleArray() {
  const results = await SimpleSampleLoader.loadAllSamples();
  const enriched = results.map(r =>
    extractSampleMetadata({
      name: r.name,
      url: r.url,
      audioBuffer: r.audioBuffer,
      error: r.error,
    })
  );
  console.table(enriched);
  // Download as JSON:
  const blob = new Blob([JSON.stringify(enriched, null, 2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'audional-sample-metadata.json';
  a.click();
  return enriched;
}

// Usage: run this in your app or dev tools after modules loaded
// buildEnrichedSampleArray();

export { buildEnrichedSampleArray, extractSampleMetadata };
